'use client';
import { useEffect, useState } from 'react';
import { uiMessagePt } from '~/lib/ui-messages-pt';
import { CatalogSchema, type Catalog } from './plan-catalog';

let sharedCatalog: Catalog | null = null;
let sharedEtag = '';
let checkedAt = 0;
let pending: Promise<Catalog> | null = null;
function remember(catalog: Catalog) {
 if (!sharedCatalog || catalog.version >= sharedCatalog.version) {
  if (sharedCatalog?.version !== catalog.version) sharedEtag = '';
  sharedCatalog = catalog;
 }
 return sharedCatalog;
}
function refreshCatalog(): Promise<Catalog> {
 if (pending) return pending;
 if (sharedCatalog && Date.now() - checkedAt < 15_000) return Promise.resolve(sharedCatalog);
 const operation = (async () => {
  const response = await fetch('/api/public/plans', {
   cache: 'no-cache', headers: sharedEtag ? { 'If-None-Match': sharedEtag } : {},
  });
  if (response.status === 304 && sharedCatalog) { checkedAt = Date.now(); return sharedCatalog; }
  if (!response.ok) throw new Error('Não foi possível carregar os planos. Tenta novamente.');
  const next = CatalogSchema.parse(await response.json());
  const catalog = remember(next);
  if (catalog.version === next.version) sharedEtag = response.headers.get('etag') || '';
  checkedAt = Date.now();
  return catalog;
 })().finally(() => { if (pending === operation) pending = null; });
 pending = operation;
 return operation;
}
export function usePlanCatalog(initialCatalog?: Catalog) {
 const [catalog, setCatalog] = useState<Catalog | null>(initialCatalog ?? null);
 const [error, setError] = useState('');
 useEffect(() => {
  let disposed = false;
  if (initialCatalog) { remember(initialCatalog); checkedAt = Date.now(); }
  if (sharedCatalog) setCatalog(sharedCatalog);
  async function refresh() {
   if (document.hidden) return;
   try {
    const next = await refreshCatalog();
    if (!disposed) { setCatalog(previous => previous?.version === next.version ? previous : next); setError(''); }
   } catch (cause) {
    if (!disposed) setError(uiMessagePt(cause instanceof Error ? cause.message : 'Não foi possível carregar os planos.'));
   }
  }
  void refresh();
  const timer = window.setInterval(() => void refresh(), 30_000);
  const focus = () => void refresh();
  window.addEventListener('focus', focus);
  document.addEventListener('visibilitychange', focus);
  return () => { disposed = true; window.clearInterval(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); };
 }, [initialCatalog]);
 return { catalog, error };
}
