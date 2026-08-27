import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarEmailComChave(email: string, productKey: string) {
  try {
    await resend.emails.send({
      from: 'Azotrace <geral@azotrace.com>', // Podes mudar para o teu domínio mais tarde
      to: email,
      subject: 'A tua Chave de Produto - Acesso à Dashboard',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2> Obrigado pela tua compra! </h2>
          <p>O teu pagamento foi confirmado com sucesso. Aqui tens a tua chave de produto exclusiva para acederes à plataforma:</p>
          
          <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; font-size: 20px; font-weight: bold; letter-spacing: 2px; display: inline-block; margin: 15px 0; color: #111;">
            ${productKey}
          </div>

          <p>Copia esta chave e cola-a na página de verificação do site para entrares na tua dashboard.</p>
          <br/>
          <p style="color: #666; font-size: 12px;">Se tiveres alguma dúvida, responde a este email.</p>
        </div>
      `,
    });
    console.log('📧 Email enviado com sucesso para:', email);
  } catch (error) {
    console.error('Erro ao enviar email:', error);
  }
}