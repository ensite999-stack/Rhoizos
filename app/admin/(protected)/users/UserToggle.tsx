"use client";
import {useState} from "react";

export default function UserToggle({id,active}:{id:string;active:boolean}){
  const [busy,setBusy]=useState(false);
  async function toggle(){
    setBusy(true);
    const r=await fetch("/api/admin/users/"+id,{
      method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({active:!active})
    });
    if(r.ok) location.reload(); else setBusy(false);
  }
  return <button className={"adminSmallButton "+(active?"danger":"")} disabled={busy} onClick={toggle}>{busy?"…":active?"Disable":"Enable"}</button>;
}
