export const qrOriginKey='azotrace-qr-origin';
export function normalizeQrOrigin(value:string){
 let url:URL;try{url=new URL(value.trim())}catch{throw Error('Indica um endereço completo, começado por http:// ou https://.')}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Indica apenas o endereço base da aplicação, sem caminhos nem códigos.');
 return url.origin;
}
export function localQrOrigin(value:string){try{return['localhost','127.0.0.1','[::1]','0.0.0.0'].includes(new URL(value).hostname)}catch{return true}}
export function preferredQrOrigin(current:string){
 if(typeof window!=='undefined'){try{const saved=localStorage.getItem(qrOriginKey);if(saved)return normalizeQrOrigin(saved)}catch{}}
 const configured=process.env.NEXT_PUBLIC_SITE_URL;
 if(configured){try{const origin=normalizeQrOrigin(configured);if(!localQrOrigin(origin))return origin}catch{}}
 return normalizeQrOrigin(current);
}
// A recuperação usa um endereço público HTTPS, independente da configuração de QR locais.
export function recoveryQrOrigin(current:string){
 const candidates=[process.env.NEXT_PUBLIC_SITE_URL,current,'https://azotrace.com'];
 for(const candidate of candidates){
  if(!candidate)continue;
  try{
   const origin=normalizeQrOrigin(candidate),url=new URL(origin),host=url.hostname.toLowerCase();
   if(url.protocol!=='https:'||localQrOrigin(origin)||host.endsWith('.localhost')||host.endsWith('.local')||!host.includes('.')||host.includes(':')||/^[0-9.]+$/.test(host))continue;
   return origin;
  }catch{}
 }
 return 'https://azotrace.com';
}
