import {rgpdActor,rgpdBody,rgpdFailure,rgpdReply,RgpdError,rgpdUuid} from '~/lib/rgpd-server';
import {rgpdKind,rgpdDefinitions,rgpdYearBounds,validateRgpdData} from '~/lib/rgpd';
import {buildRgpdExport} from '~/lib/rgpd-export-server';
export async function GET(request:Request){try{
 const {scope,db}=await rgpdActor(request),url=new URL(request.url);const kind=url.searchParams.get('kind');
 if(url.searchParams.has('context'))return rgpdReply({scope});
 const offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0||offset>1000000)throw new RgpdError('Página inválida.');
 const search=(url.searchParams.get('q')||'').trim();if(search.length>120)throw new RgpdError('Pesquisa demasiado longa.');
 if(kind==='history'){
  const auditId=url.searchParams.get('audit_id');if(auditId){if(!/^\d{1,18}$/.test(auditId))throw new RgpdError('Registo inválido.');const result=await db.from('azotrace_rgpd_audit').select('id,kind,record_id,title,action,version,actor_name,created_at,snapshot').eq('scope_key',scope.key).eq('id',auditId).maybeSingle();if(result.error)throw result.error;if(!result.data)throw new RgpdError('Registo não encontrado.',404);return rgpdReply({scope,event:result.data});}
  const year=Number(url.searchParams.get('year'));if(!Number.isSafeInteger(year)||year<2000||year>2100)throw new RgpdError('Ano inválido.');const [from,to]=rgpdYearBounds(year);
  const result=await db.from('azotrace_rgpd_audit').select('id,kind,record_id,title,action,version,actor_name,created_at').eq('scope_key',scope.key).gte('created_at',from).lt('created_at',to).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+99);if(result.error)throw result.error;return rgpdReply({scope,events:result.data,hasMore:result.data.length===100});
 }
 if(!rgpdKind(kind)&&kind!=='exports')throw new RgpdError('Área de RGPD inválida.');
 let query=db.from('azotrace_rgpd_records').select('id,kind,data,version,created_at,updated_at').eq('scope_key',scope.key).eq('kind',kind);
 if(search)query=query.ilike('search_text','%'+search.replace(/[\\%_]/g,'\\$&')+'%');
 const result=await query.order('updated_at',{ascending:false}).order('id').range(offset,offset+99);if(result.error)throw result.error;return rgpdReply({scope,records:result.data,hasMore:result.data.length===100});
 }catch(error){return rgpdFailure(error);}}
export async function POST(request:Request){try{
 const {user,scope,db}=await rgpdActor(request),input=await rgpdBody(request);
 if(input.action==='export')return rgpdReply(await buildRgpdExport(db,scope,user,input));
 if(input.action!=='save'||!rgpdKind(input.kind))throw new RgpdError('Operação inválida.');
 if(Object.keys(input).some(k=>!['action','id','kind','data','version'].includes(k)))throw new RgpdError('O âmbito do RGPD é definido pela sessão, não pelo formulário.',403);
 if(typeof input.id!=='string'||!rgpdUuid.test(input.id)||!Number.isInteger(input.version)||Number(input.version)<0||Number(input.version)>=2147483647)throw new RgpdError('Identificador ou versão inválidos.');
 let data;try{data=validateRgpdData(input.kind,input.data);}catch(error){throw new RgpdError(error instanceof Error?error.message:'Dados inválidos.');}
 const title=String(data[rgpdDefinitions[input.kind].titleField]||rgpdDefinitions[input.kind].title);
 const result=await db.rpc('az_rgpd_save',{p_scope:scope.key,p_company:scope.companyId,p_kind:input.kind,p_id:input.id,p_data:data,p_version:input.version,p_actor:user.id,p_actor_name:user.name||user.email,p_title:title});if(result.error)throw result.error;
 return rgpdReply({scope,record:result.data});
 }catch(error){return rgpdFailure(error);}}
