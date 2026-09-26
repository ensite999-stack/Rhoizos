import type {Locale} from "./i18n";

const en:Record<string,string>={
  "title":"Rhoizos Admin","subtitle":"Operations, customers, Domains and pricing.",
  "overview":"Overview","users":"Users","domains":"Domains","orders":"Orders","operations":"Operations","pricing":"Pricing","settings":"Settings","signOut":"Sign out",
  "overview.copy":"Current Rhoizos operations at a glance.","users.copy":"Customer accounts and ownership activity.",
  "domains.copy":"Registered and transferred Domain inventory.","orders.copy":"Payment and provisioning state for every registrar order.",
  "operations.copy":"Registrar-side asynchronous work and failures.","pricing.copy":"Provider cost plus one fixed USD margin for registration, renewal and transfer.",
  "settings.copy":"Runtime status and recent administrative changes.","needsAttention":"Needs attention","openOperations":"Open operations","recentOrders":"Recent orders",
  "user":"User","country":"Country","status":"Status","created":"Created","customer":"Customer","type":"Type","amount":"Amount","payment":"Payment",
  "owner":"Owner","expires":"Expires","transferLock":"Transfer lock","updated":"Updated","error":"Error","operation":"Operation","providerId":"Provider ID","order":"Order","operationStatus":"Operation status",
  "active":"Active","disabled":"Disabled","enable":"Enable","disable":"Disable","locked":"Locked","unlocked":"Unlocked",
  "environment":"Environment","auditLog":"Audit log","supportEmail":"Support email","configured":"Configured / on","notConfigured":"Not configured / off",
  "adminEmail":"Admin email","password":"Password","signIn":"Sign in","signingIn":"Signing in…","loginFailed":"Login failed.",
  "loadingPricing":"Loading pricing…","pricingPolicy":"Pricing policy","pricingFormula":"Customer price = registrar cost + payment processing fee + $1.00.","pricingPriority":"Cost + payment fee + $1","paymentFeeRate":"Payment fee allowance","serviceMargin":"Service margin",
  "minimumMargin":"Minimum margin","saveGlobal":"Save global","saving":"Saving…","tldPricing":"TLD pricing",
  "costRegister":"Cost register","costRenew":"Cost renew","costTransfer":"Cost transfer",
  "markupRegister":"Markup R","markupRenew":"Markup N","markupTransfer":"Markup T","overrideRegister":"Override R","overrideRenew":"Override N","overrideTransfer":"Override T",
  "featured":"Featured","effective":"Effective / Save","save":"Save","global":"global","none":"none","loadPricingFailed":"Could not load pricing.","saveFailed":"Save failed."
};

const zhCN={...en,
  "subtitle":"运营、用户、域名与价格管理。","overview":"概览","users":"用户","domains":"域名","orders":"订单","operations":"操作","pricing":"价格","settings":"设置","signOut":"退出登录",
  "overview.copy":"快速查看 Rhoizos 当前运营状态。","users.copy":"用户账户与域名归属活动。","domains.copy":"已注册和已转入的域名库存。",
  "orders.copy":"每笔注册商订单的支付与交付状态。","operations.copy":"注册商侧异步操作与失败记录。","pricing.copy":"管理注册成本。客户价格按照固定规则自动计算。",
  "settings.copy":"运行环境状态与最近的管理员变更。","needsAttention":"需要处理","openOperations":"进行中的操作","recentOrders":"最近订单",
  "user":"用户","country":"国家","status":"状态","created":"创建时间","customer":"客户","type":"类型","amount":"金额","payment":"支付",
  "owner":"所有者","expires":"到期","transferLock":"转移锁","updated":"更新时间","error":"错误","operation":"操作","providerId":"上游 ID","order":"订单","operationStatus":"操作状态",
  "active":"启用","disabled":"已禁用","enable":"启用","disable":"禁用","locked":"已锁定","unlocked":"未锁定",
  "environment":"运行环境","auditLog":"审计日志","supportEmail":"支持邮箱","configured":"已配置 / 已开启","notConfigured":"未配置 / 未开启",
  "adminEmail":"管理员邮箱","password":"密码","signIn":"登录","signingIn":"正在登录…","loginFailed":"登录失败。",
  "loadingPricing":"正在加载价格…","pricingPolicy":"定价规则","pricingFormula":"客户价格 = 注册成本 + 支付手续费 + 1.00 美元。","pricingPriority":"成本 + 支付手续费 + 1 美元","paymentFeeRate":"支付手续费预留","serviceMargin":"服务利润",
  "minimumMargin":"最低利润","saveGlobal":"保存全局设置","saving":"正在保存…","tldPricing":"TLD 价格",
  "costRegister":"注册成本","costRenew":"续费成本","costTransfer":"转入成本",
  "markupRegister":"注册加价","markupRenew":"续费加价","markupTransfer":"转入加价","overrideRegister":"注册固定价","overrideRenew":"续费固定价","overrideTransfer":"转入固定价",
  "featured":"首页展示","effective":"实际售价 / 保存","save":"保存","global":"全局","none":"无","loadPricingFailed":"无法加载价格。","saveFailed":"保存失败。"
};
const zhTW={...zhCN,
  "subtitle":"營運、使用者、網域與價格管理。","overview":"概覽","users":"使用者","domains":"網域","orders":"訂單","operations":"操作","pricing":"價格","settings":"設定","signOut":"登出",
  "overview.copy":"快速查看 Rhoizos 目前營運狀態。","users.copy":"使用者帳戶與網域歸屬活動。","domains.copy":"已註冊和已轉入的網域庫存。",
  "orders.copy":"每筆註冊商訂單的付款與交付狀態。","operations.copy":"註冊商端非同步操作與失敗記錄。","pricing.copy":"管理上游成本；註冊、續費和轉入統一使用固定美元加價。",
  "settings.copy":"執行環境狀態與最近的管理員變更。","needsAttention":"需要處理","openOperations":"進行中的操作","recentOrders":"最近訂單",
  "user":"使用者","country":"國家","status":"狀態","created":"建立時間","customer":"客戶","type":"類型","amount":"金額","payment":"付款",
  "owner":"所有者","expires":"到期","transferLock":"轉移鎖","updated":"更新時間","error":"錯誤","operation":"操作","providerId":"上游 ID","order":"訂單","operationStatus":"操作狀態",
  "active":"啟用","disabled":"已停用","enable":"啟用","disable":"停用","locked":"已鎖定","unlocked":"未鎖定",
  "environment":"執行環境","auditLog":"稽核日誌","supportEmail":"支援信箱","configured":"已設定 / 已開啟","notConfigured":"未設定 / 未開啟",
  "adminEmail":"管理員信箱","password":"密碼","signIn":"登入","signingIn":"正在登入…","loginFailed":"登入失敗。",
  "loadingPricing":"正在載入價格…","pricingPolicy":"定價規則","pricingFormula":"客戶價格 = 註冊成本 + 支付手續費 + 1.00 美元。","pricingPriority":"成本 + 支付手續費 + 1 美元","paymentFeeRate":"支付手續費預留","serviceMargin":"服務利潤",
  "minimumMargin":"最低利潤","saveGlobal":"儲存全域設定","saving":"正在儲存…","tldPricing":"TLD 價格",
  "costRegister":"註冊成本","costRenew":"續費成本","costTransfer":"轉入成本",
  "markupRegister":"註冊加價","markupRenew":"續費加價","markupTransfer":"轉入加價","overrideRegister":"註冊固定價","overrideRenew":"續費固定價","overrideTransfer":"轉入固定價",
  "featured":"首頁顯示","effective":"實際售價 / 儲存","save":"儲存","global":"全域","none":"無","loadPricingFailed":"無法載入價格。","saveFailed":"儲存失敗。"
};
const fr={...en,
  "subtitle":"Opérations, clients, domaines et tarification.","overview":"Aperçu","users":"Utilisateurs","domains":"Domaines","orders":"Commandes","operations":"Opérations","pricing":"Tarifs","settings":"Réglages","signOut":"Déconnexion",
  "overview.copy":"Vue d’ensemble des opérations Rhoizos.","users.copy":"Comptes clients et activité de propriété.","domains.copy":"Inventaire des domaines enregistrés et transférés.",
  "orders.copy":"État du paiement et du provisioning pour chaque commande.","operations.copy":"Opérations asynchrones côté registrar et échecs.","pricing.copy":"Coût fournisseur plus une marge fixe en USD pour l’enregistrement, le renouvellement et le transfert.",
  "settings.copy":"État d’exécution et modifications administratives récentes.","needsAttention":"À traiter","openOperations":"Opérations ouvertes","recentOrders":"Commandes récentes",
  "user":"Utilisateur","country":"Pays","status":"Statut","created":"Créé","customer":"Client","type":"Type","amount":"Montant","payment":"Paiement",
  "owner":"Propriétaire","expires":"Expiration","transferLock":"Verrou de transfert","updated":"Mis à jour","error":"Erreur","operation":"Opération","providerId":"ID fournisseur","order":"Commande","operationStatus":"Statut opération",
  "active":"Actif","disabled":"Désactivé","enable":"Activer","disable":"Désactiver","locked":"Verrouillé","unlocked":"Déverrouillé",
  "environment":"Environnement","auditLog":"Journal d’audit","supportEmail":"E-mail assistance","configured":"Configuré / actif","notConfigured":"Non configuré / inactif",
  "adminEmail":"E-mail administrateur","password":"Mot de passe","signIn":"Connexion","signingIn":"Connexion…","loginFailed":"Échec de la connexion.",
  "loadingPricing":"Chargement des tarifs…","pricingPolicy":"Règle tarifaire","pricingFormula":"Prix client = coût d’enregistrement + frais de paiement + 1,00 $.","pricingPriority":"Coût + frais de paiement + 1 $","paymentFeeRate":"Provision frais de paiement","serviceMargin":"Marge de service",
  "minimumMargin":"Marge minimale","saveGlobal":"Enregistrer global","saving":"Enregistrement…","tldPricing":"Tarifs TLD",
  "costRegister":"Coût enregistrement","costRenew":"Coût renouvellement","costTransfer":"Coût transfert",
  "markupRegister":"Marge R","markupRenew":"Marge N","markupTransfer":"Marge T","overrideRegister":"Prix fixe R","overrideRenew":"Prix fixe N","overrideTransfer":"Prix fixe T",
  "featured":"Mis en avant","effective":"Prix effectif / Enregistrer","save":"Enregistrer","global":"global","none":"aucun","loadPricingFailed":"Impossible de charger les tarifs.","saveFailed":"Échec de l’enregistrement."
};
const es={...en,
  "subtitle":"Operaciones, clientes, dominios y precios.","overview":"Resumen","users":"Usuarios","domains":"Dominios","orders":"Pedidos","operations":"Operaciones","pricing":"Precios","settings":"Ajustes","signOut":"Cerrar sesión",
  "overview.copy":"Vista rápida de las operaciones actuales de Rhoizos.","users.copy":"Cuentas de clientes y actividad de propiedad.","domains.copy":"Inventario de dominios registrados y transferidos.",
  "orders.copy":"Estado de pago y aprovisionamiento de cada pedido.","operations.copy":"Operaciones asíncronas del registrador y errores.","pricing.copy":"Coste del proveedor más un margen fijo en USD para registro, renovación y transferencia.",
  "settings.copy":"Estado de ejecución y cambios administrativos recientes.","needsAttention":"Requiere atención","openOperations":"Operaciones abiertas","recentOrders":"Pedidos recientes",
  "user":"Usuario","country":"País","status":"Estado","created":"Creado","customer":"Cliente","type":"Tipo","amount":"Importe","payment":"Pago",
  "owner":"Propietario","expires":"Caduca","transferLock":"Bloqueo de transferencia","updated":"Actualizado","error":"Error","operation":"Operación","providerId":"ID proveedor","order":"Pedido","operationStatus":"Estado operación",
  "active":"Activo","disabled":"Desactivado","enable":"Activar","disable":"Desactivar","locked":"Bloqueado","unlocked":"Desbloqueado",
  "environment":"Entorno","auditLog":"Registro de auditoría","supportEmail":"Correo de soporte","configured":"Configurado / activo","notConfigured":"No configurado / inactivo",
  "adminEmail":"Correo administrador","password":"Contraseña","signIn":"Iniciar sesión","signingIn":"Iniciando sesión…","loginFailed":"Error al iniciar sesión.",
  "loadingPricing":"Cargando precios…","pricingPolicy":"Regla de precios","pricingFormula":"Precio al cliente = coste de registro + comisión de pago + $1,00.","pricingPriority":"Coste + comisión de pago + $1","paymentFeeRate":"Reserva de comisión de pago","serviceMargin":"Margen de servicio",
  "minimumMargin":"Margen mínimo","saveGlobal":"Guardar global","saving":"Guardando…","tldPricing":"Precios TLD",
  "costRegister":"Coste registro","costRenew":"Coste renovación","costTransfer":"Coste transferencia",
  "markupRegister":"Margen R","markupRenew":"Margen N","markupTransfer":"Margen T","overrideRegister":"Precio fijo R","overrideRenew":"Precio fijo N","overrideTransfer":"Precio fijo T",
  "featured":"Destacado","effective":"Precio efectivo / Guardar","save":"Guardar","global":"global","none":"ninguno","loadPricingFailed":"No se pudieron cargar los precios.","saveFailed":"Error al guardar."
};

const dictionaries:Record<Locale,Record<string,string>>={
  "en-US":en,"en-GB":en,"zh-CN":zhCN,"zh-TW":zhTW,"fr-FR":fr,"es-ES":es
};

export function adminTranslate(locale:Locale,key:string){
  return dictionaries[locale][key]??en[key]??key;
}
