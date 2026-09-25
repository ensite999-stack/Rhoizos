"use client";
import {useI18n} from "@/components/I18nProvider";
import {adminTranslate} from "@/lib/admin-i18n";

export default function AdminLogout(){
  const {locale}=useI18n();
  async function logout(){
    await fetch("/api/admin/auth/logout",{method:"POST"});
    location.href="/admin/login";
  }
  return <button className="adminLogout" onClick={logout}>{adminTranslate(locale,"signOut")}</button>;
}
