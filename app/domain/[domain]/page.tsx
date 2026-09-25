import DomainDetail from "./DomainDetail";

export default async function DomainPage({params}:{params:Promise<{domain:string}>}){
  const {domain}=await params;
  return <DomainDetail initialDomain={decodeURIComponent(domain)}/>;
}
