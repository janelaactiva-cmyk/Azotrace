import type {SupportPlan} from '~/lib/support-priority';
export type SupportStatus = 'open' | 'in_progress' | 'waiting' | 'resolved';
export type SupportMessage = {id:string;author_name:string;body:string;is_internal:boolean;created_at:string};
export type SupportTicket = {id:string;ticket_number:number;company_id:string|null;assignee_user_id:string|null;subject:string;status:SupportStatus;priority:'low'|'medium'|'high';priority_plan?:SupportPlan|null;priority_keyword?:string|null;priority_reason?:string;requester_name:string;requester_email:string|null;company_label:string|null;source:string;created_at:string;updated_at:string};
export type SupportContext = {authenticated:boolean;userId?:string;name?:string;email?:string;companyId?:string;companyName?:string;role?:string};
export const supportStatuses:Record<SupportStatus,string>={open:'Por fazer',in_progress:'Em curso',waiting:'Aguardar resposta',resolved:'Concluído'};
