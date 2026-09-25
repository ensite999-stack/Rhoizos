import {db} from "@/lib/db";

export default async function AdminOperations(){
  const rows=await db()`
    select p.id,p.kind,p.status,p.provider_operation_id,p.last_error,p.updated_at,
      o.domain,o.payment_status,o.status as order_status
    from operations p join orders o on o.id=p.order_id
    order by p.updated_at desc limit 500
  `;
  return <>
    <div className="adminHeader"><div><h1>Operations</h1><p>Registrar-side asynchronous work and failures.</p></div></div>
    <div className="adminPanel"><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Domain</th><th>Operation</th><th>Provider ID</th><th>Payment</th><th>Order</th><th>Operation status</th><th>Error</th></tr></thead><tbody>
      {rows.map((o:any)=><tr key={String(o.id)}><td><strong>{String(o.domain)}</strong></td><td>{String(o.kind)}</td><td>{o.provider_operation_id?String(o.provider_operation_id):"—"}</td><td>{String(o.payment_status)}</td><td>{String(o.order_status)}</td><td>{String(o.status)}</td><td>{o.last_error?String(o.last_error):"—"}</td></tr>)}
    </tbody></table></div></div>
  </>;
}
