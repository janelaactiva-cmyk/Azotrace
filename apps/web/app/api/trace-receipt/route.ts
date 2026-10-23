import {randomInt} from 'node:crypto';
import {Resend} from 'resend';
import {getSupabaseAdminClient} from '~/lib/supabase-admin';
import {TraceError,traceBody,traceDbError,traceFailure,traceReply,receiptHash,receiptToken,receiptUrl} from '~/lib/trace-receipts-server';
import {receiptQuantity} from '~/lib/trace-receipts';
const reasons:Record<string,string>={expired:'Este link expirou ou não é válido. Pede um novo link ao remetente.',closed:'Esta entrega já foi concluída ou cancelada.',rate_limit:'Aguarda um minuto antes de pedir outro código. Após dez envios é necessário um novo link.',code_expired:'Pede um novo código de confirmação.',code_invalid:'Código incorreto. Tens no máximo cinco tentativas por código.',invalid:'Confirma o nome, a quantidade e as observações.'};
export async function POST(request:Request){try{
 const body=await traceBody(request);
 // O QR público nunca contém o segredo de confirmação nem expõe contactos.
 if(body.action==='request-from-qr'){
  const email=String(body.email||'').trim().toLowerCase(),businessId=String(body.businessId||''),batchId=String(body.batchId||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!businessId||businessId.length>200||!batchId||batchId.length>200)throw new TraceError('Indica um email válido e lê novamente o QR do lote.');
  const generic=()=>traceReply({ok:true,message:'Se existir uma entrega pendente para este email e lote, receberás as instruções de confirmação.'});
  const db=getSupabaseAdminClient(),found=await db.from('az_trace_shipments').select('id,token_hash,expires_at').eq('business_id',businessId).eq('batch_id',batchId).eq('recipient_email',email).eq('status','awaiting').order('created_at',{ascending:false}).limit(1).maybeSingle();traceDbError(found.error);
  const item=found.data;if(!item||Date.parse(item.expires_at)<=Date.now())return generic();
  const token=receiptToken(item.id);if(receiptHash(token)!==item.token_hash)return generic();
  if(!process.env.RESEND_API_KEY)throw new TraceError('O envio de códigos não está disponível. Contacta o remetente.',503);
  const code=String(randomInt(100000,1000000)),issued=await db.rpc('az_trace_issue_code',{p_token_hash:item.token_hash,p_code_hash:receiptHash(token+':'+code)});traceDbError(issued.error);
  if(!issued.data?.ok)return generic();
  const link=receiptUrl(request,token).link;
  const sent=await new Resend(process.env.RESEND_API_KEY).emails.send({from:process.env.TRACE_RECEIPT_FROM||'Azotrace <no-reply@azotrace.com>',to:email,subject:'Azotrace — confirmar a receção do lote',text:`Foi pedida a confirmação de uma entrega através do QR Code do lote.\n\nAbre a página privada: ${link}\nCódigo: ${code}\n\nO código é válido durante 10 minutos. Na página, escolhe «Já tenho um código», confere o lote e indica a quantidade realmente recebida. Se não fizeste este pedido, ignora a mensagem.`});
  if(sent.error)throw new TraceError('Não foi possível enviar as instruções. Aguarda um minuto e tenta novamente.',503);
  return generic();
 }
 const token=body.token;
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw new TraceError('Link de receção inválido.',404);
 const hash=receiptHash(token),db=getSupabaseAdminClient();
 const result=await db.from('az_trace_shipments').select('id,batch_code,product_name,sender_company,recipient_org,recipient_email,quantity,unit,step,status,expires_at,confirmed_at,received_quantity').eq('token_hash',hash).maybeSingle();traceDbError(result.error);
 const item=result.data;if(!item||Date.parse(item.expires_at)<=Date.now())throw new TraceError(reasons.expired!,410);
 if(body.action==='lookup')return traceReply({shipment:{batchCode:item.batch_code,product:item.product_name,sender:item.sender_company,destination:item.recipient_org,quantity:Number(item.quantity),unit:item.unit,step:item.step,status:item.status,confirmedAt:item.confirmed_at,receivedQuantity:item.received_quantity===null?null:Number(item.received_quantity),emailHint:item.recipient_email.replace(/^(.{1,2}).*(@.*)$/,'$1…$2')}});
 if(item.status!=='awaiting')throw new TraceError(reasons.closed!,409);
 if(body.action==='code'){
  if(!process.env.RESEND_API_KEY)throw new TraceError('O envio de códigos não está disponível. Contacta o remetente.',503);
  const code=String(randomInt(100000,1000000)),issued=await db.rpc('az_trace_issue_code',{p_token_hash:hash,p_code_hash:receiptHash(token+':'+code)});traceDbError(issued.error);
  if(!issued.data?.ok)throw new TraceError(reasons[issued.data?.reason]||'Não foi possível emitir o código.',429);
  const sent=await new Resend(process.env.RESEND_API_KEY).emails.send({from:process.env.TRACE_RECEIPT_FROM||'Azotrace <no-reply@azotrace.com>',to:item.recipient_email,subject:'Azotrace — código para confirmar a receção do lote',text:`O teu código de confirmação é ${code}.\n\nLote: ${item.batch_code}\nDestinatário: ${item.recipient_org}\n\nO código é válido durante 10 minutos. Só confirmes depois de conferires a entrega. Se não pediste este código, ignora esta mensagem.`});
  if(sent.error)throw new TraceError('Não foi possível enviar o código. Aguarda um minuto e tenta novamente.',503);
  return traceReply({ok:true});
 }
 if(body.action==='confirm'){
  const code=String(body.code||''),name=String(body.name||'').trim(),notes=String(body.notes||'').trim();
  if(!/^\d{6}$/.test(code)||name.length<2||name.length>120||notes.length>1000||typeof body.accept!=='boolean')throw new TraceError('Confirma o nome, o código e a decisão.');
  let quantity:number;try{quantity=body.accept?receiptQuantity(body.quantity):0}catch{throw new TraceError('Indica a quantidade recebida.');}
  const accepted=await db.rpc('az_trace_confirm',{p_token_hash:hash,p_code_hash:receiptHash(token+':'+code),p_name:name,p_quantity:quantity,p_notes:notes,p_accept:body.accept});traceDbError(accepted.error);
  if(!accepted.data?.ok)throw new TraceError(reasons[accepted.data?.reason]||'Não foi possível confirmar.',accepted.data?.reason==='closed'?409:400);
  return traceReply(accepted.data);
 }
 throw new TraceError('Ação inválida.');
}catch(error){return traceFailure(error)}}
