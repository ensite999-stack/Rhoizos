import {db} from "./db";

export type MarketplaceListing={
  id:string;
  domainId:string;
  domain:string;
  askingPrice:number|null;
  allowOffers:boolean;
  description:string;
  status:"active"|"reserved"|"sold"|"cancelled";
  createdAt:string;
  updatedAt:string;
};

export type MarketplaceDeal={
  id:string;
  listingId:string;
  domain:string;
  role:"seller"|"buyer";
  status:"pending"|"accepted"|"rejected"|"cancelled"|"released";
  askingPrice:number|null;
  offerAmount:number|null;
  message:string;
  counterpartyEmail:string|null;
  acceptedAt:string|null;
  releasedAt:string|null;
  createdAt:string;
  updatedAt:string;
};

function money(value:unknown){
  return value===null||value===undefined?null:Number(value);
}

function listing(row:Record<string,unknown>):MarketplaceListing{
  return {
    id:String(row.id),
    domainId:String(row.domain_id),
    domain:String(row.domain),
    askingPrice:money(row.asking_price),
    allowOffers:Boolean(row.allow_offers),
    description:String(row.description||""),
    status:String(row.status) as MarketplaceListing["status"],
    createdAt:new Date(String(row.created_at)).toISOString(),
    updatedAt:new Date(String(row.updated_at)).toISOString()
  };
}

export async function listMarketplaceListings(){
  const rows=await db().unsafe(`
    select l.id,l.domain_id,d.name as domain,l.asking_price,l.allow_offers,l.description,l.status,l.created_at,l.updated_at
    from marketplace_listings l
    join domains d on d.id=l.domain_id
    where l.status='active' and d.lifecycle_status='registered' and d.user_id=l.seller_user_id
    order by l.updated_at desc
  `);
  return rows.map(row=>listing(row as Record<string,unknown>));
}

export async function getMarketplaceListing(id:string){
  const rows=await db().unsafe(`
    select l.id,l.domain_id,d.name as domain,l.asking_price,l.allow_offers,l.description,l.status,l.created_at,l.updated_at
    from marketplace_listings l
    join domains d on d.id=l.domain_id
    where l.id=$1 and l.status in ('active','reserved') and d.lifecycle_status='registered'
    limit 1
  `,[id]);
  return rows[0]?listing(rows[0] as Record<string,unknown>):null;
}

export async function getSellerListing(userId:string,domainId:string){
  const rows=await db().unsafe(`
    select l.id,l.domain_id,d.name as domain,l.asking_price,l.allow_offers,l.description,l.status,l.created_at,l.updated_at
    from marketplace_listings l
    join domains d on d.id=l.domain_id
    where l.domain_id=$1 and l.seller_user_id=$2 and l.status in ('active','reserved')
    order by l.created_at desc
    limit 1
  `,[domainId,userId]);
  return rows[0]?listing(rows[0] as Record<string,unknown>):null;
}

export async function saveMarketplaceListing(input:{
  userId:string;
  domainId:string;
  askingPrice:number|null;
  allowOffers:boolean;
  description:string;
}){
  if(input.askingPrice!==null&&(!Number.isFinite(input.askingPrice)||input.askingPrice<=0)) throw new Error("Asking price must be greater than zero.");
  if(!input.allowOffers&&input.askingPrice===null) throw new Error("Set an asking price or allow offers.");
  if(input.description.length>2000) throw new Error("Description is too long.");

  const sql=db();
  return sql.begin(async tx=>{
    const owned=await tx.unsafe("select id,name from domains where id=$1 and user_id=$2 and lifecycle_status=\'registered\' limit 1 for update",[input.domainId,input.userId]);
    if(!owned[0]) throw new Error("Domain not found.");
    const existing=await tx.unsafe("select id,status from marketplace_listings where domain_id=$1 and status in (\'active\',\'reserved\') order by created_at desc limit 1 for update",[input.domainId]);
    if(existing[0]){
      if(String(existing[0].status)==="reserved") throw new Error("This Domain has an accepted deal and cannot be edited.");
      const rows=await tx.unsafe(`
        update marketplace_listings
        set asking_price=$1,allow_offers=$2,description=$3,updated_at=now()
        where id=$4
        returning id,domain_id,$5::text as domain,asking_price,allow_offers,description,status,created_at,updated_at
      `,[input.askingPrice,input.allowOffers,input.description,String(existing[0].id),String(owned[0].name)]);
      return listing(rows[0] as Record<string,unknown>);
    }
    const rows=await tx.unsafe(`
      insert into marketplace_listings (domain_id,seller_user_id,asking_price,allow_offers,description,status)
      values ($1,$2,$3,$4,$5,'active')
      returning id,domain_id,$6::text as domain,asking_price,allow_offers,description,status,created_at,updated_at
    `,[input.domainId,input.userId,input.askingPrice,input.allowOffers,input.description,String(owned[0].name)]);
    return listing(rows[0] as Record<string,unknown>);
  });
}

export async function cancelMarketplaceListing(userId:string,domainId:string){
  const sql=db();
  await sql.begin(async tx=>{
    const rows=await tx.unsafe("select id,status from marketplace_listings where domain_id=$1 and seller_user_id=$2 and status in (\'active\',\'reserved\') order by created_at desc limit 1 for update",[domainId,userId]);
    if(!rows[0]) return;
    if(String(rows[0].status)==="reserved") throw new Error("Cancel the accepted deal before cancelling this listing.");
    const listingId=String(rows[0].id);
    await tx.unsafe("update marketplace_listings set status=\'cancelled\',updated_at=now() where id=$1",[listingId]);
    await tx.unsafe("update marketplace_deals set status=\'cancelled\',updated_at=now() where listing_id=$1 and status=\'pending\'",[listingId]);
  });
}

export async function createMarketplaceOffer(input:{
  listingId:string;
  buyerUserId:string;
  offerAmount:number|null;
  message:string;
}){
  if(input.message.length>1000) throw new Error("Message is too long.");
  const sql=db();
  return sql.begin(async tx=>{
    const rows=await tx.unsafe(`
      select l.id,l.seller_user_id,l.asking_price,l.allow_offers,l.status,d.name as domain
      from marketplace_listings l join domains d on d.id=l.domain_id
      where l.id=$1 limit 1 for update of l
    `,[input.listingId]);
    const row=rows[0];
    if(!row||String(row.status)!=="active") throw new Error("This listing is no longer available.");
    if(String(row.seller_user_id)===input.buyerUserId) throw new Error("You cannot make an offer on your own Domain.");
    const asking=money(row.asking_price);
    let amount=input.offerAmount;
    if(!Boolean(row.allow_offers)){
      if(asking===null) throw new Error("This listing is not accepting offers.");
      amount=asking;
    }else if(amount===null){
      if(asking===null) throw new Error("Enter an offer amount.");
      amount=asking;
    }
    if(amount===null||!Number.isFinite(amount)||amount<=0) throw new Error("Offer amount must be greater than zero.");
    const existing=await tx.unsafe("select id,status from marketplace_deals where listing_id=$1 and buyer_user_id=$2 limit 1 for update",[input.listingId,input.buyerUserId]);
    let dealId:string;
    if(existing[0]){
      if(["accepted","released"].includes(String(existing[0].status))) throw new Error("This deal can no longer be changed.");
      dealId=String(existing[0].id);
      await tx.unsafe("update marketplace_deals set offer_amount=$1,message=$2,status=\'pending\',accepted_at=null,released_at=null,updated_at=now() where id=$3",[amount,input.message,dealId]);
    }else{
      const inserted=await tx.unsafe("insert into marketplace_deals (listing_id,buyer_user_id,offer_amount,message,status) values ($1,$2,$3,$4,\'pending\') returning id",[input.listingId,input.buyerUserId,amount,input.message]);
      dealId=String(inserted[0].id);
    }
    await tx.unsafe("insert into marketplace_events (deal_id,actor_user_id,action) values ($1,$2,\'offer_submitted\')",[dealId,input.buyerUserId]);
    return {id:dealId,domain:String(row.domain),offerAmount:amount};
  });
}

export async function listMarketplaceDeals(userId:string){
  const rows=await db().unsafe(`
    select md.id,md.listing_id,md.buyer_user_id,md.offer_amount,md.message,md.status,
      md.accepted_at,md.released_at,md.created_at,md.updated_at,
      ml.seller_user_id,ml.asking_price,d.name as domain,
      seller.email as seller_email,buyer.email as buyer_email
    from marketplace_deals md
    join marketplace_listings ml on ml.id=md.listing_id
    join domains d on d.id=ml.domain_id
    join users seller on seller.id=ml.seller_user_id
    join users buyer on buyer.id=md.buyer_user_id
    where ml.seller_user_id=$1 or md.buyer_user_id=$1
    order by md.updated_at desc
  `,[userId]);
  return rows.map(raw=>{
    const row=raw as Record<string,unknown>;
    const seller=String(row.seller_user_id)===userId;
    const status=String(row.status) as MarketplaceDeal["status"];
    const contactVisible=status==="accepted"||status==="released";
    return {
      id:String(row.id),listingId:String(row.listing_id),domain:String(row.domain),
      role:seller?"seller":"buyer",status,askingPrice:money(row.asking_price),offerAmount:money(row.offer_amount),
      message:String(row.message||""),
      counterpartyEmail:contactVisible?String(seller?row.buyer_email:row.seller_email):null,
      acceptedAt:row.accepted_at?new Date(String(row.accepted_at)).toISOString():null,
      releasedAt:row.released_at?new Date(String(row.released_at)).toISOString():null,
      createdAt:new Date(String(row.created_at)).toISOString(),updatedAt:new Date(String(row.updated_at)).toISOString()
    } satisfies MarketplaceDeal;
  });
}

export async function marketplaceDealAction(input:{
  userId:string;
  dealId:string;
  action:"accept"|"reject"|"cancel"|"release";
  confirmRelease?:boolean;
}){
  const sql=db();
  return sql.begin(async tx=>{
    const rows=await tx.unsafe(`
      select md.id,md.status,md.buyer_user_id,md.listing_id,
        ml.seller_user_id,ml.domain_id,ml.status as listing_status,d.name as domain,d.user_id as domain_user_id
      from marketplace_deals md
      join marketplace_listings ml on ml.id=md.listing_id
      join domains d on d.id=ml.domain_id
      where md.id=$1 limit 1 for update of md,ml,d
    `,[input.dealId]);
    const row=rows[0];
    if(!row) throw new Error("Deal not found.");
    const sellerId=String(row.seller_user_id),buyerId=String(row.buyer_user_id);
    const dealStatus=String(row.status),listingId=String(row.listing_id),domainId=String(row.domain_id);
    if(input.action==="accept"){
      if(input.userId!==sellerId) throw new Error("Only the seller can accept this deal.");
      if(dealStatus!=="pending"||String(row.listing_status)!=="active") throw new Error("This deal is no longer available to accept.");
      await tx.unsafe("update marketplace_deals set status=\'accepted\',accepted_at=now(),updated_at=now() where id=$1",[input.dealId]);
      await tx.unsafe("update marketplace_deals set status=\'rejected\',updated_at=now() where listing_id=$1 and id<>$2 and status=\'pending\'",[listingId,input.dealId]);
      await tx.unsafe("update marketplace_listings set status=\'reserved\',updated_at=now() where id=$1",[listingId]);
      await tx.unsafe("insert into marketplace_events (deal_id,actor_user_id,action) values ($1,$2,\'deal_accepted\')",[input.dealId,input.userId]);
    }else if(input.action==="reject"){
      if(input.userId!==sellerId) throw new Error("Only the seller can reject this deal.");
      if(dealStatus!=="pending") throw new Error("Only pending deals can be rejected.");
      await tx.unsafe("update marketplace_deals set status=\'rejected\',updated_at=now() where id=$1",[input.dealId]);
      await tx.unsafe("insert into marketplace_events (deal_id,actor_user_id,action) values ($1,$2,\'deal_rejected\')",[input.dealId,input.userId]);
    }else if(input.action==="cancel"){
      if(input.userId!==sellerId&&input.userId!==buyerId) throw new Error("You are not part of this deal.");
      if(dealStatus!=="pending"&&dealStatus!=="accepted") throw new Error("This deal can no longer be cancelled.");
      await tx.unsafe("update marketplace_deals set status=\'cancelled\',updated_at=now() where id=$1",[input.dealId]);
      if(dealStatus==="accepted") await tx.unsafe("update marketplace_listings set status=\'active\',updated_at=now() where id=$1 and status=\'reserved\'",[listingId]);
      await tx.unsafe("insert into marketplace_events (deal_id,actor_user_id,action) values ($1,$2,\'deal_cancelled\')",[input.dealId,input.userId]);
    }else{
      if(input.userId!==sellerId) throw new Error("Only the seller can release the Domain.");
      if(!input.confirmRelease) throw new Error("Confirm that you received payment before releasing the Domain.");
      if(dealStatus!=="accepted"||String(row.listing_status)!=="reserved") throw new Error("This deal is not ready for release.");
      if(String(row.domain_user_id)!==sellerId) throw new Error("The seller no longer controls this Domain.");
      const moved=await tx.unsafe("update domains set user_id=$1,updated_at=now() where id=$2 and user_id=$3 returning id",[buyerId,domainId,sellerId]);
      if(!moved[0]) throw new Error("The Domain could not be released.");
      await tx.unsafe("update marketplace_listings set status=\'sold\',updated_at=now() where id=$1",[listingId]);
      await tx.unsafe("update marketplace_deals set status=\'released\',released_at=now(),updated_at=now() where id=$1",[input.dealId]);
      await tx.unsafe("insert into marketplace_events (deal_id,actor_user_id,action) values ($1,$2,\'domain_released\')",[input.dealId,input.userId]);
    }
    return {ok:true,domain:String(row.domain)};
  });
}
