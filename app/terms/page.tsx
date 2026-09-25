"use client";
import {useI18n} from "@/components/I18nProvider";

const en={
 title:"Terms of Service",intro:"These terms govern your use of Rhoizos domain search, registration, transfer, renewal and DNS services.",updated:"Last updated: September 26, 2026",
 sections:[
  ["Using Rhoizos","You must provide accurate information, keep account credentials secure, and use the service lawfully. You are responsible for activity performed through your account."],
  ["Domain availability","Search results are informational and can change before an order is submitted. A domain is not secured until the upstream registrar or registry confirms the registration or transfer."],
  ["Registration rules","Domain registrations are subject to registrar, registry, ICANN and TLD-specific rules. You agree to provide any contact information, eligibility information or verification required for the domain you request."],
  ["Pricing","Displayed prices are in USD unless stated otherwise. Standard retail pricing is currently calculated from our recorded provider cost plus a fixed $2.10 Rhoizos margin. Registry, provider, ICANN or other mandatory costs can change, and the final price shown before payment is authoritative."],
  ["Premium domains","Registry-premium domains can have non-standard registration, renewal and transfer prices. Premium pricing may change between search and checkout. We recheck availability and applicable provider pricing before provisioning."],
  ["Cryptocurrency payments","Payments are processed through NOWPayments. Crypto quotes can expire or change with market conditions. Underpayments, overpayments, delayed confirmations or unsupported transfers can require manual review."],
  ["Provisioning and failed operations","Payment confirmation and domain provisioning are separate events. If payment succeeds but an upstream registration, renewal or transfer cannot be completed, the order may enter manual review for correction, completion or refund handling."],
  ["Renewals and expiry","Renewal dates, grace periods and redemption rules vary by registry. An expired domain may incur additional redemption fees or become unavailable for recovery. Do not rely on last-minute renewal."],
  ["Transfers","Transfers can be delayed by registry rules, transfer locks, recent registration or contact changes, invalid Auth Codes, disputes or the losing registrar. Eligible transfers commonly add a renewal term, but rules vary by TLD."],
  ["DNS","You are responsible for DNS changes made through your account. Incorrect DNS records can interrupt websites, email or other services. DNS propagation and third-party resolver behavior are outside our direct control."],
  ["Privacy protection","Eligible domains receive privacy protection by default where supported. Some registries prohibit or limit privacy services. You remain responsible for providing accurate underlying registrant information."],
  ["Abuse and suspension","We may restrict access, suspend operations or cooperate with registrars, registries or lawful authorities when reasonably necessary to address fraud, abuse, security incidents, legal requirements or violations of applicable domain policies."],
  ["Refunds","Domain operations are often irreversible after submission to a registry. Refund eligibility depends on whether an operation has been submitted, completed, rejected or can still be cancelled. Crypto network fees and third-party charges may be non-refundable."],
  ["Service changes","Features, providers, prices and these terms may change. Material changes will be reflected on this page with an updated date."],
  ["Contact","Questions about these terms can be sent to hello@rhoizos.com."]
 ]
};
const zh={
 title:"使用条款",intro:"本条款适用于您使用 Rhoizos 的域名搜索、注册、转入、续费和 DNS 服务。",updated:"最后更新：2026 年 9 月 26 日",
 sections:[
  ["使用 Rhoizos","您应提供准确资料、妥善保护账户凭据并合法使用本服务。通过您账户执行的操作由您负责。"],
  ["域名可用性","搜索结果仅用于即时查询，提交订单前随时可能发生变化。只有上游注册商或注册局确认成功后，域名才算真正注册或转入完成。"],
  ["域名注册规则","域名注册受注册商、注册局、ICANN 以及具体后缀规则约束。您同意提供该域名要求的联系资料、资格信息或验证材料。"],
  ["定价","除非另有说明，价格以美元显示。标准域名当前按我们记录的上游成本加固定 2.10 美元 Rhoizos 加价计算。注册局、上游服务商、ICANN 或其他强制费用可能变化，付款前显示的最终价格为准。"],
  ["高级域名","注册局高级域名可能采用不同于普通域名的注册、续费和转入价格。高级域名价格可能在搜索和结账之间变化，Rhoizos 会在执行前重新确认可用性和适用的上游价格。"],
  ["加密货币付款","付款由 NOWPayments 处理。加密货币报价可能过期或随市场变化。少付、多付、确认延迟或不受支持的转账可能需要人工处理。"],
  ["付款与交付","付款确认和域名交付是两个独立事件。若付款成功但上游注册、续费或转入无法自动完成，订单可能进入人工审核，以便修正、继续执行或处理退款。"],
  ["续费与到期","续费日期、宽限期和赎回规则因注册局而异。域名到期后可能产生额外赎回费用，也可能最终无法恢复。请不要依赖最后一刻续费。"],
  ["域名转入","转入可能受到注册局规则、转移锁、近期注册或联系资料变更、无效 Auth Code、争议或原注册商处理时间影响。许多后缀的转入会增加注册年限，但具体规则以对应后缀为准。"],
  ["DNS","您需要对账户中提交的 DNS 修改负责。错误 DNS 记录可能导致网站、邮箱或其他服务中断。DNS 传播和第三方解析器行为不由 Rhoizos 完全控制。"],
  ["隐私保护","符合条件的域名在支持时默认开启隐私保护。部分注册局不允许或限制隐私服务。您仍需提供真实、准确的底层域名持有人资料。"],
  ["滥用与限制","为处理欺诈、滥用、安全事件、法律要求或域名政策违规，Rhoizos 可能在合理必要范围内限制访问、暂停操作，或与注册商、注册局及合法主管机构配合。"],
  ["退款","域名操作一旦提交注册局通常不可逆。是否可退款取决于操作是否已经提交、完成、被拒绝或仍可取消。区块链网络费用和第三方费用可能无法退回。"],
  ["服务变更","功能、服务提供商、价格和本条款可能调整。重大变化会通过本页面和更新日期反映。"],
  ["联系我们","条款相关问题请发送至 hello@rhoizos.com。"]
 ]
};
export default function Terms(){
 const {locale}=useI18n();const c=locale.startsWith("zh")?zh:en;
 return <article className="page legalPage"><p className="kicker">Rhoizos</p><h1 className="pageTitle">{c.title}</h1><p className="pageIntro">{c.intro}</p><p className="legalUpdated">{c.updated}</p><div className="legalSections">{c.sections.map(([h,p])=><section key={h}><h2>{h}</h2><p>{p}</p></section>)}</div></article>;
}
