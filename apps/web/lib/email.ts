import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarEmailComChave(email: string, productKey: string) {
  try {
    const data = await resend.emails.send({
      from: 'Azotrace <no-reply@azotrace.com>', 
      to: email,
      subject: 'A tua Chave de Produto - Acesso à Dashboard',
      html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2> Agradecemos a sua aquisição! </h2>
          <p>O seu pagamento foi confirmado com sucesso. Abaixo encontra a sua chave de produto exclusiva para aceder à plataforma:</p>
    
          <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; font-size: 20px; font-weight: bold; letter-spacing: 2px; display: inline-block; margin: 15px 0; color: #111;">
          ${productKey}
          </div>

          <p>Por favor, copie esta chave e insira-a na página de verificação do nosso sítio Web para aceder ao seu painel de controlo.</p>
          <br/>
          <p style="color: #666; font-size: 12px;">Caso tenha alguma questão, por favor contacte-nos através do número 965 042 695.</p>
          </div>
`,
    });
    
    console.log('📧 Resposta do Resend:', data);
    return data;
  } catch (error) {
    console.error('❌ ERRO DETALHADO DO RESEND:', error);
    throw error; // Lança o erro para cima para sabermos o que falhou
  }
}