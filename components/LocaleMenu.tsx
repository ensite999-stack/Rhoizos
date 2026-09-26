"use client";
import {useEffect,useRef,useState} from "react";
import {localeOptions,type Locale} from "@/lib/i18n";
import {useI18n} from "./I18nProvider";

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
      <span className="localeCurrent">{current.label}</span>
    </button>
    {open&&<div className="localePopover" role="menu">
      <div className="localeMenuTitle">{t("locale.change")}</div>
      {localeOptions.map(option=><button type="button" role="menuitemradio" aria-checked={option.value===locale} key={option.value} onClick={()=>select(option.value)}>
        <span>{option.label}</span>{option.value===locale&&<span className="localeCheck">✓</span>}
      </button>)}
    </div>}
  </div>;
}
