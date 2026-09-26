"use client";
import {useI18n} from "@/components/I18nProvider";

const en={
  title:"Privacy Policy",intro:"This policy explains what Rhoizos collects, why it is used, and which service providers may receive it.",
  updated:"Last updated: September 26, 2026",
  sections:[
    ["Information we collect","Account and contact details you provide; domain names you search, register, transfer or manage; DNS configuration and private DNS notes; order and payment status; security and operational logs; and support communications."],
    ["Domain registration data","Domain registries and registrars require accurate registrant contact information. When needed to register, renew, transfer or manage a domain, required contact data is sent to our registrar provider. Eligible domains may use privacy protection, but registry rules can limit or prevent privacy masking."],
    ["Domain searches","Domain names you search may be sent from our servers to NameSilo to check availability and pricing. Availability checks are intended to contain the domain name being queried, not your full account profile."],
    ["Payments","Rhoizos uses NOWPayments for cryptocurrency payment processing. We receive payment identifiers, quoted amounts, status and transaction-related metadata needed to reconcile an order. We do not control the public nature of blockchain transactions."],
    ["Email","Transactional email is delivered through Resend. Your email address and the variables needed to render a message may be sent to Resend for delivery."],
    ["Infrastructure","Rhoizos uses service infrastructure including Vercel and Supabase to host the application and store operational data. These providers may process technical logs and data as necessary to provide their services."],
    ["Private DNS notes","Private DNS notes are stored by Rhoizos for your account and are not intentionally sent to the upstream DNS provider. DNS records themselves must be sent to the DNS provider to function."],
    ["Cookies and sessions","We use essential cookies for login sessions, language and appearance preferences. We do not need advertising cookies to provide the core service."],
    ["Retention","Account, domain, order and audit records are retained for as long as reasonably necessary to operate the service, meet registrar or registry obligations, resolve disputes, prevent abuse and satisfy applicable legal requirements."],
    ["Security","We use server-side sessions, password hashing, encrypted storage for sensitive transfer codes, access controls and operational logging. No internet service can guarantee absolute security."],
    ["Your choices","You can update account contact details, change supported privacy settings for eligible domains, manage DNS, and contact us about access or correction requests. Some registration records must be retained or shared because of registry, registrar or legal requirements."],
    ["Contact","Privacy questions can be sent to hello@rhoizos.com."]
  ]
};
const zh={
  title:"隐私政策",intro:"本政策说明 Rhoizos 会收集哪些信息、为什么使用这些信息，以及哪些服务提供商可能接收这些信息。",
  updated:"最后更新：2026 年 9 月 26 日",
  sections:[
    ["我们收集的信息","包括您提供的账户和联系资料；您搜索、注册、转入或管理的域名；DNS 配置与私有 DNS 备注；订单和付款状态；安全与运行日志；以及支持沟通记录。"],
    ["域名注册资料","注册局和注册商通常要求真实、准确的域名持有人联系信息。为完成注册、续费、转入或域名管理，必要联系资料会发送给上游注册商。符合条件的域名可使用隐私保护，但部分后缀会受到注册局规则限制。"],
    ["域名搜索","您搜索的域名可能由 Rhoizos 服务器发送给 NameSilo，用于查询可用性与价格。可用性查询仅需要待查询域名，不会主动附带完整账户资料。"],
    ["付款","Rhoizos 使用 NOWPayments 处理加密货币付款。我们会接收用于核对订单的付款编号、报价金额、付款状态和相关交易元数据。区块链交易本身可能公开，这不由 Rhoizos 控制。"],
    ["邮件","事务邮件通过 Resend 发送。为完成邮件投递，您的邮箱地址以及渲染邮件所需的模板变量可能发送给 Resend。"],
    ["基础设施","Rhoizos 使用包括 Vercel 和 Supabase 在内的基础设施托管应用和存储运营数据。这些服务商可能为提供服务而处理必要的技术日志和数据。"],
    ["私有 DNS 备注","私有 DNS 备注仅存储在 Rhoizos 账户侧，不会主动发送给上游 DNS 服务商。真正的 DNS 记录则必须发送给 DNS 服务商才能生效。"],
    ["Cookie 与会话","我们使用登录会话、语言和外观偏好所必需的 Cookie。核心服务不依赖广告 Cookie。"],
    ["数据保留","账户、域名、订单和审计记录会在运营服务、履行注册商或注册局义务、解决争议、防止滥用和满足适用法律要求所合理需要的期间内保留。"],
    ["安全","我们使用服务端会话、密码哈希、敏感转移代码加密存储、访问控制和运行日志等措施。任何互联网服务都无法保证绝对安全。"],
    ["您的选择","您可以更新账户联系资料、调整支持该功能的域名隐私设置、管理 DNS，并联系我们提出访问或更正请求。部分注册数据可能因注册局、注册商或法律要求必须保留或共享。"],
    ["联系我们","隐私问题请发送至 hello@rhoizos.com。"]
  ]
};

export default function Privacy(){
  const {locale}=useI18n();
  const c=locale.startsWith("zh")?zh:en;
  return <article className="page legalPage"><p className="kicker">Rhoizos</p><h1 className="pageTitle">{c.title}</h1><p className="pageIntro">{c.intro}</p><p className="legalUpdated">{c.updated}</p><div className="legalSections">{c.sections.map(([h,p])=><section key={h}><h2>{h}</h2><p>{p}</p></section>)}</div></article>;
}
