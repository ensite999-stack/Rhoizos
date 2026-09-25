import {db} from "@/lib/db";

export default async function AdminDomains(){
  const rows=await db()`
    select d.id,d.name,d.lifecycle_status,d.expires_at,d.transfer_locked,d.updated_at,u.email
    from domains d join users u on u.id=d.user_id
    order by d.updated_at desc limit 500
  `;
  return <>
    <div className="adminHeader"><div><h1>Domains</h1><p>Registered and transferred domain inventory.</p></div></div>
    <div className="adminPanel"><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Domain</th><th>Owner</th><th>Status</th><th>Expires</th><th>Transfer lock</th><th>Updated</th></tr></thead><tbody>
      {rows.map((d:any)=><tr key={String(d.id)}><td><strong>{String(d.name)}</strong></td><td>{String(d.email)}</td><td>{String(d.lifecycle_status)}</td><td>{d.expires_at?new Date(d.expires_at).toLocaleDateString():"—"}</td><td>{d.transfer_locked?"Locked":"Unlocked"}</td><td>{new Date(d.updated_at).toLocaleString()}</td></tr>)}
    </tbody></table></div></div>
  </>;
}
