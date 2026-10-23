export type PlatformSettings = { site_name:string; description:string; contact_email:string; version:number; updated_at?:string };
export function validatePlatformSettings(input:unknown):PlatformSettings{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Dados inválidos.');
 const row=input as Record<string,unknown>;
 if(typeof row.site_name!=='string'||typeof row.description!=='string'||typeof row.contact_email!=='string')throw new Error('Preenche os dados da plataforma.');
 const site_name=row.site_name.trim(),description=row.description.trim(),contact_email=row.contact_email.trim();
 if(!site_name||site_name.length>100||description.length>500)throw new Error('O nome deve ter até 100 caracteres e a descrição até 500.');
 if(contact_email&&(contact_email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)))throw new Error('O email de contacto não é válido.');
 if(typeof row.version!=='number'||!Number.isSafeInteger(row.version)||row.version<1)throw new Error('Recarrega os dados antes de guardar.');
 return{site_name,description,contact_email,version:row.version};
}
