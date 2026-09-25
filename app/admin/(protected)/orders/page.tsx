import {db} from "@/lib/db";

export default async function AdminOrders(){
  const rows=await db()`
    select o.id,o.domain,o.kind,o.amount_usd,o.payment_status,o.status,o.last_error,o.created_at,u.email
    from orders o join users u on u.id=o.user_id
    order by o.created_at desc limit 500
  `;
  return <>
    <div className="adminHeader"><div><h1>Orders</h1><p>Payment and provisioning state for every registrar order.</p></div></div>
    <div className="adminPanel"><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Domain</th><th>Customer</th><th>Type</th><th>Amount</th><th>Payment</th><th>Status</th><th>Error</th><th>Created</th></tr></thead><tbody>
      {rows.map((o:any)=><tr key={String(o.id)}><td><strong>{String(o.domain)}</strong></td><td>{String(o.email)}</td><td>{String(o.kind)}</td><td>{"$"+Number(o.amount_usd).toFixed(2)}</td><td>{String(o.payment_status)}</td><td><span className={"adminStatus "+(["manual_review","payment_review","failed"].includes(String(o.status))?"bad":"")}>{String(o.status)}</span></td><td>{o.last_error?String(o.last_error):"—"}</td><td>{new Date(o.created_at).toLocaleString()}</td></tr>)}
    </tbody></table></div></div>
  </>;
}
