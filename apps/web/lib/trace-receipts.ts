export type ReceiptStep='warehouse'|'supermarket';
export type Shipment={id:string;business_id:string;batch_id:string;step:ReceiptStep;recipient_org:string;recipient_email:string;quantity:number;unit:string;status:'awaiting'|'received'|'rejected'|'cancelled';created_at:string;expires_at:string;confirmed_at:string|null;receiver_name:string|null;received_quantity:number|null;receiver_notes:string|null};
export const receiptSteps:Record<ReceiptStep,string>={warehouse:'Armazém',supermarket:'Supermercado'};
export const receiptStatuses={awaiting:'A aguardar receção',received:'Recebido',rejected:'Receção recusada',cancelled:'Cancelado'};
export function receiptQuantity(value:unknown){const text=String(value??'').trim().replace(',','.');if(!/^\d{1,10}(\.\d{1,3})?$/.test(text)||Number(text)>1e9)throw new Error('Indica uma quantidade válida, com até três casas decimais.');return Number(text);}
export function validateShipment(input:Record<string,unknown>,senderEmail:string){
 const step=input.step;if(step!=='warehouse'&&step!=='supermarket')throw new Error('Destino inválido.');
 const org=String(input.organization||'').trim(),email=String(input.email||'').trim().toLowerCase(),unit=String(input.unit||'').trim();
 if(org.length<2||org.length>180)throw new Error('Indica o nome do destinatário.');
 if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Indica um email válido para o destinatário.');
 if(email===senderEmail.trim().toLowerCase())throw new Error('A receção tem de ser confirmada pelo destinatário, com um email diferente do remetente.');
 const quantity=receiptQuantity(input.quantity);if(quantity<=0||unit.length<1||unit.length>30)throw new Error('Indica a quantidade e a unidade da entrega.');
 if(typeof input.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId))throw new Error('Identificador do pedido inválido.');
 return{step,org,email,quantity,unit,requestId:input.requestId.toLowerCase()};
}
