/** Valida apenas o formato pedido no checkout; não consulta a validade ou titularidade na Autoridade Tributária. */
export function isValidPortugueseNif(value:unknown):boolean {
 if(typeof value!=='string')return false;
 return /^[1-9][0-9]{8}$/.test(value.trim());
}

export function portugueseNifError(value:unknown,label='O NIF',required=true):string {
 if(value===undefined||value===null||typeof value==='string'&&!value.trim())return required?`${label} é obrigatório.`:'';
 if(typeof value!=='string'||!/^[1-9][0-9]{8}$/.test(value.trim()))return `${label} deve ter exatamente 9 dígitos e não pode começar por zero.`;
 return '';
}
