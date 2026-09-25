import Link from "next/link";
import {redirect} from "next/navigation";
import {currentAdmin} from "@/lib/admin-auth";
import AdminLogout from "./AdminLogout";

export default async function ProtectedAdminLayout({children}:{children:React.ReactNode}){
  const admin=await currentAdmin();
  if(!admin) redirect("/admin/login");

  return <div className="adminBody"><div className="adminShell">
    <aside className="adminSidebar">
      <Link href="/admin" className="adminMark">Rhoizos Admin</Link>
      <nav className="adminNav">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/users">Users</Link>
        <Link href="/admin/domains">Domains</Link>
        <Link href="/admin/orders">Orders</Link>
        <Link href="/admin/operations">Operations</Link>
        <Link href="/admin/pricing">Pricing</Link>
        <Link href="/admin/settings">Settings</Link>
      </nav>
      <div className="adminIdentity">{admin.display_name}<br/>{admin.email}<AdminLogout/></div>
    </aside>
    <section className="adminMain">{children}</section>
  </div></div>;
}
