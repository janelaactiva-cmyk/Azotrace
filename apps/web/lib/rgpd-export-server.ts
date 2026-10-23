import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import type {getSupabaseAdminClient} from '~/lib/supabase-admin';
import type {RgpdScope} from '~/lib/rgpd';
import {RgpdError} from '~/lib/rgpd-server';
type Database=ReturnType<typeof getSupabaseAdminClient>;
// Deliberately limited to this module. Never label this as an account-wide export.
export async function buildRgpdExport(db:Database,scope:RgpdScope,user:{id:string;name:string;email:string},input:Record<string,unknown>){
 if(Object.keys(input).some(k=>!['action','email','identity_verified','identity_method'].includes(k)))throw new RgpdError('Campos de exportação inválidos.');
 const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
 const method=typeof input.identity_method==='string'?input.identity_method.trim():'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new RgpdError('Indica um email válido.');
 if(input.identity_verified!==true||method.length<2||method.length>500)throw new RgpdError('Confirma a identidade do titular e regista o método utilizado.');
 const records:unknown[]=[];const audit:unknown[]=[];
 for(const kind of ['consents','requests'])for(let offset=0;;offset+=500){
  const result=await db.from('azotrace_rgpd_records').select('id,kind,data,version,created_at,updated_at').eq('scope_key',scope.key).eq('kind',kind).eq('data->>email',email).order('id').range(offset,offset+499);
  if(result.error)throw result.error;records.push(...result.data);if(result.data.length<500)break;if(offset>=9500)throw new RgpdError('Volume elevado: prepara a exportação com apoio do responsável técnico.',413);
 }
 for(let offset=0;;offset+=500){
  const result=await db.from('azotrace_rgpd_audit').select('id,kind,record_id,action,version,created_at,snapshot').eq('scope_key',scope.key).in('kind',['consents','requests']).eq('snapshot->>email',email).order('id').range(offset,offset+499);
  if(result.error)throw result.error;audit.push(...result.data);if(result.data.length<500)break;if(offset>=9500)throw new RgpdError('Histórico demasiado grande para esta exportação.',413);
 }
 const id=randomUUID(),createdAt=new Date().toISOString();
 const content=JSON.stringify({format:'azotrace-rgpd-register-v1',organization:scope.name,subject:email,generatedAt:createdAt,coverage:'Consentimentos, pedidos dos titulares e respetivo histórico, associados a este email, no RGPD desta organização.',excluded:['Dados de produção e outros módulos da aplicação','Anexos e documentos externos','Sistemas de terceiros','Registos associados a outros endereços de email'],reviewRequired:true,records,history:audit},null,2)+'\n';
 if(Buffer.byteLength(content,'utf8')>8000000)throw new RgpdError('Ficheiro demasiado grande para esta exportação.',413);
 const sha256=createHash('sha256').update(content,'utf8').digest('hex'),filename=`rgpd-${createdAt.slice(0,10)}-${id}.json`;
 const result=await db.rpc('az_rgpd_save',{p_scope:scope.key,p_company:scope.companyId,p_kind:'exports',p_id:id,p_data:{email,identity_method:method,filename,sha256,record_count:records.length,history_count:audit.length,coverage:'Apenas registos deste módulo de RGPD'},p_version:0,p_actor:user.id,p_actor_name:user.name||user.email,p_title:`Exportação de registos RGPD: ${email}`});
 if(result.error)throw result.error;return {scope,filename,content,sha256,record:result.data};
}
