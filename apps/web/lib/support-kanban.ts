import type {SupportStatus,SupportTicket} from '~/lib/support-types';
export const kanbanColumns=[{id:'open',label:'Por fazer'},{id:'in_progress',label:'Em curso'},{id:'resolved',label:'Concluídos'}] as const;
export type KanbanColumn=typeof kanbanColumns[number]['id'];
export function kanbanColumn(status:SupportStatus):KanbanColumn{return status==='waiting'?'in_progress':status;}
export function sortKanbanTickets(tickets:SupportTicket[]){const ranks={high:0,medium:1,low:2};return [...tickets].sort((a,b)=>ranks[a.priority]-ranks[b.priority]||Number(a.status==='resolved')-Number(b.status==='resolved')||Date.parse(a.created_at)-Date.parse(b.created_at)||a.ticket_number-b.ticket_number);}
