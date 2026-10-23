'use client';
import styles from './shipment-receipts.module.css';
export default function LotReceiptEntry({businessId,batchId}:{businessId:string;batchId:string}){
 const href=`/logistica?businessId=${encodeURIComponent(businessId)}&batchId=${encodeURIComponent(batchId)}`;
 return <section className={styles.panel} style={{maxWidth:1120,margin:'16px auto',padding:20}} aria-label="Receção do lote"><h2 style={{fontSize:18,margin:'0 0 10px'}}>Recebeste este lote?</h2><p>Confirma a chegada ao armazém ou à loja, com a quantidade recebida e a assinatura. Usa o acesso de operador registado pelo Admin.</p><a href={href} style={{display:'inline-block',padding:'12px 16px',border:'1px solid currentColor',borderRadius:8}}>Confirmar chegada com assinatura</a><p style={{fontSize:13}}>A confirmação de entregas funciona mesmo quando os dados públicos do produto ainda não foram publicados.</p></section>;
}
