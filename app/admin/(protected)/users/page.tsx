import {db} from "@/lib/db";
import UserToggle from "./UserToggle";

export default async function AdminUsers(){
  const rows=await db()`
    select u.id,u.email,u.first_name,u.last_name,u.company,u.country,u.active,u.created_at,
      count(distinct d.id)::int as domain_count,count(distinct o.id)::int as order_count
    from users u
    left join domains d on d.user_id=u.id
    left join orders o on o.user_id=u.id
    group by u.id order by u.created_at desc limit 500
  `;
  return <>
    <div className="adminHeader"><div><h1>Users</h1><p>Customer accounts and ownership activity.</p></div></div>
    <div className="adminPanel"><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>User</th><th>Country</th><th>Domains</th><th>Orders</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>
      {rows.map((u:any)=><tr key={String(u.id)}><td><strong>{String(u.first_name)} {String(u.last_name)}</strong><br/>{String(u.email)}{u.company?<><br/>{String(u.company)}</>:null}</td><td>{String(u.country)}</td><td>{Number(u.domain_count)}</td><td>{Number(u.order_count)}</td><td><span className={"adminStatus "+(u.active?"good":"bad")}>{u.active?"Active":"Disabled"}</span></td><td>{new Date(u.created_at).toLocaleDateString()}</td><td><UserToggle id={String(u.id)} active={Boolean(u.active)}/></td></tr>)}
    </tbody></table></div></div>
  </>;
}
