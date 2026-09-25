"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useI18n} from "@/components/I18nProvider";
import RdapDetails,{type RdapInfo} from "@/components/RdapDetails";
import {addCart,onCartChange,readCart} from "@/lib/cart-client";

type SearchResult={
  domain:string;
  available:boolean|null;
  premium:boolean;
  price:number|null;
  preview?:boolean;
};

function SearchIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

export default function DomainDetail({initialDomain}:{initialDomain:string}){
  const {t}=useI18n();
  const router=useRouter();
  const [query,setQuery]=useState(initialDomain);
  const [result,setResult]=useState<SearchResult|null>(null);
  const [suggestions,setSuggestions]=useState<SearchResult[]>([]);
  const [searchLabel,setSearchLabel]=useState("");
  const [tlds,setTlds]=useState<string[]>([]);
  const [selectedTld,setSelectedTld]=useState("");
  const [resultsTotal,setResultsTotal]=useState(0);
  const [resultsPage,setResultsPage]=useState(0);
  const [hasMore,setHasMore]=useState(false);
  const [rdap,setRdap]=useState<RdapInfo|null>(null);
  const [rdapState,setRdapState]=useState<"idle"|"loading"|"loaded"|"unavailable">("idle");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(true);
  const [loadingMore,setLoadingMore]=useState(false);
  const [carted,setCarted]=useState<Set<string>>(new Set());

  useEffect(()=>{
    const sync=()=>setCarted(new Set(readCart().map(item=>item.domain)));
    sync();
    return onCartChange(sync);
  },[]);

  function statusKey(item:SearchResult){
    if(item.available===false)return "registered";
    if(item.premium)return "premium";
    if(item.available===true)return "available";
    return "unknown";
  }
  function statusText(item:SearchResult){
    if(item.available===false)return t("detail.registeredLabel");
    if(item.premium)return t("detail.premiumLabel");
    if(item.available===true)return t("detail.availableLabel");
    return t("detail.resultLabel");
  }
  function canBuy(item:SearchResult){
    return item.available===true&&item.price!==null;
  }

  async function loadSuggestions(label:string,page=0,append=false,tld=""){
    append?setLoadingMore(true):setBusy(true);
    setError("");
    try{
      const params=new URLSearchParams({q:label,page:String(page)});
      if(tld)params.set("tld",tld);
      const response=await fetch("/api/domain/search?"+params.toString(),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Domain search failed.");
      const incoming=(data.items||[]) as SearchResult[];
      setSuggestions(current=>append
        ?[...current,...incoming.filter(item=>!current.some(existing=>existing.domain===item.domain))]
        :incoming
      );
      setSearchLabel(label);
      setTlds(Array.isArray(data.tlds)?data.tlds:[]);
      setSelectedTld(tld);
      setResultsTotal(Number(data.total||incoming.length));
      setResultsPage(Number(data.page||page));
      setHasMore(Boolean(data.hasMore));
      setQuery(label);
    }catch(error){
      setError(error instanceof Error?error.message:"Domain search failed.");
    }finally{
      append?setLoadingMore(false):setBusy(false);
    }
  }

  async function load(name:string){
    const value=name.trim().toLowerCase();
    if(!value)return;
    setBusy(true);
    setError("");
    setResult(null);
    setSuggestions([]);
    setSearchLabel("");
    setTlds([]);
    setSelectedTld("");
    setResultsTotal(0);
    setResultsPage(0);
    setHasMore(false);
    setRdap(null);
    setRdapState("idle");

    const bare=!value.includes(".")&&/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
    if(bare){
      await loadSuggestions(value,0,false,"");
      return;
    }

    try{
      const response=await fetch("/api/domain/search?domain="+encodeURIComponent(value),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Domain search failed.");
      setResult(data);
      setQuery(data.domain);
    }catch(error){
      setError(error instanceof Error?error.message:"Domain search failed.");
    }finally{
      setBusy(false);
    }
  }

  useEffect(()=>{load(initialDomain);},[initialDomain]);

  function go(name:string){
    const value=name.trim().toLowerCase();
    if(!value)return;
    const target="/domain/"+encodeURIComponent(value);
    if(value===initialDomain.toLowerCase())load(value);
    else router.push(target);
  }

  function submit(event:FormEvent){
    event.preventDefault();
    go(query);
  }

  function add(item:SearchResult){
    if(!canBuy(item))return;
    addCart({domain:item.domain,price:item.price!,kind:"register"});
  }

  async function loadMore(){
    if(!searchLabel||!hasMore||loadingMore)return;
    await loadSuggestions(searchLabel,resultsPage+1,true,selectedTld);
  }

  async function filter(next:string){
    if(!searchLabel)return;
    setSuggestions([]);
    setSelectedTld(next);
    await loadSuggestions(searchLabel,0,false,next);
  }

  async function loadRdap(){
    if(!result||rdapState==="loading")return;
    setRdapState("loading");
    try{
      const response=await fetch("/api/rdap?domain="+encodeURIComponent(result.domain),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"RDAP lookup failed.");
      setRdap(data);
      setRdapState("loaded");
    }catch{
      setRdapState("unavailable");
    }
  }

  const registered=result?.available===false;

  return <div className="domainDetailPage">
    <section className="detailSearchBand">
      <div className="detailInner">
        <p>{t("detail.search")}</p>
        <form className="detailSearchForm" onSubmit={submit}>
          <input value={query} onChange={event=>setQuery(event.target.value)} placeholder={t("detail.searchAnother")} aria-label={t("common.domain")} required spellCheck={false}/>
          <button aria-label={t("detail.search")} disabled={busy}><SearchIcon/></button>
        </form>
      </div>
    </section>

    <section className="detailContent">
      <div className="detailInner">
        {busy&&!result&&!suggestions.length&&<div className="detailLoading">{t("detail.checking")}</div>}
        {error&&<div className="detailError">{error}</div>}

        {!!searchLabel&&<div className="domainFilterBar">
          <label>
            <span>{t("detail.filterExtension")}</span>
            <select value={selectedTld} onChange={event=>filter(event.target.value)} disabled={busy}>
              <option value="">{t("detail.allExtensions")}</option>
              {tlds.map(tld=><option value={tld.replace(/^\./,"")} key={tld}>{tld}</option>)}
            </select>
          </label>
          <div><strong>{suggestions.length}{resultsTotal>suggestions.length?" / "+resultsTotal:""}</strong> {t("detail.resultsFound")}</div>
        </div>}

        {!!suggestions.length&&<>
          <div className="domainSuggestions">
            {suggestions.map(item=><div className="domainSuggestion" key={item.domain}>
              <button className="domainSuggestionName" type="button" onClick={()=>go(item.domain)}>
                <h2>{item.domain}</h2>
                <span className={"domainStatus "+statusKey(item)}>{statusText(item)}</span>
              </button>
              <div className="domainSuggestionAction">
                {canBuy(item)&&<strong>{"$"+item.price!.toFixed(2)}<small>{t("detail.priceYear")}</small></strong>}
                {item.available===true&&item.price===null&&<span className="pricePending">{t("detail.priceUnavailable")}</span>}
                {canBuy(item)&&<>
                  <button className={carted.has(item.domain)?"secondary":"primary"} type="button" onClick={()=>add(item)}>
                    {carted.has(item.domain)?t("cart.added"):t("cart.add")}
                  </button>
                  <Link className="secondaryLink" href={"/checkout/guest?domain="+encodeURIComponent(item.domain)}>{t("cart.buyGuest")}</Link>
                </>}
                {!canBuy(item)&&<button className="secondary" type="button" onClick={()=>go(item.domain)}>{t("detail.view")}</button>}
              </div>
            </div>)}
          </div>
          {hasMore&&<div className="domainLoadMore">
            <button className="secondary" type="button" onClick={loadMore} disabled={loadingMore}>
              {loadingMore?t("detail.loadingMore"):t("detail.loadMore")}
            </button>
          </div>}
        </>}

        {result&&<div className="domainSummary">
          <div>
            <span className={"domainStatus "+statusKey(result)}>{statusText(result)}</span>
            <h1>{result.domain}</h1>
            <p>{result.preview?t("detail.preview"):result.premium?t("detail.premium"):result.available?t("detail.available"):t("detail.registered")}</p>
          </div>

          {result.available===true&&<div className="availabilityAction">
            {result.price!==null
              ?<strong>{"$"+result.price.toFixed(2)}<small>{t("detail.priceYear")}</small></strong>
              :<span className="pricePending">{t("detail.priceUnavailable")}</span>}
            {result.price!==null&&<>
              {carted.has(result.domain)
                ?<Link className="secondaryLink" href="/cart">{t("cart.view")}</Link>
                :<button className="primary" onClick={()=>add(result)}>{t("cart.add")}</button>}
              <Link className="secondaryLink" href={"/checkout/guest?domain="+encodeURIComponent(result.domain)}>{t("cart.buyGuest")}</Link>
            </>}
          </div>}

          {registered&&<div className="availabilityAction registeredAction">
            <button className="secondary publicDetailsButton" onClick={loadRdap} disabled={rdapState==="loading"}>
              {rdapState==="loading"?t("detail.rdapLoading"):t("detail.rdapButton")}
            </button>
          </div>}
        </div>}

        {rdapState==="loaded"&&rdap&&<RdapDetails data={rdap}/>}
        {rdapState==="unavailable"&&<div className="detailNotice">
          <h2>{t("detail.unavailableTitle")}</h2>
          <p>{t("detail.unavailable")}</p>
        </div>}
      </div>
    </section>
  </div>;
}
