import { NextRequest, NextResponse } from 'next/server';

const TBK_HOST =
  process.env.TBK_ENV === 'production'
    ? 'https://webpay3g.transbank.cl'
    : 'https://webpay3gint.transbank.cl';

const TBK_API_KEY_ID = process.env.TBK_API_KEY_ID || '597055555532';
const TBK_API_KEY_SECRET =
  process.env.TBK_API_KEY_SECRET ||
  '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';

function mapearTipoPago(code?: string): string {
  switch (code) {
    case 'VD':
      return 'Redcompra Débito';
    case 'VP':
      return 'Tarjeta Prepago';
    case 'VN':
    case 'VC':
    case 'SI':
    case 'S2':
    case 'NC':
      return 'Webpay Crédito';
    default:
      return 'Webpay Plus';
  }
}

async function actualizarOrdenSupabase(payload: {
  p_token: string | null;
  p_orden_numero: string | null;
  p_aprobado: boolean;
  p_auth_code: string;
  p_card_last4: string;
  p_payment_type: string;
  p_marca: string;
  p_detalle: string;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  await fetch(`${url}/rest/v1/rpc/registrar_resultado_webpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });
}

async function procesarRetorno(req: NextRequest) {
  const origin = req.nextUrl.origin;
  let tokenWs = req.nextUrl.searchParams.get('token_ws');
  let tbkToken = req.nextUrl.searchParams.get('TBK_TOKEN');
  let tbkOrden = req.nextUrl.searchParams.get('TBK_ORDEN_COMPRA');

  if (req.method === 'POST') {
    try {
      const formData = await req.formData();
      tokenWs = tokenWs || (formData.get('token_ws') as string | null);
      tbkToken = tbkToken || (formData.get('TBK_TOKEN') as string | null);
      tbkOrden = tbkOrden || (formData.get('TBK_ORDEN_COMPRA') as string | null);
    } catch {
      // Sin cuerpo de formulario
    }
  }

  // Caso 1: Usuario anuló o cerró Webpay antes de pagar
  if (!tokenWs) {
    await actualizarOrdenSupabase({
      p_token: tbkToken || null,
      p_orden_numero: tbkOrden || null,
      p_aprobado: false,
      p_auth_code: '',
      p_card_last4: '',
      p_payment_type: '',
      p_marca: 'Webpay',
      p_detalle: 'Transacción anulada por el usuario en Webpay.',
    });

    const dest = new URL('/planes/retorno', origin);
    dest.searchParams.set('status', 'anulado');
    if (tbkOrden) dest.searchParams.set('orden', tbkOrden);
    return NextResponse.redirect(dest, 303);
  }

  // Caso 2: Confirmar transacción con Transbank (PUT commit)
  try {
    const commitRes = await fetch(
      `${TBK_HOST}/rswebpaytransaction/api/webpay/v1.2/transactions/${tokenWs}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Tbk-Api-Key-Id': TBK_API_KEY_ID,
          'Tbk-Api-Key-Secret': TBK_API_KEY_SECRET,
        },
      }
    );

    const tx = await commitRes.json();
    const aprobado =
      commitRes.ok &&
      tx?.status === 'AUTHORIZED' &&
      Number(tx?.response_code) === 0;

    const orden = tx?.buy_order || '';
    const authCode = tx?.authorization_code || '';
    const last4 = tx?.card_detail?.card_number || '';
    const paymentType = tx?.payment_type_code || '';
    const marca = mapearTipoPago(paymentType);

    await actualizarOrdenSupabase({
      p_token: tokenWs,
      p_orden_numero: orden || null,
      p_aprobado: aprobado,
      p_auth_code: authCode,
      p_card_last4: last4,
      p_payment_type: paymentType,
      p_marca: marca,
      p_detalle: aprobado
        ? 'Autorizado por Webpay Plus'
        : `Pago rechazado por el banco (código ${tx?.response_code ?? 'error'}).`,
    });

    const dest = new URL('/planes/retorno', origin);
    dest.searchParams.set('status', aprobado ? 'aprobado' : 'rechazado');
    if (orden) dest.searchParams.set('orden', orden);
    if (authCode) dest.searchParams.set('auth', authCode);
    if (last4) dest.searchParams.set('last4', last4);
    if (tx?.amount !== undefined) dest.searchParams.set('monto', String(tx.amount));
    dest.searchParams.set('marca', marca);

    return NextResponse.redirect(dest, 303);
  } catch {
    const dest = new URL('/planes/retorno', origin);
    dest.searchParams.set('status', 'error');
    return NextResponse.redirect(dest, 303);
  }
}

export async function GET(req: NextRequest) {
  return procesarRetorno(req);
}

export async function POST(req: NextRequest) {
  return procesarRetorno(req);
}