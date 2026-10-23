import { verifiedOnlineUser } from '../_lib/online-auth';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import { validatePrivacyInput, PLATFORM_PRIVACY_ID } from '~/lib/company-privacy';
const columns = 'company_id,draft_content,published_content,version,updated_at,published_at';
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
async function actor(request: Request) {
 if(request.headers.get('x-azotrace-user-id'))return {response:reply({error:'O RGPD é gerido apenas pela conta titular, fora do modo de impersonação.'},403)};
 try {
  const user = await verifiedOnlineUser(request);
  if (!user.active || !(user.role === 'superadmin' || user.role === 'admin' || user.permissions.includes('rgpd.manage'))) return { response: reply({error:'Sem permissão para gerir a política.'},403) };
  return { user };
 } catch { return { response: reply({error:'Inicia sessão e confirma o MFA, se estiver ativo.'},401) }; }
}
function unavailable(error?: {code?: string} | null) { return reply({error: error?.code === '42P01' || error?.code === 'PGRST205' ? 'Executa a migração das políticas por empresa no Supabase antes de guardar.' : 'Não foi possível consultar ou guardar a política. Tenta novamente.'},503); }
export async function GET(request: Request) {
 const auth = await actor(request); if (auth.response) return auth.response;
 const user = auth.user!;
 const companyId = new URL(request.url).searchParams.get('company');
 if(user.role==='superadmin')return platformRequest(request,companyId);
 if(companyId===PLATFORM_PRIVACY_ID)return reply({error:'A política da Azotrace só pode ser gerida pelo Super Admin.'},403);
 if (companyId && user.companyId !== companyId) return reply({error:'Esta política pertence a outra empresa.'},403);
 try {
  const admin = getSupabaseAdminClient();
  if (!companyId) {
   if (!user.companyId) return reply({companies:[]});
   const companies: {id:string;name:string;active:boolean}[] = [];
   for (let offset=0;;offset+=500) {
    let query = admin.from('azotrace_companies').select('id,name,active').order('id');
    query = query.eq('id',user.companyId!);
    const result = await query.range(offset,offset+499);
    if (result.error) return unavailable(result.error);
    companies.push(...result.data || []);
    if (!result.data || result.data.length < 500) break;
   }
   return reply({companies});
  }
  const company = await admin.from('azotrace_companies').select('id,name,active').eq('id',companyId).maybeSingle();
  if (company.error) return unavailable(company.error);
  if (!company.data) return reply({error:'Empresa não encontrada.'},404);
  if (!company.data.active) return reply({error:'A empresa está suspensa.'},403);
  const policy = await admin.from('azotrace_company_privacy').select(columns).eq('company_id',companyId).maybeSingle();
  if (policy.error) return unavailable(policy.error);
  return reply({company:company.data,policy:policy.data || {company_id:companyId,draft_content:'',published_content:null,version:0,updated_at:null,published_at:null}});
 } catch { return unavailable(); }
}
export async function PUT(request: Request) {
 const auth = await actor(request); if (auth.response) return auth.response;
 let input;
 try { input = validatePrivacyInput(await request.json()); } catch (cause) { return reply({error:cause instanceof Error ? cause.message : 'Dados inválidos.'},400); }
 const user = auth.user!;
 if(user.role==='superadmin')return platformWrite(input,user.id);
 if(input.companyId===PLATFORM_PRIVACY_ID)return reply({error:'A política da Azotrace só pode ser gerida pelo Super Admin.'},403);
 if (user.companyId !== input.companyId) return reply({error:'Esta política pertence a outra empresa.'},403);
 try {
  const admin = getSupabaseAdminClient();
  const company = await admin.from('azotrace_companies').select('id,active').eq('id',input.companyId).maybeSingle();
  if (company.error) return unavailable(company.error);
  if (!company.data) return reply({error:'Empresa não encontrada.'},404);
  if (!company.data.active) return reply({error:'A empresa está suspensa.'},403);
  const now = new Date().toISOString();
  const patch = {draft_content:input.content,version:input.version+1,updated_at:now,updated_by:user.id,...(input.action === 'publish' ? {published_content:input.content,published_at:now} : {})};
  const result = input.version === 0
   ? await admin.from('azotrace_company_privacy').insert({company_id:input.companyId,...patch}).select(columns).single()
   : await admin.from('azotrace_company_privacy').update(patch).eq('company_id',input.companyId).eq('version',input.version).select(columns).maybeSingle();
  if (result.error?.code === '23505' || !result.error && !result.data) return reply({error:'Outra pessoa alterou esta política. Copia o teu texto e recarrega antes de guardar.'},409);
  if (result.error) return unavailable(result.error);
  return reply({policy:result.data});
 } catch { return unavailable(); }
}

async function platformRequest(request:Request,id:string|null){
 if(!id)return reply({companies:[{id:PLATFORM_PRIVACY_ID,name:'Azotrace',active:true}]});
 if(id!==PLATFORM_PRIVACY_ID)return reply({error:'O Super Admin gere apenas o RGPD da Azotrace.'},403);
 try{const result=await getSupabaseAdminClient().from('azotrace_platform_privacy').select(columns).eq('company_id',PLATFORM_PRIVACY_ID).maybeSingle();
 if(result.error)return unavailable(result.error);
 return reply({company:{id:PLATFORM_PRIVACY_ID,name:'Azotrace',active:true},policy:result.data||{company_id:PLATFORM_PRIVACY_ID,draft_content:'',published_content:null,version:0,updated_at:null,published_at:null}});
 }catch{return unavailable();}
}
async function platformWrite(input:ReturnType<typeof validatePrivacyInput>,actorId:string){
 if(input.companyId!==PLATFORM_PRIVACY_ID)return reply({error:'O Super Admin gere apenas o RGPD da Azotrace.'},403);
 try{const admin=getSupabaseAdminClient(),now=new Date().toISOString();
 const patch={draft_content:input.content,version:input.version+1,updated_at:now,updated_by:actorId,...(input.action==='publish'?{published_content:input.content,published_at:now}:{})};
 const result=input.version===0?await admin.from('azotrace_platform_privacy').insert({company_id:PLATFORM_PRIVACY_ID,...patch}).select(columns).single():await admin.from('azotrace_platform_privacy').update(patch).eq('company_id',PLATFORM_PRIVACY_ID).eq('version',input.version).select(columns).maybeSingle();
 if(result.error?.code==='23505'||!result.error&&!result.data)return reply({error:'A política mudou. Copia o teu texto e recarrega antes de guardar.'},409);
 if(result.error)return unavailable(result.error);
 return reply({policy:result.data});
 }catch{return unavailable();}
}


