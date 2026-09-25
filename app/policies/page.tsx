"use client";
import Link from "next/link";
import {useI18n} from "@/components/I18nProvider";
export default function Policies(){
 const {locale}=useI18n();const zh=locale.startsWith("zh");
 return <article className="page legalPage"><p className="kicker">Rhoizos</p><h1 className="pageTitle">{zh?"政策与定价。":"Policies & pricing."}</h1><p className="pageIntro">{zh?"查看 Rhoizos 的隐私政策、使用条款和域名定价说明。":"Review Rhoizos privacy, service terms and domain pricing information."}</p><div className="policyLinks"><Link href="/privacy">{zh?"隐私政策":"Privacy Policy"}</Link><Link href="/terms">{zh?"使用条款":"Terms of Service"}</Link><Link href="/pricing">{zh?"域名定价":"Domain Pricing"}</Link></div></article>;
}
