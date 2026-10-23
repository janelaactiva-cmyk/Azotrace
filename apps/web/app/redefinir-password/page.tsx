'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';


import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import Link from 'next/link';

export default function RedefinirPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const recoveryToken=useRef('');
  const [recoveryReady,setRecoveryReady]=useState(false),[awaitingVerification,setAwaitingVerification]=useState(false),[checkingLink,setCheckingLink]=useState(true);
  useEffect(()=>{
    let alive=true;const url=new URL(location.href),hash=new URLSearchParams(url.hash.slice(1));
    if(url.searchParams.has('error')||hash.has('error')){setError('O link de recuperação é inválido ou expirou. Pede um novo link.');setCheckingLink(false);return}
    const token=url.searchParams.get('token_hash')||hash.get('token_hash');
    if(token&&((url.searchParams.get('type')||hash.get('type'))!=='recovery')){setError('Este link não é de recuperação de password.');setCheckingLink(false);return}
    if(token){recoveryToken.current=token;history.replaceState(null,'',url.pathname)}
    if(recoveryToken.current){setAwaitingVerification(true);setCheckingLink(false);return}
    supabase.auth.getSession().then(({data,error})=>{if(!alive)return;if(error||!data.session)setError('O link não criou uma sessão de recuperação neste dispositivo. Pede um novo link.');else setRecoveryReady(true)}).catch(()=>{if(alive)setError('Não foi possível validar o link. Tenta novamente.')}).finally(()=>{if(alive)setCheckingLink(false)});
    return()=>{alive=false};
  },[]);
  const verifyRecoveryLink=async()=>{if(loading||!recoveryToken.current)return;setLoading(true);setError('');try{const{data,error}=await supabase.auth.verifyOtp({token_hash:recoveryToken.current,type:'recovery'});if(error||!data.session)throw Error('O link de recuperação é inválido ou expirou. Pede um novo link.');recoveryToken.current='';setAwaitingVerification(false);setRecoveryReady(true)}catch(e){setError(uiMessagePt((e as Error).message))}finally{setLoading(false)}};

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('1 letra maiúscula');
    if (!/[a-z]/.test(password)) errors.push('1 letra minúscula');
    if (!/[0-9]/.test(password)) errors.push('1 número');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('1 caracter especial');
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordErrors([]);
    if(!recoveryReady){setError('Valida primeiro o link de recuperação.');return}

    const errors = validatePassword(password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    if (password !== confirmPassword) {
      setError("As passwords não coincidem");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(uiMessagePt('' + (err.message || 'Erro ao atualizar password')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f3f4f6',
      fontFamily: 'sans-serif',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: 'white',
        padding: 'clamp(20px, 5vw, 40px)',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
                boxSizing: 'border-box',
        maxWidth: '440px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            Redefinir password
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Define uma nova password para a sua conta
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {checkingLink&&<p role="status">A verificar o link de recuperação…</p>}
        {awaitingVerification&&<button type="button" disabled={loading} onClick={()=>void verifyRecoveryLink()} style={{padding:14,width:'100%',marginBottom:16}}>Validar link de recuperação</button>}
        {!checkingLink&&!recoveryReady&&!awaitingVerification&&<p><Link href="/recuperar-password">Pedir novo link de recuperação</Link></p>}
        {success && (
          <div style={{
            background: '#dcfce7',
            color: '#16a34a',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '16px', fontWeight: '500', margin: 0 }}>
               password atualizada!
            </p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              A ser redirecionado para o login...
            </p>
          </div>
        )}

        {passwordErrors.length > 0 && (
          <div style={{
            background: '#fef3c7',
            color: '#d97706',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px'
          }}>
            <strong> Regras da password:</strong>
            <ul style={{ marginTop: '6px', paddingLeft: '20px', marginBottom: '0' }}>
              {passwordErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {recoveryReady&&<form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Nova password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder=""
              autoComplete="new-password"
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Confirmar password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder=""
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
                boxSizing: 'border-box',
              padding: '14px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'A atualizar...' : "Atualizar password"}
          </button>
        </form>}

      </div>
    </div>
  );
}
