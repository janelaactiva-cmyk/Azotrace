'use client';
import {useMemo} from 'react';
import qrcode from '~/lib/vendor/qrcode-generator';
export default function LotQrCode({url}:{url:string}){
 const svg=useMemo(()=>{if(!url)return '';const qr=qrcode(0,'M');qr.addData(url);qr.make();return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr.createSvgTag({cellSize:5,margin:20,scalable:true}));},[url]);
 if(!svg)return null;
 return <div style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap',margin:'16px 0'}}><img width={180} height={180} style={{background:'#fff',maxWidth:'100%'}} src={svg} alt="QR Code de rastreabilidade do lote"/><div style={{display:'grid',gap:12}}><a href={url} target="_blank" rel="noreferrer">Abrir página do QR</a><a href={svg} download="etiqueta-lote-azotrace.svg">Descarregar etiqueta SVG</a></div></div>;
}
