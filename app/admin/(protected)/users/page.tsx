import {db} from "@/lib/db";
import {getAdminI18n} from "@/lib/i18n-server";
import UserToggle from "./UserToggle";

export default async function AdminUsers(){
  const {t,locale}=await getAdminI18n();
  const rows=await db()`
    select u.id,u.email,u.first_name,u.last_name,u.company,u.country,u.active,u.created_at,
      count(distinct d.id)::int as domain_count,count(distinct o.id)::int as order_count
    from users u
    left join domains d on d.user_id=u.id
    left join orders o on o.user_id=u.id
    group by u.id order by u.created_at desc limit 500
  `;

  return <>
    <div className="adminHeader"><div><h1>{t("users")}</h1><p>{t("users.copy")}</p></div></div>
    <div className="adminPanel"><div className="adminTableWrap"><table className="adminTable"><thead><tr>
      <th>{t("user")}</th><th>{t("country")}</th><th>{t("domains")}</th><th>{t("orders")}</th><th>{t("status")}</th><th>{t("created")}</th><th></th>
    </tr></thead><tbody>
      {rows.map((user:any)=><tr key={String(user.id)}>
        <td><strong>{String(user.first_name)} {String(user.last_name)}</strong><br/>{String(user.email)}{user.company?<><br/>{String(user.company)}</>:null}</td>
        <td>{String(user.country)}</td><td>{Number(user.domain_count)}</td><td>{Number(user.order_count)}</td>
        <td><span className={"adminStatus "+(user.active?"good":"bad")}>{user.active?t("active"):t("disabled")}</span></td>
        <td>{new Date(user.created_at).toLocaleDateString(locale)}</td><td><UserToggle id={String(user.id)} active={Boolean(user.active)}/></td>
      </tr>)}
    </tbody></table></div></div>
  </>;
}
