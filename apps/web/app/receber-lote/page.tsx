import type {Metadata} from 'next';
import ReceiptClient from './ReceiptClient';
export const metadata:Metadata={title:'Confirmar receção — Azotrace',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function ReceiptPage(){return <ReceiptClient/>;}
