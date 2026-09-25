"use client";
import {useI18n} from "./I18nProvider";

export type RdapInfo={
  domain:string;
  unicodeName:string|null;
  handle:string|null;
  port43:string|null;
  registrar:string|null;
  registeredAt:string|null;
  expiresAt:string|null;
  updatedAt:string|null;
  statuses:string[];
  events:{action:string|null;date:string|null;actor:string|null}[];
  entities:{
    handle:string|null;roles:string[];publicIds:unknown[];links:{rel:string|null;href:string|null;title:string|null;type:string|null}[];
    name:string|null;organization:string|null;email:string|null;phone:string|null;address:unknown;
  }[];
  nameservers:{name:string;unicodeName:string|null;ipv4:string[];ipv6:string[]}[];
  dnssec:{delegationSigned:boolean;zoneSigned:boolean;maxSigLife:unknown;dsData:unknown[];keyData:unknown[]};
  publicIds:unknown[];
  notices:{title:string|null;description:string[]}[];
  remarks:{title:string|null;description:string[]}[];
  links:{rel:string|null;href:string|null;title:string|null;type:string|null}[];
  dnsRecords:{name:string;type:string;ttl:number;value:string}[];
};

function cleanStatus(status:string){return status.replace(/[_-]+/g," ");}

export default function RdapDetails({data}:{data:RdapInfo}){
  const {t,locale}=useI18n();

  function date(value:string|null){
    if(!value)return t("common.notPublished");
    const parsed=new Date(value);
    return Number.isNaN(parsed.getTime())?value:parsed.toLocaleString(locale,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
  }

  return <div className="rdapFull">
    <section className="rdapExplain">
      <h2>{t("rdap.fullTitle")}</h2>
      <p>{t("rdap.fullCopy")}</p>
    </section>

    <dl className="rdapFacts">
      <div><dt>{t("detail.registrar")}</dt><dd>{data.registrar||t("common.notPublished")}</dd><p>{t("rdap.explainRegistrar")}</p></div>
      <div><dt>{t("detail.registeredSince")}</dt><dd>{date(data.registeredAt)}</dd><p>{t("rdap.explainRegistered")}</p></div>
      <div><dt>{t("detail.expires")}</dt><dd>{date(data.expiresAt)}</dd><p>{t("rdap.explainExpiry")}</p></div>
      <div><dt>{t("detail.updated")}</dt><dd>{date(data.updatedAt)}</dd><p>{t("rdap.explainUpdated")}</p></div>
      <div><dt>{t("rdap.handle")}</dt><dd>{data.handle||t("common.notPublished")}</dd><p>{t("rdap.explainHandle")}</p></div>
      <div><dt>{t("detail.dnssec")}</dt><dd>{data.dnssec.delegationSigned?t("detail.enabled"):t("detail.notEnabled")}</dd><p>{t("rdap.explainDnssec")}</p></div>
    </dl>

    {!!data.statuses.length&&<section className="rdapBlock">
      <h3>{t("detail.status")}</h3>
      <p className="rdapHelp">{t("rdap.statusHelp")}</p>
      <div className="statusTextList">{data.statuses.map(status=><p key={status}>{cleanStatus(status)}</p>)}</div>
    </section>}

    {!!data.nameservers.length&&<section className="rdapBlock">
      <h3>{t("detail.nameservers")}</h3>
      <p className="rdapHelp">{t("rdap.nameserverHelp")}</p>
      <div className="rdapList">
        {data.nameservers.map(ns=><div className="rdapListRow" key={ns.name}>
          <strong>{ns.name}</strong>
          {!!ns.ipv4.length&&<span>IPv4: {ns.ipv4.join(", ")}</span>}
          {!!ns.ipv6.length&&<span>IPv6: {ns.ipv6.join(", ")}</span>}
        </div>)}
      </div>
    </section>}

    <section className="rdapBlock">
      <h3>{t("rdap.dnsTitle")}</h3>
      <p className="rdapHelp">{t("rdap.dnsHelp")}</p>
      {data.dnsRecords.length?<div className="publicDnsTable">
        {data.dnsRecords.map((record,index)=><div className="publicDnsRow" key={record.type+record.name+record.value+index}>
          <b>{record.type}</b><span>{record.name}</span><code>{record.value}</code><small>TTL {record.ttl}</small>
        </div>)}
      </div>:<p className="rdapEmpty">{t("rdap.noDns")}</p>}
    </section>

    {!!data.entities.length&&<section className="rdapBlock">
      <h3>{t("rdap.entitiesTitle")}</h3>
      <p className="rdapHelp">{t("rdap.entitiesHelp")}</p>
      <div className="rdapEntityGrid">
        {data.entities.map((entity,index)=><article className="rdapEntity" key={(entity.handle||"entity")+index}>
          <span>{entity.roles.length?entity.roles.join(", "):t("rdap.entity")}</span>
          <strong>{entity.name||entity.organization||entity.handle||t("common.notPublished")}</strong>
          {entity.organization&&entity.organization!==entity.name&&<p>{entity.organization}</p>}
          {entity.email&&<p>{entity.email}</p>}
          {entity.phone&&<p>{entity.phone}</p>}
          {entity.handle&&<small>{entity.handle}</small>}
        </article>)}
      </div>
    </section>}

    {!!data.events.length&&<section className="rdapBlock">
      <h3>{t("rdap.eventsTitle")}</h3>
      <p className="rdapHelp">{t("rdap.eventsHelp")}</p>
      <div className="rdapEvents">
        {data.events.map((event,index)=><div key={(event.action||"event")+index}>
          <strong>{event.action||t("rdap.entity")}</strong>
          <span>{date(event.date)}</span>
          {event.actor&&<small>{event.actor}</small>}
        </div>)}
      </div>
    </section>}

    {(data.dnssec.dsData.length>0||data.dnssec.keyData.length>0)&&<section className="rdapBlock">
      <h3>{t("rdap.dnssecTechnical")}</h3>
      <p className="rdapHelp">{t("rdap.dnssecTechnicalHelp")}</p>
      <pre className="rdapRaw">{JSON.stringify({dsData:data.dnssec.dsData,keyData:data.dnssec.keyData},null,2)}</pre>
    </section>}

    {(data.notices.length>0||data.remarks.length>0)&&<section className="rdapBlock">
      <h3>{t("rdap.noticesTitle")}</h3>
      <div className="rdapNotices">
        {[...data.notices,...data.remarks].map((item,index)=><article key={(item.title||"notice")+index}>
          {item.title&&<strong>{item.title}</strong>}
          {item.description.map((line,i)=><p key={i}>{line}</p>)}
        </article>)}
      </div>
    </section>}
  </div>;
}
