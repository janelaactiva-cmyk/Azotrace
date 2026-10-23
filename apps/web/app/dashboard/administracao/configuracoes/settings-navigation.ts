export const SETTINGS_ROOT='/dashboard/administracao/configuracoes';
export const settingsSections=[
 {id:'multifator',title:'Autenticação multifator',description:'Ativa e gere a proteção adicional da tua conta.',personal:true},
 {id:'plataforma',title:'Dados da plataforma',description:'Nome, descrição e email institucional da Azotrace.',personal:false},
 {id:'preferencias',title:'Preferências',description:'Aspeto e apresentação da tua área de trabalho.',personal:true},
 {id:'emails',title:'Emails e notificações',description:'Avisos de renovação de 15, 10 e 5 dias e testes de envio.',personal:false},
 {id:'integracoes',title:'Integrações',description:'Configuração dos serviços Stripe, Resend e Supabase.',personal:false},
] as const;
export type SettingsSection=typeof settingsSections[number]['id'];
