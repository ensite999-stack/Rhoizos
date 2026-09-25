import PricingClient from "./PricingClient";
export default function AdminPricing(){
  return <>
    <div className="adminHeader"><div><h1>Pricing</h1><p>Provider cost, global markup, per-TLD markup and fixed retail overrides.</p></div></div>
    <PricingClient/>
  </>;
}
