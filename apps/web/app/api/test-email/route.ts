import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev', // ou o teu email verificado
      to: 'geral@janelaactiva.net', // substitui pelo teu e-mail real
      subject: 'Teste de E-mail Azotrace',
      html: '<p>Funcionou! O Resend está a enviar e-mails corretamente.</p>',
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error });
  }
}