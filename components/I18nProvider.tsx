"use client";
import {createContext,useContext} from "react";
import {Locale,translate} from "@/lib/i18n";

type I18nValue={locale:Locale;t:(key:string)=>string};
const I18nContext=createContext<I18nValue|null>(null);

export function I18nProvider({locale,children}:{locale:Locale;children:React.ReactNode}){
  return <I18nContext.Provider value={{locale,t:(key)=>translate(locale,key)}}>{children}</I18nContext.Provider>;
}

export function useI18n(){
  const value=useContext(I18nContext);
  if(!value) throw new Error("I18nProvider is missing.");
  return value;
}
