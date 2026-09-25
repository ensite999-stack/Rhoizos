import {db} from "@/lib/db";
import {getAdminI18n} from "@/lib/i18n-server";

export default async function AdminDomains(){
  const {t,locale}=await getAdminI18n();
  const rows=await db()`
    select d.id,d.name,d.lifecycle_status,d.expires_at,d.transfer_locked,d.updated_at,u.email
    from domains d join users u on u.id=d.user_id
    order by d.updated_at desc limit 500
  `;

  return <>
    <div className="adminHeader"><div><h1>{t("domains")}</h1><p>{t("domains.copy")}</p></div></div>
    <div className="adminPanel"><div className="adminTableWrap"><table className="adminTable"><thead><tr>
      <th>{t("domains")}</th><th>{t("owner")}</th><th>{t("status")}</th><th>{t("expires")}</th><th>{t("transferLock")}</th><th>{t("updated")}</th>
    </tr></thead><tbody>
      {rows.map((domain:any)=><tr key={String(domain.id)}>
        <td><strong>{String(domain.name)}</strong></td><td>{String(domain.email)}</td><td>{String(domain.lifecycle_status)}</td>
        <td>{domain.expires_at?new Date(domain.expires_at).toLocaleDateString(locale):"—"}</td>
        <td>{domain.transfer_locked?t("locked"):t("unlocked")}</td><td>{new Date(domain.updated_at).toLocaleString(locale)}</td>
      </tr>)}
    </tbody></table></div></div>
  </>;
}
