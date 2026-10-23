'use client';
import { useEffect, useState } from 'react';
import { CHATBOT_CHANGED_EVENT, CHATBOT_CHANGED_KEY, type ChatbotQuestion } from './chatbot-questions';
export function useChatbotQuestions(open: boolean) {
  const [questions, setQuestions] = useState<ChatbotQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    let disposed = false, pending = false, queued = false;
    const controller = new AbortController();
    async function refresh() {
      if (pending) { queued = true; return; }
      pending = true;
      try {
        const response = await fetch('/api/chatbot?active=true', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        const data: unknown = await response.json();
        if (!response.ok || !Array.isArray(data) || !data.every(row => row && typeof row.id === 'number' && typeof row.question === 'string' && typeof row.answer === 'string' && typeof row.is_active === 'boolean')) throw new Error();
        if (!disposed) { setQuestions(data as ChatbotQuestion[]); setError(''); }
      } catch {
        if (!disposed) { setQuestions([]); setError('Não foi possível carregar as perguntas. Tente novamente dentro de instantes.'); }
      } finally {
        pending = false;
        if (!disposed) { setLoading(false); if (queued) { queued = false; void refresh(); } }
      }
    }
    const visibleRefresh = () => { if (!document.hidden) void refresh(); };
    const storage = (event: StorageEvent) => { if (event.key === CHATBOT_CHANGED_KEY) visibleRefresh(); };
    void refresh();
    const timer = window.setInterval(visibleRefresh, 30000);
    window.addEventListener(CHATBOT_CHANGED_EVENT, visibleRefresh);
    window.addEventListener('storage', storage);
    window.addEventListener('focus', visibleRefresh);
    document.addEventListener('visibilitychange', visibleRefresh);
    return () => { disposed = true; controller.abort(); window.clearInterval(timer); window.removeEventListener(CHATBOT_CHANGED_EVENT, visibleRefresh); window.removeEventListener('storage', storage); window.removeEventListener('focus', visibleRefresh); document.removeEventListener('visibilitychange', visibleRefresh); };
  }, [open]);
  return { questions, loading, error };
}
