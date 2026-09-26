export function requiredEnv(name:string):string{
  const value=process.env[name]?.trim();
  if(!value) throw new Error(`${name} is not configured.`);
  return value;
}
export function appUrl(){return requiredEnv("RHOIZOS_APP_URL").replace(/\/+$/,"");}
export function livePayments(){return process.env.RHOIZOS_LIVE_PAYMENTS==="1";}
export function liveRegistration(){return process.env.RHOIZOS_LIVE_REGISTRATION==="1";}

export function liveDropcatch(){return process.env.RHOIZOS_LIVE_DROPCATCH==="1";}
