import {db} from "@/lib/db";
import {getAdminI18n} from "@/lib/i18n-server";

export default async function AdminOrders(){
  const {t,locale}=await getAdminI18n();
  const rows=await db()`
    select o.id,o.domain,o.kind,o.amount_usd,o.payment_status,o.status,o.last_error,o.created_at,u.email
    from orders o join users u on u.id=o.user_id
    order by o.created_at desc limit 500
  `;

  return <>
    <div className="adminHeader"><div><h1>{t("orders")}</h1><p>{t("orders.copy")}</p></div></div>
    <div className="adminPanel"><div className="adminTableWrap"><table className="adminTable"><thead><tr>
      <th>{t("domains")}</th><th>{t("customer")}</th><th>{t("type")}</th><th>{t("amount")}</th><th>{t("payment")}</th><th>{t("status")}</th><th>{t("error")}</th><th>{t("created")}</th>
    </tr></thead><tbody>
      {rows.map((order:any)=><tr key={String(order.id)}>
        <td><strong>{String(order.domain)}</strong></td><td>{String(order.email)}</td><td>{String(order.kind)}</td><td>{"$"+Number(order.amount_usd).toFixed(2)}</td>
        <td>{String(order.payment_status)}</td><td><span className={"adminStatus "+(["manual_review","payment_review","failed"].includes(String(order.status))?"bad":"")}>{String(order.status)}</span></td>
        <td>{order.last_error?String(order.last_error):"—"}</td><td>{new Date(order.created_at).toLocaleString(locale)}</td>
      </tr>)}
    </tbody></table></div></div>
  </>;
}
