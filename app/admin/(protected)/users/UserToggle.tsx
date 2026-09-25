"use client";
import {useState} from "react";
import {useI18n} from "@/components/I18nProvider";
import {adminTranslate} from "@/lib/admin-i18n";

export default function UserToggle({id,active}:{id:string;active:boolean}){
  const {locale}=useI18n();
  const [busy,setBusy]=useState(false);

  async function toggle(){
    setBusy(true);
    const response=await fetch("/api/admin/users/"+id,{
      method:"PATCH",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({active:!active})
    });
    if(response.ok)location.reload(); else setBusy(false);
  }

  return <button className={"adminSmallButton "+(active?"danger":"")} disabled={busy} onClick={toggle}>
    {busy?"…":adminTranslate(locale,active?"disable":"enable")}
  </button>;
}
