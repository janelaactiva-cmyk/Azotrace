'use client';
import {useEffect,useMemo,useState} from 'react';
import qrcode from '~/lib/vendor/qrcode-generator';
export function useQrImage(url:string){
 const svg=useMemo(()=>{if(!url)return '';const qr=qrcode(0,'M');qr.addData(url);qr.make();return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr.createSvgTag({cellSize:6,margin:24,scalable:false}))},[url]);
 const[png,setPng]=useState('');
 useEffect(()=>{setPng('');if(!svg)return;let alive=true;const image=new Image();image.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.fillStyle='#fff';ctx.fillRect(0,0,640,640);ctx.drawImage(image,0,0,640,640);if(alive)setPng(canvas.toDataURL('image/png'))}catch{}};image.src=svg;return()=>{alive=false}},[svg]);
 return{svg,png};
}
