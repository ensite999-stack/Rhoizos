import {NextResponse} from "next/server";

export function ok(data:unknown,status=200){return NextResponse.json(data,{status});}
export function fail(error:unknown){
  const message=error instanceof Error?error.message:"Request failed.";
  if(message==="AUTH_REQUIRED") return NextResponse.json({error:"Authentication required."},{status:401});
  if(message==="ADMIN_REQUIRED") return NextResponse.json({error:"Administrator authentication required."},{status:401});
  if(message==="RECENT_AUTH_REQUIRED") return NextResponse.json({error:"Please log in again before revealing the Auth Code."},{status:403});
  return NextResponse.json({error:message},{status:400});
}
