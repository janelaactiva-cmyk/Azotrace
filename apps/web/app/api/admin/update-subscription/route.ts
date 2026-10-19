import { NextResponse } from 'next/server';
// As alterações passam pela nova página: downgrade validado ou upgrade pago.
export async function POST() {
 return NextResponse.json({ success: false, error: 'Utilize Pagamentos e subscrições para alterar o plano.' }, { status: 410 });
}
