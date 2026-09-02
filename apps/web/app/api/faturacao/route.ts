import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, email, nif, produto, valor } = body;

    // Pedido à API do Keyinvoice
    const response = await fetch(`${process.env.KEYINVOICE_API_URL}documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KEYINVOICE_API_KEY}`,
      },
      body: JSON.stringify({
        document_type: 'FR', // Ex: 'FR' para Fatura-Recibo ou 'FT' para Fatura
        client: {
          name: nome,
          email: email,
          fiscal_id: nif || '999999990', // Se não houver NIF, assume Consumidor Final
        },
        items: [
          {
            name: produto,
            price: valor,
            quantity: 1,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao comunicar com o Keyinvoice');
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Erro na faturação:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}