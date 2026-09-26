"use client";

import {useRouter} from "next/navigation";
import {useI18n} from "@/components/I18nProvider";

export default function BackLink({fallbackHref="/"}:{fallbackHref?:string}){
  const router=useRouter();
  const {t}=useI18n();

  function back(){
    if(window.history.length>1){
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return <button type="button" className="backHomeLink backNavigationLink" onClick={back}>
    ← {t("common.back")}
  </button>;
}
