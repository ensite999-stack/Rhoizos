import {db} from "@/lib/db";

export default async function AdminOverview(){
  const sql=db();
  const [users,domains,orders,attention,ops]=await Promise.all([
    sql`select count(*)::int as count from users`,
    sql`select count(*)::int as count from domains`,
    sql`select count(*)::int as count from orders`,
    sql`select count(*)::int as count from orders where status in ('manual_review','payment_review','failed')`,
    sql`select count(*)::int as count from operations where status in ('pending','accepted','failed')`
  ]);
  const recent=await sql`
    select o.id,o.domain,o.kind,o.status,o.payment_status,o.amount_usd,o.created_at,u.email
    from orders o join users u on u.id=o.user_id
    order by o.created_at desc limit 12
  `;

  return <>
    <div className="adminHeader"><div><h1>Overview</h1><p>Current Rhoizos operations at a glance.</p></div></div>
    <div className="adminCards">
      <div className="adminCard"><span>Users</span><strong>{Number(users[0]?.count||0)}</strong></div>
      <div className="adminCard"><span>Domains</span><strong>{Number(domains[0]?.count||0)}</strong></div>
      <div className="adminCard"><span>Orders</span><strong>{Number(orders[0]?.count||0)}</strong></div>
      <div className="adminCard"><span>Needs attention</span><strong>{Number(attention[0]?.count||0)}</strong></div>
      <div className="adminCard"><span>Open operations</span><strong>{Number(ops[0]?.count||0)}</strong></div>
    </div>
    <div className="adminPanel">
      <div className="adminPanelHeader"><h2>Recent orders</h2></div>
      <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Domain</th><th>Customer</th><th>Type</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead><tbody>
        {recent.map((r:any)=><tr key={String(r.id)}><td>{String(r.domain)}</td><td>{String(r.email)}</td><td>{String(r.kind)}</td><td>{"$"+Number(r.amount_usd).toFixed(2)}</td><td>{String(r.payment_status)}</td><td>{String(r.status)}</td></tr>)}
      </tbody></table></div>
    </div>
  </>;
}
