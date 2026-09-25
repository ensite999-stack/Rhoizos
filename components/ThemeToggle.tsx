"use client";
import {useState} from "react";
import {useI18n} from "./I18nProvider";

export type Theme="light"|"dark";

export default function ThemeToggle({initialTheme}:{initialTheme:Theme}){
  const {t}=useI18n();
  const [theme,setTheme]=useState<Theme>(initialTheme);

  function apply(next:Theme){
    setTheme(next);
    document.documentElement.dataset.theme=next;
    document.cookie="rhoizos_theme="+next+"; Path=/; Max-Age=31536000; SameSite=Lax";
  }

  return <div className="themePreference">
    <span>{t("footer.appearance")}</span>
    <div className="themeSegment" role="group" aria-label={t("footer.appearance")}>
      <button type="button" className={theme==="light"?"active":""} aria-pressed={theme==="light"} onClick={()=>apply("light")}>☀ {t("theme.light")}</button>
      <button type="button" className={theme==="dark"?"active":""} aria-pressed={theme==="dark"} onClick={()=>apply("dark")}>◐ {t("theme.dark")}</button>
    </div>
  </div>;
}
