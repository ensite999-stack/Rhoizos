import {createCipheriv,createDecipheriv,randomBytes} from "node:crypto";
import {requiredEnv} from "./env";

function key(){
  const value=Buffer.from(requiredEnv("RHOIZOS_DATA_KEY"),"base64");
  if(value.length!==32) throw new Error("RHOIZOS_DATA_KEY must decode to exactly 32 bytes.");
  return value;
}

export function sealSecret(plaintext:string){
  const iv=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",key(),iv);
  const ciphertext=Buffer.concat([cipher.update(plaintext,"utf8"),cipher.final()]);
  return [iv,cipher.getAuthTag(),ciphertext].map(x=>x.toString("base64url")).join(".");
}

export function openSecret(value:string){
  const [ivText,tagText,cipherText]=value.split(".");
  if(!ivText||!tagText||!cipherText) throw new Error("Encrypted secret is invalid.");
  const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(ivText,"base64url"));
  decipher.setAuthTag(Buffer.from(tagText,"base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherText,"base64url")),
    decipher.final()
  ]).toString("utf8");
}
