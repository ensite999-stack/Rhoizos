import {cookies} from "next/headers";
import {normalizeLocale} from "./i18n";
import {adminTranslate} from "./admin-i18n";

export async function getAdminI18n(){
  const store=await cookies();
  const locale=normalizeLocale(store.get("rhoizos_locale")?.value);
  return {locale,t:(key:string)=>adminTranslate(locale,key)};
}
