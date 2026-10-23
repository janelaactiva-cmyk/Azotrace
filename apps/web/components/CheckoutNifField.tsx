'use client';
import {useEffect,useRef,type CSSProperties} from 'react';
import {portugueseNifError} from '~/lib/portuguese-nif';

type Props={id:string;name:string;label:string;validationLabel:string;value:string;required:boolean;onValueChange:(value:string)=>void;groupStyle?:CSSProperties;labelStyle?:CSSProperties;inputStyle?:CSSProperties};
export default function CheckoutNifField({id,name,label,validationLabel,value,required,onValueChange,groupStyle,labelStyle,inputStyle}:Props){
 const input=useRef<HTMLInputElement>(null);
 const error=portugueseNifError(value,validationLabel,required);
 useEffect(()=>{input.current?.setCustomValidity(error);},[error]);
 return <div style={groupStyle}>
  <label htmlFor={id} style={labelStyle}>{label}</label>
  <input ref={input} id={id} type="text" inputMode="numeric" autoComplete="off" name={name} value={value} required={required} maxLength={9} pattern="[1-9][0-9]{8}" aria-invalid={!!error} style={inputStyle}
   onChange={event=>{const next=event.currentTarget.value.replace(/\D/g,'').slice(0,9);event.currentTarget.value=next;event.currentTarget.setCustomValidity(portugueseNifError(next,validationLabel,required));onValueChange(next);}}
   onBlur={()=>{if(value!==value.trim())onValueChange(value.trim());}}/>
 </div>;
}
