create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  first_name text not null,
  last_name text not null,
  company text,
  account_type text not null default 'individual',
  country char(2) not null,
  state text not null,
  city text not null,
  address1 text not null,
  postcode text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  authenticated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions(user_id);
create index if not exists sessions_expiry_idx on sessions(expires_at);

create table if not exists orders (
  id uuid primary key,
  user_id uuid not null references users(id) on delete restrict,
  kind text not null check (kind in ('register','transfer','renew')),
  domain text not null,
  amount_usd numeric(12,2) not null check (amount_usd > 0),
  status text not null default 'awaiting_payment',
  payment_status text not null default 'new',
  provider_invoice_id text,
  checkout_url text,
  payment_id text,
  request jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on orders(user_id, created_at desc);
create index if not exists orders_payment_idx on orders(payment_status, updated_at);

create table if not exists operations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders(id) on delete restrict,
  kind text not null check (kind in ('register','transfer','renew')),
  status text not null,
  provider_operation_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists operations_status_idx on operations(status, updated_at);

create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete restrict,
  name text not null unique,
  registrar text not null default 'namesilo',
  lifecycle_status text not null default 'registered',
  expires_at timestamptz,
  transfer_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists domains_user_idx on domains(user_id, name);

create table if not exists dns_notes (
  user_id uuid not null references users(id) on delete cascade,
  domain_id uuid not null references domains(id) on delete cascade,
  fingerprint char(64) not null,
  note varchar(80) not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, domain_id, fingerprint)
);

create table if not exists payment_events (
  payment_id text primary key,
  order_id uuid references orders(id) on delete restrict,
  provider_status text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table if not exists tld_prices (
  tld text primary key,
  register_price numeric(12,2) not null check (register_price > 0),
  renew_price numeric(12,2) not null check (renew_price > 0),
  transfer_price numeric(12,2) not null check (transfer_price > 0),
  featured boolean not null default false,
  sort_order integer not null default 100,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into tld_prices (tld,register_price,renew_price,transfer_price,featured,sort_order)
values
  ('com',19.99,19.99,18.99,true,10),
  ('net',21.99,21.99,20.99,true,20),
  ('org',17.99,17.99,16.99,true,30),
  ('io',59.99,59.99,58.99,true,40)
on conflict (tld) do nothing;

alter table tld_prices enable row level security;


create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  display_name text not null default 'Administrator',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references admin_users(id) on delete cascade,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists admin_sessions_admin_idx on admin_sessions(admin_user_id);
create index if not exists admin_sessions_expiry_idx on admin_sessions(expires_at);

create table if not exists admin_audit_log (
  id bigserial primary key,
  admin_user_id uuid references admin_users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on admin_audit_log(created_at desc);

create table if not exists pricing_settings (
  singleton boolean primary key default true check (singleton = true),
  default_register_markup_pct numeric(8,3) not null default 0,
  default_renew_markup_pct numeric(8,3) not null default 0,
  default_transfer_markup_pct numeric(8,3) not null default 0,
  minimum_margin numeric(12,2) not null default 0,
  currency char(3) not null default 'USD',
  updated_at timestamptz not null default now()
);
insert into pricing_settings(singleton) values(true) on conflict(singleton) do nothing;

alter table tld_prices add column if not exists cost_register numeric(12,2);
alter table tld_prices add column if not exists cost_renew numeric(12,2);
alter table tld_prices add column if not exists cost_transfer numeric(12,2);
alter table tld_prices add column if not exists markup_register_pct numeric(8,3);
alter table tld_prices add column if not exists markup_renew_pct numeric(8,3);
alter table tld_prices add column if not exists markup_transfer_pct numeric(8,3);
alter table tld_prices add column if not exists override_register numeric(12,2);
alter table tld_prices add column if not exists override_renew numeric(12,2);
alter table tld_prices add column if not exists override_transfer numeric(12,2);

update tld_prices set
  cost_register=coalesce(cost_register,register_price),
  cost_renew=coalesce(cost_renew,renew_price),
  cost_transfer=coalesce(cost_transfer,transfer_price);

alter table admin_users enable row level security;
alter table admin_sessions enable row level security;
alter table admin_audit_log enable row level security;
alter table pricing_settings enable row level security;


create table if not exists dropcatch_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  domain text not null,
  years integer not null default 1 check (years between 1 and 10),
  private boolean not null default true,
  auto_renew boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending','processing','caught','awaiting_payment','completed','failed','cancelled')),
  last_error text,
  provider_order_amount numeric(12,2),
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  caught_at timestamptz,
  order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,domain)
);
create index if not exists dropcatch_status_idx on dropcatch_requests(status,updated_at);
create index if not exists dropcatch_user_idx on dropcatch_requests(user_id,created_at desc);

alter table orders drop constraint if exists orders_kind_check;
alter table orders add constraint orders_kind_check
  check (kind in ('register','transfer','renew','dropcatch'));


create table if not exists marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references domains(id) on delete cascade,
  seller_user_id uuid not null references users(id) on delete cascade,
  asking_price numeric(12,2) check (asking_price is null or asking_price > 0),
  allow_offers boolean not null default true,
  description text not null default '',
  status text not null default 'active'
    check (status in ('active','reserved','sold','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketplace_listings_status_idx on marketplace_listings(status,updated_at desc);
create index if not exists marketplace_listings_seller_idx on marketplace_listings(seller_user_id,updated_at desc);
create unique index if not exists marketplace_listings_active_domain_idx
  on marketplace_listings(domain_id)
  where status in ('active','reserved');

create table if not exists marketplace_deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references marketplace_listings(id) on delete cascade,
  buyer_user_id uuid not null references users(id) on delete cascade,
  offer_amount numeric(12,2) check (offer_amount is null or offer_amount > 0),
  message text not null default '',
  status text not null default 'pending'
    check (status in ('pending','accepted','rejected','cancelled','released')),
  accepted_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(listing_id,buyer_user_id)
);
create index if not exists marketplace_deals_buyer_idx on marketplace_deals(buyer_user_id,updated_at desc);
create index if not exists marketplace_deals_listing_idx on marketplace_deals(listing_id,updated_at desc);
create unique index if not exists marketplace_deals_one_accepted_idx
  on marketplace_deals(listing_id)
  where status in ('accepted','released');

create table if not exists marketplace_events (
  id bigserial primary key,
  deal_id uuid not null references marketplace_deals(id) on delete cascade,
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists marketplace_events_deal_idx on marketplace_events(deal_id,created_at desc);

alter table marketplace_listings enable row level security;
alter table marketplace_deals enable row level security;
alter table marketplace_events enable row level security;
