'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CheckCircle2, Clock3, Inbox, Loader2, MessageSquare, Plus, Search, Send, Ticket as TicketIcon, X } from 'lucide-react';

// If your project already has a browser Supabase client, import it instead.
const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Status = 'open' | 'waiting' | 'resolved';
type Priority = 'low' | 'medium' | 'high';
type Ticket = {
  id: string;
  ticket_number: number;
  company_id: string;
  subject: string;
  priority: Priority;
  status: Status;
  requester_name: string;
  requester_email: string | null;
  created_by_user_id: string;
  assignee_user_id: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  updated_at: string;
  created_at: string;
};
type Message = {
  id: string;
  ticket_id: string;
  author_user_id: string;
  author_name: string;
  body: string;
  is_internal: boolean;
  created_at: string;
};
type Company = { id: string; name: string };

const statuses: Record<Status, string> = { open: 'Aberto', waiting: 'À espera', resolved: 'Resolvido' };
const priorities: Record<Priority, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };
const formatDate = (date: string) => new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date));

export default function SuporteTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [form, setForm] = useState({ company_id: '', subject: '', priority: 'medium' as Priority, requester_name: '', requester_email: '', body: '' });

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? id;
  const filtered = useMemo(() => tickets.filter((t) =>
    (statusFilter === 'all' || t.status === statusFilter) &&
    `${t.ticket_number} ${t.subject} ${t.requester_name} ${companyName(t.company_id)}`.toLocaleLowerCase('pt-PT').includes(search.toLocaleLowerCase('pt-PT'))
  ), [tickets, companies, search, statusFilter]);

  const loadTickets = useCallback(async () => {
    const { data, error: loadError } = await supabase.from('azotrace_support_tickets').select('*').order('updated_at', { ascending: false });
    if (loadError) throw loadError;
    setTickets((data ?? []) as Ticket[]);
  }, []);

  const loadMessages = useCallback(async (ticketId: string) => {
    const { data, error: loadError } = await supabase.from('azotrace_support_ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    if (loadError) throw loadError;
    setMessages((data ?? []) as Message[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) throw new Error('Inicia sessão para consultar os tickets.');
        if (cancelled) return;
        setUserId(authData.user.id);
        // Assumes azotrace_companies has id and name. Adjust name if your schema uses another column.
        const { data: companyData, error: companyError } = await supabase.from('azotrace_companies').select('id, name').order('name');
        if (companyError) throw companyError;
        if (cancelled) return;
        setCompanies((companyData ?? []) as Company[]);
        await loadTickets();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Não foi possível carregar os tickets.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => { cancelled = true; };
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    void loadMessages(selectedId).catch((err) => setError(err.message));
  }, [selectedId, loadMessages]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel('support-tickets-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'azotrace_support_tickets' }, () => { void loadTickets().catch((err) => setError(err.message)); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'azotrace_support_ticket_messages' }, (payload) => {
        const ticketId = (payload.new as { ticket_id?: string }).ticket_id;
        if (ticketId && ticketId === selectedId) void loadMessages(ticketId).catch((err) => setError(err.message));
        void loadTickets().catch((err) => setError(err.message));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, selectedId, loadTickets, loadMessages]);

  async function createTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('azotrace_support_create_ticket', {
        input_company_id: form.company_id,
        input_subject: form.subject.trim(),
        input_priority: form.priority,
        input_requester_name: form.requester_name.trim(),
        input_requester_email: form.requester_email.trim(),
        input_body: form.body.trim(),
      });
      if (rpcError) throw rpcError;
      await loadTickets();
      setSelectedId(data as string);
      setShowForm(false);
      setStatusFilter('all');
      setForm({ company_id: '', subject: '', priority: 'medium', requester_name: '', requester_email: '', body: '' });
      setNotice('Ticket criado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar ticket.');
    } finally { setBusy(false); }
  }

  async function updateTicket(patch: Partial<Ticket>) {
    if (!selected || !userId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: updateError } = await supabase.from('azotrace_support_tickets').update(patch).eq('id', selected.id);
      if (updateError) throw updateError;
      await loadTickets();
      setNotice('Ticket atualizado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar ticket.');
    } finally { setBusy(false); }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !userId || !reply.trim()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data: profile, error: profileError } = await supabase.from('profiles').select('name, email').eq('id', userId).single();
      if (profileError) throw profileError;
      const authorName = profile?.name?.trim() || profile?.email || 'Utilizador';
      const { error: messageError } = await supabase.from('azotrace_support_ticket_messages').insert({
        ticket_id: selected.id,
        author_user_id: userId,
        author_name: authorName,
        body: reply.trim(),
        is_internal: internal,
      });
      if (messageError) throw messageError;
      setReply('');
      await Promise.all([loadMessages(selected.id), loadTickets()]);
      setNotice(internal ? 'Nota interna guardada.' : 'Resposta guardada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem.');
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-full bg-[#f7f7fa] px-4 py-7 text-[#242431] sm:px-7">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs text-slate-500">Super Admin / Apoio / Suporte</p><h1 className="mt-2 text-2xl font-bold">Suporte / Tickets</h1><p className="mt-1 text-sm text-slate-500">Cria e acompanha pedidos de suporte reais.</p></div>
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800"><Plus size={16} /> Criar ticket</button>
        </header>

        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {notice && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Por atribuir', count: tickets.filter((t) => !t.assignee_user_id && t.status !== 'resolved').length, Icon: Inbox },
            { label: 'Abertos', count: tickets.filter((t) => t.status === 'open').length, Icon: TicketIcon },
            { label: 'À espera', count: tickets.filter((t) => t.status === 'waiting').length, Icon: Clock3 },
            { label: 'Resolvidos', count: tickets.filter((t) => t.status === 'resolved').length, Icon: CheckCircle2 },
          ].map(({ label, count, Icon }) => <article key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"><div><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{count}</p></div><Icon className="text-violet-600" size={20}/></article>)}
        </section>

        {showForm && <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Criar novo ticket</h2><button aria-label="Fechar formulário" onClick={() => setShowForm(false)}><X size={18}/></button></div>
          <form onSubmit={createTicket} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Empresa<select required value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"><option value="">Selecionar empresa</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="text-sm font-medium">Prioridade<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label>
            <label className="text-sm font-medium sm:col-span-2">Assunto<input required minLength={3} maxLength={180} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" placeholder="Ex.: Não consigo publicar um lote"/></label>
            <label className="text-sm font-medium">Nome do solicitante<input required value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"/></label>
            <label className="text-sm font-medium">Email<input type="email" value={form.requester_email} onChange={(e) => setForm({ ...form, requester_email: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"/></label>
            <label className="text-sm font-medium sm:col-span-2">Descrição<textarea required rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" placeholder="Descreve o problema..."/></label>
            <div className="sm:col-span-2 flex justify-end"><button disabled={busy || !companies.length} className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'A guardar...' : 'Guardar ticket'}</button></div>
          </form>
        </section>}

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,1fr)]">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 p-4"><h2 className="font-bold">Pedidos de suporte</h2><span className="text-xs text-slate-500">{filtered.length} tickets</span></div>
            <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4"><div className="relative min-w-[180px] flex-1"><Search size={15} className="absolute left-3 top-3 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar tickets..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"/></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | Status)} className="rounded-lg border border-slate-200 px-3 text-sm"><option value="all">Todos</option><option value="open">Abertos</option><option value="waiting">À espera</option><option value="resolved">Resolvidos</option></select></div>
            {loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin text-violet-600"/></div> : tickets.length === 0 ? <div className="flex flex-col items-center gap-3 px-6 py-14 text-center"><Inbox size={36} className="text-slate-300"/><h3 className="font-semibold">Ainda não existem tickets</h3><p className="text-sm text-slate-500">Cria o primeiro ticket para começar a gerir os pedidos.</p><button onClick={() => setShowForm(true)} className="rounded-lg border border-violet-300 px-4 py-2 text-sm font-semibold text-violet-700">Criar primeiro ticket</button></div> : filtered.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Não foram encontrados tickets.</p> : <div className="divide-y divide-slate-100">{filtered.map((t) => <button key={t.id} onClick={() => setSelectedId(t.id)} className={`w-full p-4 text-left hover:bg-violet-50 ${selectedId === t.id ? 'bg-violet-50' : ''}`}><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-violet-700">#{t.ticket_number}</span><span className={`rounded-full px-2 py-1 text-xs ${t.status === 'resolved' ? 'bg-green-100 text-green-700' : t.status === 'waiting' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'}`}>{statuses[t.status]}</span></div><p className="mt-1 text-sm font-semibold">{t.subject}</p><p className="mt-1 text-xs text-slate-500">{companyName(t.company_id)} · {priorities[t.priority]} · {formatDate(t.updated_at)}</p></button>)}</div>}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            {!selected ? <div className="flex flex-col items-center gap-3 py-12 text-center"><MessageSquare size={30} className="text-slate-300"/><p className="text-sm text-slate-500">Seleciona um ticket para ver os detalhes e a conversa.</p></div> : <div className="space-y-5"><div><p className="text-xs font-semibold text-violet-700">Ticket #{selected.ticket_number}</p><h2 className="mt-1 text-lg font-bold">{selected.subject}</h2><p className="mt-1 text-xs text-slate-500">{companyName(selected.company_id)} · {selected.requester_name}</p></div><div className="grid grid-cols-2 gap-3 border-y border-slate-100 py-4 text-sm"><div><p className="mb-1 text-xs text-slate-500">Prioridade</p><strong>{priorities[selected.priority]}</strong></div><div><p className="mb-1 text-xs text-slate-500">Criado em</p><strong>{formatDate(selected.created_at)}</strong></div><label className="col-span-2 text-xs text-slate-500">Estado<select disabled={busy} value={selected.status} onChange={(e) => { const status = e.target.value as Status; void updateTicket({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null, resolved_by_user_id: status === 'resolved' ? userId : null }); }} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm text-slate-800"><option value="open">Aberto</option><option value="waiting">À espera</option><option value="resolved">Resolvido</option></select></label></div><div><h3 className="mb-3 text-sm font-bold">Conversa</h3><div className="max-h-[350px] space-y-3 overflow-y-auto">{messages.map((m) => <article key={m.id} className={`rounded-lg p-3 ${m.is_internal ? 'bg-amber-50' : 'bg-slate-50'}`}><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><strong className="text-xs">{m.author_name}{m.is_internal ? ' · Nota interna' : ''}</strong><span className="text-[11px] text-slate-500">{formatDate(m.created_at)}</span></div><p className="whitespace-pre-wrap text-sm">{m.body}</p></article>)}</div></div><form onSubmit={sendMessage} className="space-y-3 border-t border-slate-100 pt-4"><div className="flex gap-2 text-xs"><button type="button" onClick={() => setInternal(false)} className={`rounded-lg px-3 py-2 ${!internal ? 'bg-violet-100 font-semibold text-violet-700' : 'bg-slate-100'}`}>Responder</button><button type="button" onClick={() => setInternal(true)} className={`rounded-lg px-3 py-2 ${internal ? 'bg-amber-100 font-semibold text-amber-800' : 'bg-slate-100'}`}>Nota interna</button></div><textarea required rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={internal ? 'Escreve uma nota interna...' : 'Escreve uma resposta...'} className="w-full rounded-lg border border-slate-200 p-3 text-sm"/><div className="flex justify-end"><button disabled={busy || !reply.trim()} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send size={14}/>{busy ? 'A guardar...' : internal ? 'Guardar nota' : 'Enviar resposta'}</button></div></form></div>}
          </section>
        </div>
      </div>
    </main>
  );
}
