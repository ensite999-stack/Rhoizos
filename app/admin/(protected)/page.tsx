import {db} from "@/lib/db";
import {getAdminI18n} from "@/lib/i18n-server";

export default async function AdminOverview(){
  const {t,locale}=await getAdminI18n();
  const sql=db();
  const [users,domains,orders,attention,operations]=await Promise.all([
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
    <div className="adminHeader"><div><h1>{t("overview")}</h1><p>{t("overview.copy")}</p></div></div>
    <div className="adminCards">
      <div className="adminCard"><span>{t("users")}</span><strong>{Number(users[0]?.count||0)}</strong></div>
      <div className="adminCard"><span>{t("domains")}</span><strong>{Number(domains[0]?.count||0)}</strong></div>
      <div className="adminCard"><span>{t("orders")}</span><strong>{Number(orders[0]?.count||0)}</strong></div>
      <div className="adminCard"><span>{t("needsAttention")}</span><strong>{Number(attention[0]?.count||0)}</strong></div>
      <div className="adminCard"><span>{t("openOperations")}</span><strong>{Number(operations[0]?.count||0)}</strong></div>
    </div>
    <div className="adminPanel">
      <div className="adminPanelHeader"><h2>{t("recentOrders")}</h2></div>
      <div className="adminTableWrap"><table className="adminTable"><thead><tr>
        <th>{t("domains")}</th><th>{t("customer")}</th><th>{t("type")}</th><th>{t("amount")}</th><th>{t("payment")}</th><th>{t("status")}</th>
      </tr></thead><tbody>
        {recent.map((row:any)=><tr key={String(row.id)}>
          <td>{String(row.domain)}</td><td>{String(row.email)}</td><td>{String(row.kind)}</td>
          <td>{"$"+Number(row.amount_usd).toFixed(2)}</td><td>{String(row.payment_status)}</td><td>{String(row.status)}</td>
        </tr>)}
      </tbody></table></div>
    </div>
  </>;
}
