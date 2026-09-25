import Link from "next/link";
import {redirect} from "next/navigation";
import {currentAdmin} from "@/lib/admin-auth";
import {getAdminI18n} from "@/lib/i18n-server";
import AdminLogout from "./AdminLogout";

export default async function ProtectedAdminLayout({children}:{children:React.ReactNode}){
  const admin=await currentAdmin();
  if(!admin)redirect("/admin/login");
  const {t}=await getAdminI18n();

  return <div className="adminBody"><div className="adminShell">
    <aside className="adminSidebar">
      <Link href="/admin" className="adminMark">{t("title")}</Link>
      <nav className="adminNav">
        <Link href="/admin">{t("overview")}</Link>
        <Link href="/admin/users">{t("users")}</Link>
        <Link href="/admin/domains">{t("domains")}</Link>
        <Link href="/admin/orders">{t("orders")}</Link>
        <Link href="/admin/operations">{t("operations")}</Link>
        <Link href="/admin/pricing">{t("pricing")}</Link>
        <Link href="/admin/settings">{t("settings")}</Link>
      </nav>
      <div className="adminIdentity">{admin.display_name}<br/>{admin.email}<AdminLogout/></div>
    </aside>
    <section className="adminMain">{children}</section>
  </div></div>;
}
