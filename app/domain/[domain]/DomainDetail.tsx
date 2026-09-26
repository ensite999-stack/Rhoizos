"use client";
import {FormEvent,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useI18n} from "@/components/I18nProvider";
import RdapDetails,{type RdapInfo} from "@/components/RdapDetails";
import {addCart,onCartChange,readCart} from "@/lib/cart-client";

type SearchResult={domain:string;available:boolean|null;premium:boolean;price:number|null;firstYearPrice:number|null;promoPrice:number|null;renewPrice:number|null;preview?:boolean};

function SearchIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
function FilterIcon(){
  return <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M3 5h14M6 10h8M8.5 15h3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="7" cy="5" r="1.6" fill="var(--surface-raised)" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="12.5" cy="10" r="1.6" fill="var(--surface-raised)" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="10" cy="15" r="1.6" fill="var(--surface-raised)" stroke="currentColor" strokeWidth="1.3"/>
  </svg>;
}

export default function DomainDetail({initialDomain}:{initialDomain:string}){
  const {t}=useI18n();
  const router=useRouter();
  const filterRef=useRef<HTMLDivElement>(null);
  const [query,setQuery]=useState(initialDomain);
  const [result,setResult]=useState<SearchResult|null>(null);
  const [suggestions,setSuggestions]=useState<SearchResult[]>([]);
  const [searchLabel,setSearchLabel]=useState("");
  const [tlds,setTlds]=useState<string[]>([]);
  const [selectedTlds,setSelectedTlds]=useState<string[]>([]);
  const [draftTlds,setDraftTlds]=useState<string[]>([]);
  const [filterSearch,setFilterSearch]=useState("");
  const [filterOpen,setFilterOpen]=useState(false);
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

  useEffect(()=>{
    const outside=(event:PointerEvent)=>{if(filterRef.current&&!filterRef.current.contains(event.target as Node))setFilterOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setFilterOpen(false);};
    document.addEventListener("pointerdown",outside);
    document.addEventListener("keydown",escape);
    return ()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[]);

  const filteredTlds=useMemo(()=>{
    const term=filterSearch.trim().toLowerCase().replace(/^\./,"");
    return term?tlds.filter(tld=>tld.toLowerCase().includes(term)):tlds;
  },[tlds,filterSearch]);
  const popularTlds=tlds.filter(tld=>[".com",".net",".org",".io",".co",".ai",".dev",".app"].includes(tld)).slice(0,8);

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
  function canBuy(item:SearchResult){return item.available===true&&item.price!==null;}

  async function loadSuggestions(label:string,page=0,append=false,filters:string[]=[]){
    append?setLoadingMore(true):setBusy(true);
    setError("");
    try{
      const params=new URLSearchParams({q:label,page:String(page)});
      if(filters.length)params.set("tld",filters.map(value=>value.replace(/^\./,"")).join(","));
      const response=await fetch("/api/domain/search?"+params.toString(),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Domain search failed.");
      const incoming=(data.items||[]) as SearchResult[];
      setSuggestions(current=>append?[...current,...incoming.filter(item=>!current.some(existing=>existing.domain===item.domain))]:incoming);
      setSearchLabel(label);
      setTlds(Array.isArray(data.tlds)?data.tlds:[]);
      setSelectedTlds(filters);
      setDraftTlds(filters);
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
    setBusy(true);setError("");setResult(null);setSuggestions([]);setSearchLabel("");setTlds([]);
    setSelectedTlds([]);setDraftTlds([]);setResultsTotal(0);setResultsPage(0);setHasMore(false);setRdap(null);setRdapState("idle");

    const bare=!value.includes(".")&&/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
    if(bare){await loadSuggestions(value,0,false,[]);return;}

    try{
      const response=await fetch("/api/domain/search?domain="+encodeURIComponent(value),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Domain search failed.");
      setResult(data);setQuery(data.domain);
    }catch(error){
      setError(error instanceof Error?error.message:"Domain search failed.");
    }finally{setBusy(false);}
  }

  useEffect(()=>{load(initialDomain);},[initialDomain]);

  function go(name:string){
    const value=name.trim().toLowerCase();
    if(!value)return;
    const target="/domain/"+encodeURIComponent(value);
    if(value===initialDomain.toLowerCase())load(value);else router.push(target);
  }
  function submit(event:FormEvent){event.preventDefault();go(query);}
  function add(item:SearchResult){if(canBuy(item))addCart({domain:item.domain,price:item.price!,kind:"register"});}
  async function loadMore(){if(searchLabel&&hasMore&&!loadingMore)await loadSuggestions(searchLabel,resultsPage+1,true,selectedTlds);}

  function toggleDraft(tld:string){
    setDraftTlds(current=>current.includes(tld)?current.filter(item=>item!==tld):current.length<20?[...current,tld]:current);
  }
  async function applyFilters(){
    if(!searchLabel)return;
    setFilterOpen(false);setSuggestions([]);
    await loadSuggestions(searchLabel,0,false,draftTlds);
  }
  async function clearFilters(){
    setDraftTlds([]);setFilterSearch("");setFilterOpen(false);setSuggestions([]);
    if(searchLabel)await loadSuggestions(searchLabel,0,false,[]);
  }

  async function loadRdap(){
    if(!result||rdapState==="loading")return;
    setRdapState("loading");
    try{
      const response=await fetch("/api/rdap?domain="+encodeURIComponent(result.domain),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"RDAP lookup failed.");
      setRdap(data);setRdapState("loaded");
    }catch{setRdapState("unavailable");}
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
          <div className="filterWrap" ref={filterRef}>
            <button className={"filterTrigger"+(selectedTlds.length?" active":"")} type="button" onClick={()=>{setDraftTlds(selectedTlds);setFilterOpen(v=>!v)}}>
              <FilterIcon/><span>{t("detail.filters")}</span>{selectedTlds.length>0&&<b>{selectedTlds.length}</b>}
            </button>
            {selectedTlds.map(tld=><button className="activeFilterChip" type="button" key={tld} onClick={()=>{const next=selectedTlds.filter(item=>item!==tld);setSuggestions([]);loadSuggestions(searchLabel,0,false,next)}}>{tld}<span>×</span></button>)}
            {filterOpen&&<div className="filterPopover">
              <div className="filterPopoverHead"><strong>{t("detail.filterExtensions")}</strong><button type="button" onClick={()=>setFilterOpen(false)}>×</button></div>
              <input className="filterSearch" value={filterSearch} onChange={event=>setFilterSearch(event.target.value)} placeholder={t("detail.searchExtensions")} autoFocus/>
              {!!popularTlds.length&&<div className="filterPopular">
                <span>{t("detail.popularExtensions")}</span>
                <div>{popularTlds.map(tld=><button type="button" className={draftTlds.includes(tld)?"selected":""} key={tld} onClick={()=>toggleDraft(tld)}>{tld}</button>)}</div>
              </div>}
              <div className="filterTldList">
                {filteredTlds.map(tld=><label key={tld}><input type="checkbox" checked={draftTlds.includes(tld)} onChange={()=>toggleDraft(tld)}/><span>{tld}</span></label>)}
              </div>
              <div className="filterActions">
                <button className="filterClear" type="button" onClick={clearFilters}>{t("detail.clear")}</button>
                <button className="primary" type="button" onClick={applyFilters}>{t("detail.apply")} {draftTlds.length?"("+draftTlds.length+")":""}</button>
              </div>
            </div>}
          </div>
          <div className="filterResults"><strong>{suggestions.length}{resultsTotal>suggestions.length?" / "+resultsTotal:""}</strong> {t("detail.resultsFound")}</div>
        </div>}

        {!!suggestions.length&&<>
          <div className="domainSuggestions">
            {suggestions.map(item=><div className="domainSuggestion" key={item.domain}>
              <button className="domainSuggestionName" type="button" onClick={()=>go(item.domain)}>
                <h2>{item.domain}</h2><span className={"domainStatus "+statusKey(item)}>{statusText(item)}</span>
              </button>
              <div className="domainSuggestionAction">
                {item.available===true&&<div className="domainPriceBreakdown">
                  <span><small>{t("detail.firstYearPrice")}</small><b>{item.price!==null?"$"+item.price.toFixed(2):"—"}</b></span>
                  <span><small>{t("detail.renewPrice")}</small><b>{item.renewPrice!==null?"$"+item.renewPrice.toFixed(2):"—"}</b></span>
                </div>}
                {item.available===true&&item.price===null&&<span className="pricePending">{t("detail.priceUnavailable")}</span>}
                {canBuy(item)&&<>
                  <button className={carted.has(item.domain)?"secondary":"primary"} type="button" onClick={()=>add(item)}>{carted.has(item.domain)?t("cart.added"):t("cart.add")}</button>
                </>}
                {!canBuy(item)&&<button className="secondary" type="button" onClick={()=>go(item.domain)}>{t("detail.view")}</button>}
              </div>
            </div>)}
          </div>
          {hasMore&&<div className="domainLoadMore"><button className="secondary" type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore?t("detail.loadingMore"):t("detail.loadMore")}</button></div>}
        </>}

        {result&&<div className="domainSummary">
          <div>
            <span className={"domainStatus "+statusKey(result)}>{statusText(result)}</span><h1>{result.domain}</h1>
            <p>{result.preview?t("detail.preview"):result.premium?t("detail.premium"):result.available?t("detail.available"):t("detail.registered")}</p>
          </div>
          {result.available===true&&<div className="availabilityAction">
            <div className="domainPriceBreakdown summaryPrices">
              <span><small>{t("detail.firstYearPrice")}</small><b>{result.price!==null?"$"+result.price.toFixed(2):"—"}</b></span>
              <span><small>{t("detail.renewPrice")}</small><b>{result.renewPrice!==null?"$"+result.renewPrice.toFixed(2):"—"}</b></span>
            </div>
            {result.price===null&&<span className="pricePending">{t("detail.priceUnavailable")}</span>}
            {result.price!==null&&<>
              {carted.has(result.domain)?<Link className="secondaryLink" href="/cart">{t("cart.view")}</Link>:<button className="primary" onClick={()=>add(result)}>{t("cart.add")}</button>}
            </>}
          </div>}
          {registered&&<div className="availabilityAction registeredAction"><button className="secondary publicDetailsButton" onClick={loadRdap} disabled={rdapState==="loading"}>{rdapState==="loading"?t("detail.rdapLoading"):t("detail.rdapButton")}</button></div>}
        </div>}

        {rdapState==="loaded"&&rdap&&<RdapDetails data={rdap}/>}
        {rdapState==="unavailable"&&<div className="detailNotice"><h2>{t("detail.unavailableTitle")}</h2><p>{t("detail.unavailable")}</p></div>}
      </div>
    </section>
  </div>;
}
