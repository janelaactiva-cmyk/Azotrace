'use client';
import { useEffect,useState } from 'react';
import { CatalogSchema,type Catalog } from './plan-catalog';
export function usePlanCatalog(){
 const [catalog,setCatalog]=useState<Catalog|null>(null),[error,setError]=useState('');
 useEffect(()=>{let disposed=false,etag='',busy=false;const controller=new AbortController();
 async function refresh(){if(busy||document.hidden)return;busy=true;try{
  const response=await fetch('/api/public/plans',{cache:'no-store',headers:etag?{'If-None-Match':etag}:{},signal:controller.signal});
  if(response.status===304){if(!disposed)setError('');return;}
  if(!response.ok)throw new Error('Não foi possível carregar os planos. Tenta novamente.');
  const next=CatalogSchema.parse(await response.json());etag=response.headers.get('etag')||'';
  if(!disposed){setCatalog(previous=>previous?.version===next.version?previous:next);setError('');}
 }catch(cause){if(!disposed)setError(cause instanceof Error?cause.message:'Não foi possível carregar os planos.');}finally{busy=false;}}
 void refresh();const timer=setInterval(()=>void refresh(),30000);const focus=()=>void refresh();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
 return()=>{disposed=true;controller.abort();clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[]);return {catalog,error};
}
