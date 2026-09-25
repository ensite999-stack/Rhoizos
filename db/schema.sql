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
  registrar text not null default 'spaceship',
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
