import {ok} from "@/lib/http";

export const runtime="nodejs";

export async function GET(){
  return ok({
    status:"ok",
    configured:{
      database:Boolean(process.env.DATABASE_URL),
      namesilo:Boolean(process.env.NAMESILO_API_KEY),
      nowpayments:Boolean(process.env.NOWPAYMENTS_API_KEY&&process.env.NOWPAYMENTS_IPN_SECRET),
      dataKey:Boolean(process.env.RHOIZOS_DATA_KEY),
      cron:Boolean(process.env.CRON_SECRET)
    },
    live:{
      payments:process.env.RHOIZOS_LIVE_PAYMENTS==="1",
      registration:process.env.RHOIZOS_LIVE_REGISTRATION==="1"
    }
  });
}
