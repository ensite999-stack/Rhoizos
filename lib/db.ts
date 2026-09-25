import postgres from "postgres";
import {requiredEnv} from "./env";

let client:ReturnType<typeof postgres>|undefined;

export function db(){
  if(!client){
    client=postgres(requiredEnv("DATABASE_URL"),{
      max:1,
      idle_timeout:20,
      connect_timeout:10,
      prepare:false,
      ssl:process.env.NODE_ENV==="production"?"require":undefined
    });
  }
  return client;
}
