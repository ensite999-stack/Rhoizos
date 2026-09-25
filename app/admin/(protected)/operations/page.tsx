import {db} from "@/lib/db";
import {getAdminI18n} from "@/lib/i18n-server";

export default async function AdminOperations(){
  const {t}=await getAdminI18n();
  const rows=await db()`
    select p.id,p.kind,p.status,p.provider_operation_id,p.last_error,p.updated_at,
      o.domain,o.payment_status,o.status as order_status
    from operations p join orders o on o.id=p.order_id
    order by p.updated_at desc limit 500
  `;

  return <>
    <div className="adminHeader"><div><h1>{t("operations")}</h1><p>{t("operations.copy")}</p></div></div>
    <div className="adminPanel"><div className="adminTableWrap"><table className="adminTable"><thead><tr>
      <th>{t("domains")}</th><th>{t("operation")}</th><th>{t("providerId")}</th><th>{t("payment")}</th><th>{t("order")}</th><th>{t("operationStatus")}</th><th>{t("error")}</th>
    </tr></thead><tbody>
      {rows.map((operation:any)=><tr key={String(operation.id)}>
        <td><strong>{String(operation.domain)}</strong></td><td>{String(operation.kind)}</td><td>{operation.provider_operation_id?String(operation.provider_operation_id):"—"}</td>
        <td>{String(operation.payment_status)}</td><td>{String(operation.order_status)}</td><td>{String(operation.status)}</td><td>{operation.last_error?String(operation.last_error):"—"}</td>
      </tr>)}
    </tbody></table></div></div>
  </>;
}
