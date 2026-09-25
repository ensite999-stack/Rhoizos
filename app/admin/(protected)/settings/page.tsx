import {db} from "@/lib/db";
import {getAdminI18n} from "@/lib/i18n-server";

export default async function AdminSettings(){
  const {t,locale}=await getAdminI18n();
  const rows=await db()`
    select l.id,l.action,l.target_type,l.target_id,l.created_at,a.email
    from admin_audit_log l
    left join admin_users a on a.id=l.admin_user_id
    order by l.created_at desc limit 30
  `;
  const env=[
    ["Database",Boolean(process.env.DATABASE_URL)],
    ["Spaceship",Boolean(process.env.SPACESHIP_API_KEY&&process.env.SPACESHIP_API_SECRET)],
    ["NOWPayments",Boolean(process.env.NOWPAYMENTS_API_KEY&&process.env.NOWPAYMENTS_IPN_SECRET)],
    ["Live payments",process.env.RHOIZOS_LIVE_PAYMENTS==="1"],
    ["Live registration",process.env.RHOIZOS_LIVE_REGISTRATION==="1"]
  ] as const;

  return <>
    <div className="adminHeader"><div><h1>{t("settings")}</h1><p>{t("settings.copy")}</p></div></div>
    <div className="adminPanel">
      <div className="adminPanelHeader"><h2>{t("environment")}</h2></div>
      <div className="adminSettingsList">
        {env.map(([name,on])=><div className="adminSetting" key={name}><span>{name}</span><strong className={"adminStatus "+(on?"good":"warn")}>{on?t("configured"):t("notConfigured")}</strong></div>)}
        <div className="adminSetting"><span>{t("supportEmail")}</span><strong>hello@rhoizos.com</strong></div>
      </div>
    </div>
    <div className="adminPanel">
      <div className="adminPanelHeader"><h2>{t("auditLog")}</h2></div>
      <div className="adminAudit">
        {rows.map((row:any)=><div className="adminAuditRow" key={String(row.id)}>
          <strong>{String(row.action)}</strong>
          <p>{row.email?String(row.email):"system"} · {row.target_type?String(row.target_type):"—"} {row.target_id?String(row.target_id):""} · {new Date(row.created_at).toLocaleString(locale)}</p>
        </div>)}
      </div>
    </div>
  </>;
}
