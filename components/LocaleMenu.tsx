"use client";
import {useEffect,useRef,useState} from "react";
import {localeOptions,type Locale} from "@/lib/i18n";
import {useI18n} from "./I18nProvider";

function Globe(){
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5"/>
    <path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.4 5.1 3.4 8.5S14.2 18.2 12 20.5C9.8 18.2 8.6 15.4 8.6 12S9.8 5.8 12 3.5z"/>
  </svg>;
}

export default function LocaleMenu({variant="header"}:{variant?:"header"|"footer"}){
  const {locale,t}=useI18n();
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  const current=localeOptions.find(item=>item.value===locale)!;

  useEffect(()=>{
    function outside(event:PointerEvent){if(ref.current&&!ref.current.contains(event.target as Node))setOpen(false);}
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
      className={"localeTrigger"+(open?" open":"")}
      type="button"
      onClick={()=>setOpen(value=>!value)}
      aria-expanded={open}
      aria-label={t("locale.change")+" — "+current.label}
      title={current.label}
    >
      <span className="localeGlobe"><Globe/></span>
      <span className="localeCurrent">{current.label}</span>
    </button>
    {open&&<div className="localePopover" role="menu">
      <div className="localePopoverHead">
        <span>{t("locale.change")}</span>
        <strong>{current.label}</strong>
      </div>
      <div className="localeOptions">
        {localeOptions.map(option=><button type="button" role="menuitemradio" aria-checked={option.value===locale} key={option.value} onClick={()=>select(option.value)}>
          <span className="localeOptionCopy"><strong>{option.label}</strong><small>{option.value}</small></span>
          {option.value===locale&&<span className="localeCheck">✓</span>}
        </button>)}
      </div>
    </div>}
  </div>;
}
