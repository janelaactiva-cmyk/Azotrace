'use client';
import { CatalogSchema,CatalogDataSchema,defaultCatalogData,type Catalog,type CatalogData } from './plan-catalog';
export const LOCAL_CATALOG_EVENT='azotrace:local-plan-catalog';
const KEY='azotrace:plan-catalog:local-test:v1';
export function isLocalPlanPreview(){return process.env.NODE_ENV==='development'&&typeof window!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(window.location.hostname);}
export function loadLocalPlanCatalog():Catalog{if(!isLocalPlanPreview())throw new Error('Teste local indisponível.');const saved=window.localStorage.getItem(KEY);return saved?CatalogSchema.parse(JSON.parse(saved)):CatalogSchema.parse({...defaultCatalogData,version:1});}
export function saveLocalPlanCatalog(data:CatalogData,version:number):Catalog{const current=loadLocalPlanCatalog();if(current.version!==version)throw new Error('Os planos foram alterados noutro separador. Atualiza antes de guardar.');const next=CatalogSchema.parse({...CatalogDataSchema.parse(data),version:version+1});window.localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new Event(LOCAL_CATALOG_EVENT));return next;}
