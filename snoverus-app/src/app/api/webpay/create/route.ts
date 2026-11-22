import { NextRequest, NextResponse } from 'next/server';

const TBK_HOST =
  process.env.TBK_ENV === 'production'
    ? 'https://webpay3g.transbank.cl'
    : 'https://webpay3gint.transbank.cl';

const TBK_API_KEY_ID = process.env.TBK_API_KEY_ID || '597055555532';
const TBK_API_KEY_SECRET =
  process.env.TBK_API_KEY_SECRET ||
  '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buyOrder, sessionId, amount } = body;

    if (!buyOrder || !sessionId) {
      return NextResponse.json(
        { error: 'Faltan parámetros buyOrder o sessionId.' },
        { status: 400 }
      );
    }

    // Webpay Plus exige monto entero > 0. Para Trial enviamos $50 CLP de validación reembolsable.
    const montoFinal = Math.max(50, Math.round(Number(amount || 0)));
    const returnUrl = `${req.nextUrl.origin}/api/webpay/return`;

    const tbkRes = await fetch(
      `${TBK_HOST}/rswebpaytransaction/api/webpay/v1.2/transactions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Tbk-Api-Key-Id': TBK_API_KEY_ID,
          'Tbk-Api-Key-Secret': TBK_API_KEY_SECRET,
        },
        body: JSON.stringify({
          buy_order: String(buyOrder).slice(0, 26),
          session_id: String(sessionId).slice(0, 61),
          amount: montoFinal,
          return_url: returnUrl,
        }),
      }
    );

    const data = await tbkRes.json();

    if (!tbkRes.ok || !data?.token || !data?.url) {
      return NextResponse.json(
        { error: data?.error_message || 'Transbank rechazó la creación de la transacción.' },
        { status: tbkRes.status || 500 }
      );
    }

    return NextResponse.json({
      token: data.token,
      url: data.url,
      amount: montoFinal,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error conectando con Webpay Plus.' },
      { status: 500 }
    );
  }
}