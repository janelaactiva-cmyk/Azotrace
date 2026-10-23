import { verifiedOnlineUser } from '../_lib/online-auth';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import { validatePlatformSettings } from '~/lib/platform-settings';
import { POST as testRenewalEmail } from '../../cron/verificar-expiracoes/route';
async function authorize(request:Request){
 try{const user=await verifiedOnlineUser(request);if(!user.active||user.role!=='superadmin')return{response:Response.json({error:'Esta configuração é exclusiva do Super Admin.'},{status:403})};return{user};}
 catch{return{response:Response.json({error:'Inicia sessão e confirma o MFA, se estiver ativo.'},{status:401})};}
}
export async function GET(request:Request){
 const auth=await authorize(request);if(auth.response)return auth.response;
 if(new URL(request.url).searchParams.get('section')==='services')return Response.json({stripe:!!process.env.STRIPE_SECRET_KEY,resend:!!process.env.RESEND_API_KEY,supabase:!!process.env.NEXT_PUBLIC_SUPABASE_URL&&!!process.env.SUPABASE_SERVICE_ROLE_KEY,cron:!!process.env.CRON_SECRET,test_email:process.env.RENEWAL_TEST_EMAIL||'',sender:process.env.RENEWAL_EMAIL_FROM||'Azotrace <no-reply@azotrace.com>'},{headers:{'Cache-Control':'no-store'}});
 try{const{data,error}=await getSupabaseAdminClient().from('azotrace_platform_settings').select('site_name,description,contact_email,version,updated_at').eq('id','platform').single();if(error||!data)throw new Error();return Response.json(data,{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Não foi possível carregar os dados. Confirma a migração das configurações no Supabase.'},{status:503});}
}
export async function PUT(request:Request){
 const auth=await authorize(request);if(auth.response)return auth.response;
 let settings;try{settings=validatePlatformSettings(await request.json());}catch(cause){return Response.json({error:cause instanceof Error?cause.message:'Dados inválidos.'},{status:400});}
 try{const{data,error}=await getSupabaseAdminClient().from('azotrace_platform_settings').update({...settings,version:settings.version+1,updated_at:new Date().toISOString(),updated_by:auth.user!.id}).eq('id','platform').eq('version',settings.version).select('site_name,description,contact_email,version,updated_at').maybeSingle();if(error)throw new Error();if(!data)return Response.json({error:'Outro administrador alterou estes dados. Recarrega antes de guardar.'},{status:409});return Response.json(data);}
 catch{return Response.json({error:'Não foi possível guardar os dados no Supabase.'},{status:503});}
}
export async function POST(request:Request){
 const auth=await authorize(request);if(auth.response)return auth.response;
 const body=await request.json().catch(()=>null);
 if(!body||![15,10,5].includes(body.days)||typeof body.send!=='boolean')return Response.json({error:'Escolhe o aviso de 15, 10 ou 5 dias.'},{status:400});
 // CRON_SECRET stays on the server; invoke the existing test implementation.
 return testRenewalEmail(new Request('http://internal/api/cron/verificar-expiracoes',{method:'POST',headers:{Authorization:`Bearer ${process.env.CRON_SECRET||''}`,'Content-Type':'application/json'},body:JSON.stringify({days:body.days,send:body.send})}));
}
