type IntelligenceBody={metric?:unknown;horizonDays?:unknown;values?:unknown[]};
function finite(values:unknown[]){return values.filter((v):v is number=>typeof v==="number"&&Number.isFinite(v)).slice(-90)}
function bodyOf(req:any):IntelligenceBody{if(!req.body)return {};if(typeof req.body!=="string")return req.body as IntelligenceBody;try{return JSON.parse(req.body||"{}") as IntelligenceBody}catch{return {}}}
export default function handler(req:any,res:any){
 if(req.method!=="POST")return res.status(405).json({error:"method_not_allowed"});
 const required=process.env.VEYRA_API_KEY;
 if(required&&req.headers.authorization!=="Bearer "+required)return res.status(401).json({error:"unauthorized"});
 const body=bodyOf(req);const values=finite(Array.isArray(body.values)?body.values:[]);
 if(values.length<2)return res.status(400).json({error:"at_least_two_numeric_values_required"});
 const rawHorizon=Number(body.horizonDays);const horizon=Math.max(1,Math.min(365,Number.isFinite(rawHorizon)&&rawHorizon>0?Math.floor(rawHorizon):30));
 const mean=values.reduce((a,b)=>a+b,0)/values.length;const trend=(values[values.length-1]-values[0])/Math.max(1,values.length-1);const projected=mean+trend*horizon;
 const confidence=Math.max(.45,Math.min(.9,.55+Math.min(.35,values.length/200)));
 return res.status(200).json({metric:String(body.metric||"metric").slice(0,100),horizonDays:horizon,forecast:{value:Number(projected.toFixed(4)),confidence:Number(confidence.toFixed(2))},method:"deterministic_baseline_v1",provenance:{modelVersion:"baseline-1",observations:values.length,generatedAt:new Date().toISOString()},disclaimer:"Decision-support output, not financial advice or a guarantee."});
}