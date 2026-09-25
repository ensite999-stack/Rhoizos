"use client";
import Link from "next/link";
import {useI18n} from "@/components/I18nProvider";

export default function Cart(){
  const {t}=useI18n();
  return <article className="page cartPage">
    <p className="kicker">{t("cart.kicker")}</p>
    <h1 className="pageTitle">{t("cart.title")}</h1>
    <p className="pageIntro">{t("cart.copy")}</p>
    <div className="cartActions">
      <Link className="primaryLink" href="/">{t("cart.search")}</Link>
      <Link className="secondaryLink" href="/transfer">{t("cart.transfer")}</Link>
    </div>
  </article>;
}
