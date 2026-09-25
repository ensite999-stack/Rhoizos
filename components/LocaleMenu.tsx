"use client";
import {useEffect,useRef,useState} from "react";
import {localeOptions,type Locale} from "@/lib/i18n";
import {useI18n} from "./I18nProvider";

function GlobeIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5M12 3.5C9.8 5.8 8.7 8.6 8.7 12s1.1 6.2 3.3 8.5" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
  </svg>;
}

export default function LocaleMenu({variant="header"}:{variant?:"header"|"footer"}){
  const {locale,t}=useI18n();
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  const current=localeOptions.find(item=>item.value===locale)!;

  useEffect(()=>{
    function outside(event:PointerEvent){
      if(ref.current&&!ref.current.contains(event.target as Node)) setOpen(false);
    }
    function escape(event:KeyboardEvent){if(event.key==="Escape")setOpen(false);}
    document.addEventListener("pointerdown",outside);
    document.addEventListener("keydown",escape);
    return ()=>{
      document.removeEventListener("pointerdown",outside);
      document.removeEventListener("keydown",escape);
    };
  },[]);

  function select(next:Locale){
    document.cookie="rhoizos_locale="+encodeURIComponent(next)+"; Path=/; Max-Age=31536000; SameSite=Lax";
    setOpen(false);
    window.location.reload();
  }

  return <div className={"localeMenu "+variant} ref={ref}>
    <button
      className="localeTrigger"
      type="button"
      onClick={()=>setOpen(value=>!value)}
      aria-expanded={open}
      aria-label={t("locale.change")+" — "+current.label}
      title={current.label}
    >
      <span className="localeGlobe"><GlobeIcon/></span>
      <span className="localeChevron" aria-hidden="true">⌄</span>
    </button>
    {open&&<div className="localePopover" role="menu">
      <div className="localeMenuTitle">{t("locale.change")}</div>
      {localeOptions.map(option=><button type="button" role="menuitemradio" aria-checked={option.value===locale} key={option.value} onClick={()=>select(option.value)}>
        <span>{option.label}</span>{option.value===locale&&<span className="localeCheck">✓</span>}
      </button>)}
    </div>}
  </div>;
}
