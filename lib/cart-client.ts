export type CartItem={domain:string;price:number;kind:"register"};

const KEY="rhoizos_cart_v1";
const EVENT="rhoizos-cart-change";

function validItem(value:unknown):value is CartItem{
  if(!value||typeof value!=="object")return false;
  const item=value as Partial<CartItem>;
  return typeof item.domain==="string"&&item.domain.includes(".")&&
    typeof item.price==="number"&&Number.isFinite(item.price)&&item.price>=0&&
    item.kind==="register";
}

export function readCart():CartItem[]{
  if(typeof window==="undefined")return [];
  try{
    const parsed=JSON.parse(localStorage.getItem(KEY)||"[]");
    return Array.isArray(parsed)?parsed.filter(validItem):[];
  }catch{return [];}
}

function writeCart(items:CartItem[]){
  localStorage.setItem(KEY,JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

export function addCart(item:CartItem){
  const items=readCart();
  const next=[...items.filter(current=>current.domain!==item.domain),item];
  writeCart(next);
}

export function removeCart(domain:string){
  writeCart(readCart().filter(item=>item.domain!==domain));
}

export function onCartChange(callback:()=>void){
  const storage=(event:StorageEvent)=>{if(event.key===KEY)callback();};
  window.addEventListener(EVENT,callback);
  window.addEventListener("storage",storage);
  return ()=>{
    window.removeEventListener(EVENT,callback);
    window.removeEventListener("storage",storage);
  };
}
