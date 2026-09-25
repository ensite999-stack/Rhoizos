import type {Config} from "@netlify/functions";

export default async () => {
  const root=Netlify.env.get("RHOIZOS_APP_URL")?.replace(/\/+$/,"");
  const secret=Netlify.env.get("CRON_SECRET");
  if(!root||!secret) throw new Error("RHOIZOS_APP_URL or CRON_SECRET is not configured.");

  const response=await fetch(root+"/api/cron/reconcile",{
    method:"GET",
    headers:{authorization:"Bearer "+secret},
    signal:AbortSignal.timeout(25000)
  });
  if(!response.ok) throw new Error("Reconciliation endpoint returned HTTP "+response.status+".");
};

export const config:Config={schedule:"@hourly"};
