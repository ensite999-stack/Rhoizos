"use client";
export default function AdminLogout(){
  async function logout(){
    await fetch("/api/admin/auth/logout",{method:"POST"});
    location.href="/admin/login";
  }
  return <button className="adminLogout" onClick={logout}>Sign out</button>;
}
