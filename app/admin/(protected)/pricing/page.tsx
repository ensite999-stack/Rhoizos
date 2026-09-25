import {getAdminI18n} from "@/lib/i18n-server";
import PricingClient from "./PricingClient";

export default async function AdminPricing(){
  const {t}=await getAdminI18n();
  return <>
    <div className="adminHeader"><div><h1>{t("pricing")}</h1><p>{t("pricing.copy")}</p></div></div>
    <PricingClient/>
  </>;
}
