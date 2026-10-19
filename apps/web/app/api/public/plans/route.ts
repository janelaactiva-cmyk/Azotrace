import { createHash } from 'node:crypto';
import { getPlanCatalog } from '~/lib/plan-catalog-server';
export async function GET(request:Request){
 const matched=request.headers.get('if-none-match');
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'ETag','Cache-Control':'no-cache','Vary':'If-None-Match'};
 try{const catalog=await getPlanCatalog();const body=JSON.stringify(catalog),etag='"'+createHash('sha256').update(body).digest('hex')+'"';
 if(matched===etag)return new Response(null,{status:304,headers:{...headers,ETag:etag}});
 return new Response(body,{headers:{...headers,ETag:etag,'Content-Type':'application/json; charset=utf-8'}});
 }catch{return Response.json({error:'Preçário indisponível.'},{status:503,headers});}
}
export function OPTIONS(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'If-None-Match','Access-Control-Max-Age':'86400'}});}
