// Apenas texto de apresentação. Não altera códigos, sessões ou regras do servidor.
export function passwordWording(text: string): string {
 return text.replace(/\b(?:palavras-passe|senhas)\b/gi,'passwords').replace(/\b(?:palavra-passe|senha|Password)\b/g,'password').replace(/\b(?:Palavra-passe|Senha)\b/g,'password');
}
const byCode: Record<string,string> = {
 same_password:'A nova password deve ser diferente da password atual.',
 invalid_credentials:'Conta inexistente ou password incorreta.',
 email_not_confirmed:'Confirma o teu email antes de iniciar sessão.',
 email_exists:'Já existe uma conta com este email.',user_already_exists:'Já existe uma conta com este email.',
 weak_password:'A password não cumpre os requisitos de segurança.',
 otp_expired:'O link é inválido ou já expirou. Pede um novo email de recuperação.',
 session_not_found:'A sessão expirou. Inicia sessão novamente.',bad_jwt:'A sessão é inválida. Inicia sessão novamente.',
 refresh_token_not_found:'A sessão expirou. Inicia sessão novamente.',refresh_token_already_used:'A sessão expirou. Inicia sessão novamente.',
 over_email_send_rate_limit:'Foram pedidos demasiados emails. Aguarda alguns minutos antes de tentar novamente.',
 over_request_rate_limit:'Foram feitos demasiados pedidos. Aguarda alguns minutos antes de tentar novamente.',
 email_address_invalid:'Introduz um endereço de email válido.',
 user_banned:'Esta conta está temporariamente suspensa.',
 signup_disabled:'A criação de contas está temporariamente indisponível.',
 provider_disabled:'Este método de autenticação não está disponível.',
 insufficient_aal:'Confirma o código de autenticação multifator para continuar.',
 mfa_verification_failed:'O código de autenticação é inválido. Tenta novamente.',
 mfa_challenge_expired:'O código de autenticação expirou. Pede um novo código.',
 request_timeout:'O pedido demorou demasiado. Tenta novamente.',
 bad_code_verifier:'Não foi possível validar a ligação. Pede um novo email e abre-o no mesmo navegador onde fizeste o pedido.',
 flow_state_expired:'A ligação de autenticação expirou. Inicia o processo novamente.',
 flow_state_not_found:'Não foi possível validar a ligação. Inicia o processo novamente.',
 reauthentication_needed:'Inicia sessão novamente antes de alterar a password.',
};
const matches: [RegExp,string][] = [
 [/new password should be different|same.password/i,byCode.same_password!],
 [/invalid login credentials|invalid.credentials|invalid email or password/i,byCode.invalid_credentials!],
 [/email not confirmed/i,byCode.email_not_confirmed!],
 [/user already registered|user already exists|email.*already.*registered|email.*already.*exists/i,byCode.email_exists!],
 [/email link is invalid or has expired|token has expired|otp.expired|token.*invalid.*expired/i,byCode.otp_expired!],
 [/auth session missing|session.*not found|session.*expired|refresh token.*invalid|invalid refresh token|invalid.*jwt/i,byCode.session_not_found!],
 [/error sending recovery email|error sending confirmation email|unable to send.*email|failed to send.*email/i,'Não foi possível enviar o email. Tenta novamente mais tarde.'],
 [/for security purposes.*after|email rate limit|too many requests|rate limit.*exceeded/i,byCode.over_request_rate_limit!],
 [/password.*weak|password.*(uppercase|lowercase|special character)|password.*requirements/i,byCode.weak_password!],
 [/unable to validate email|invalid email|email address.*invalid/i,byCode.email_address_invalid!],
 [/failed to fetch|fetch failed|network.?error|network request failed|load failed/i,'Não foi possível ligar ao servidor. Verifica a ligação à Internet e tenta novamente.'],
 [/timed? ?out|timeout|operation was aborted|signal.*aborted/i,byCode.request_timeout!],
 [/permission denied|not authorized|unauthorized|forbidden|access denied|row.level security/i,'Não tens permissão para realizar esta operação.'],
 [/duplicate key|unique constraint/i,'Já existe um registo com estes dados.'],
 [/violates foreign key|foreign key constraint/i,'Este registo está associado a outros dados e não pode ser alterado desta forma.'],
 [/invalid.*(totp|mfa|verification).*code/i,byCode.mfa_verification_failed!],
 [/code verifier|code.challenge|pkce/i,byCode.bad_code_verifier!],
];
export function uiMessagePt(value: unknown, fallback = 'Não foi possível concluir a operação. Tenta novamente.'): string {
 const detail=value&&typeof value==='object'?value as {message?:unknown;code?:unknown;status?:unknown}:null;
 const code=typeof detail?.code==='string'?detail.code:'';
 if(byCode[code])return byCode[code]!;
 const text=typeof value==='string'?value:typeof detail?.message==='string'?detail.message:'';
 if(!text.trim())return typeof value==='string'?'':fallback;
 for(const [pattern,translated] of matches)if(pattern.test(text))return translated;
 const length=text.match(/password should be at least (\d+) characters|password must (?:be|contain).*?(\d+) characters/i);
 if(length)return `A password deve ter pelo menos ${length[1]||length[2]} caracteres.`;
 if(detail?.status===429)return byCode.over_request_rate_limit!;
 // Mantém os detalhes das mensagens já escritas em português.
 if(/[áàâãéêíóôõúç]|\b(?:erro|tenta|dados|conta|empresa|plano|pagamento|registo|sessão|carregar|guardar|enviar|seleciona|introduz|demasiado|indisponível|obrigatório)\b/i.test(text))return passwordWording(text);
 return fallback;
}
