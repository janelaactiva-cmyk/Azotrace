import type {Metadata} from 'next';
import LogisticsClient from './LogisticsClient';
export const metadata:Metadata={title:'Registar entrega — Azotrace',robots:{index:false,follow:false},referrer:'no-referrer'};
export const instant=false;
export default function Page(){return <LogisticsClient/>;}
