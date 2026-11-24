import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface PayloadBeneficio {
  tipo: 'beneficio';
  to_email: string;
  to_name?: string;
  sindicato_nombre?: string;
  socio_rut?: string;
  beneficio_titulo: string;
  beneficio_categoria?: string;
  beneficio_descuento?: string;
  beneficio_descripcion?: string;
  folio?: string;
}

interface PayloadTicket {
  tipo: 'ticket';
  to_email: string;
  to_name?: string;
  sindicato_nombre?: string;
  socio_rut?: string;
  ticket_id?: string | number;
  ticket_asunto: string;
  ticket_categoria?: string;
  ticket_prioridad?: string;
  ticket_mensaje: string;
  ticket_estado?: string;
}

type PayloadCorreo = PayloadBeneficio | PayloadTicket;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function construirHtmlBeneficio(data: PayloadBeneficio, fecha: string): {
  subject: string;
  html: string;
} {
  const sindicato = escapeHtml(data.sindicato_nombre || 'Sindicato PYC');
  const nombre = escapeHtml(data.to_name || 'Socio/a');
  const rut = escapeHtml(data.socio_rut || 'No informado');
  const titulo = escapeHtml(data.beneficio_titulo);
  const categoria = escapeHtml(data.beneficio_categoria || 'General');
  const descuento = escapeHtml(data.beneficio_descuento || 'Convenio vigente');
  const descripcion = escapeHtml(
    data.beneficio_descripcion || 'Beneficio disponible para socios activos.'
  );
  const folio = escapeHtml(
    data.folio || `BEN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
  );

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comprobante de Beneficio · ${sindicato}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background-color:#0b0e14;padding:26px 28px;border-bottom:4px solid #3b82f6;">
              <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;color:#93c5fd;">
                ${sindicato}
              </p>
              <h1 style="margin:0 0 6px 0;color:#ffffff;font-size:22px;font-weight:800;">
                Comprobante de Beneficio
              </h1>
              <p style="margin:0;color:#94a3b8;font-size:12px;font-family:Consolas,monospace;">
                Folio ${folio} &nbsp;·&nbsp; ${fecha}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px;">
              <div style="background-color:#eff6ff;border-left:4px solid #3b82f6;padding:14px 18px;margin-bottom:22px;border-radius:0 10px 10px 0;">
                <p style="margin:0 0 4px 0;color:#1e3a8a;font-size:14px;font-weight:700;">
                  Solicitud registrada para ${nombre}
                </p>
                <p style="margin:0;color:#1e40af;font-size:13px;line-height:1.5;">
                  Presenta este comprobante digital en el establecimiento asociado para hacer efectivo tu convenio.
                </p>
              </div>

              <div style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:20px;">
                <p style="margin:0 0 4px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;">
                  Convenio Solicitado
                </p>
                <h2 style="margin:0 0 16px 0;font-size:19px;font-weight:800;color:#0f172a;padding-bottom:14px;border-bottom:1px solid #e2e8f0;">
                  ${titulo}
                </h2>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:13.5px;">
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-weight:600;width:34%;border-bottom:1px solid #f1f5f9;">Socio (RUT):</td>
                    <td style="padding:8px 0;color:#0f172a;font-weight:700;border-bottom:1px solid #f1f5f9;">${nombre} (${rut})</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-weight:600;border-bottom:1px solid #f1f5f9;">Categoría:</td>
                    <td style="padding:8px 0;color:#0f172a;font-weight:700;border-bottom:1px solid #f1f5f9;">${categoria}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-weight:600;border-bottom:1px solid #f1f5f9;">Descuento:</td>
                    <td style="padding:8px 0;color:#15803d;font-weight:800;border-bottom:1px solid #f1f5f9;">${descuento}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-weight:600;vertical-align:top;">Detalle:</td>
                    <td style="padding:8px 0;color:#334155;line-height:1.5;">${descripcion}</td>
                  </tr>
                </table>
              </div>

              <p style="margin:0;font-size:12px;color:#64748b;text-align:center;line-height:1.5;">
                Documento válido como comprobante de afiliación activa en <strong>${sindicato}</strong>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;">
              Generado automáticamente por el Portal ${sindicato} · No responder a este correo.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: `[${data.sindicato_nombre || 'Sindicato PYC'}] Comprobante de Beneficio: ${data.beneficio_titulo}`,
    html,
  };
}

function construirHtmlTicket(data: PayloadTicket, fecha: string): {
  subject: string;
  html: string;
} {
  const sindicato = escapeHtml(data.sindicato_nombre || 'Sindicato PYC');
  const nombre = escapeHtml(data.to_name || 'Socio/a');
  const rut = escapeHtml(data.socio_rut || 'No informado');
  const ticketNum = escapeHtml(
    data.ticket_id ? `#${data.ticket_id}` : `TK-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const asunto = escapeHtml(data.ticket_asunto);
  const categoria = escapeHtml(data.ticket_categoria || 'Soporte General');
  const prioridad = escapeHtml(data.ticket_prioridad || 'Normal');
  const estado = escapeHtml(data.ticket_estado || 'Pendiente');
  const mensaje = escapeHtml(data.ticket_mensaje).replace(/\n/g, '<br />');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ticket de Soporte ${ticketNum} · ${sindicato}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background-color:#0b0e14;padding:26px 28px;border-bottom:4px solid #e5b32a;">
              <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;color:#e5b32a;">
                Mesa de Ayuda · ${sindicato}
              </p>
              <h1 style="margin:0 0 6px 0;color:#ffffff;font-size:21px;font-weight:800;">
                Ticket Recibido (${ticketNum})
              </h1>
              <p style="margin:0;color:#94a3b8;font-size:12px;font-family:Consolas,monospace;">
                Estado: ${estado} &nbsp;·&nbsp; ${fecha}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 12px 0;font-size:14.5px;font-weight:600;color:#0f172a;">
                Hola ${nombre},
              </p>
              <p style="margin:0 0 20px 0;font-size:13.5px;line-height:1.6;color:#475569;">
                Hemos recibido tu solicitud en la Mesa de Soporte de <strong>${sindicato}</strong>. La directiva revisará tu caso a la brevedad y podrás seguir el estado desde tu portal.
              </p>

              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:13px;">
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-weight:600;width:34%;">Asunto:</td>
                    <td style="padding:6px 0;color:#0f172a;font-weight:700;">${asunto}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-weight:600;">Categoría:</td>
                    <td style="padding:6px 0;color:#0f172a;">${categoria}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-weight:600;">Prioridad:</td>
                    <td style="padding:6px 0;color:#0f172a;">${prioridad}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-weight:600;">RUT Socio:</td>
                    <td style="padding:6px 0;color:#0f172a;font-family:Consolas,monospace;">${rut}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #e5b32a;border-radius:0 10px 10px 0;padding:14px 18px;">
                <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#64748b;">
                  Detalle enviado
                </p>
                <p style="margin:0;font-size:13.5px;line-height:1.6;color:#334155;">
                  ${mensaje}
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;">
              Portal Institucional ${sindicato} · Comprobante automático de soporte.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: `[${data.sindicato_nombre || 'Sindicato PYC'}] Ticket ${ticketNum} recibido: ${data.ticket_asunto}`,
    html,
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();

    if (!apiKey || !senderEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Faltan BREVO_API_KEY o BREVO_SENDER_EMAIL en las variables de entorno.',
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as PayloadCorreo;

    if (!body?.tipo || !body?.to_email) {
      return NextResponse.json(
        { ok: false, error: 'Faltan tipo o to_email en la solicitud.' },
        { status: 400 }
      );
    }

    const fecha = new Date().toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let subject = '';
    let htmlContent = '';

    if (body.tipo === 'beneficio') {
      if (!body.beneficio_titulo) {
        return NextResponse.json(
          { ok: false, error: 'Falta beneficio_titulo para emitir el comprobante.' },
          { status: 400 }
        );
      }
      const built = construirHtmlBeneficio(body, fecha);
      subject = built.subject;
      htmlContent = built.html;
    } else if (body.tipo === 'ticket') {
      if (!body.ticket_asunto || !body.ticket_mensaje) {
        return NextResponse.json(
          { ok: false, error: 'Faltan ticket_asunto o ticket_mensaje.' },
          { status: 400 }
        );
      }
      const built = construirHtmlTicket(body, fecha);
      subject = built.subject;
      htmlContent = built.html;
    } else {
      return NextResponse.json(
        { ok: false, error: 'Tipo de correo no soportado.' },
        { status: 400 }
      );
    }

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: body.sindicato_nombre || 'Sindicato PYC',
          email: senderEmail,
        },
        to: [
          {
            email: body.to_email.trim().toLowerCase(),
            name: body.to_name || 'Socio',
          },
        ],
        subject,
        htmlContent,
      }),
    });

    const brevoData = await brevoRes.json().catch(() => ({}));

    if (!brevoRes.ok) {
      console.error('Error respuesta Brevo:', brevoData);
      return NextResponse.json(
        {
          ok: false,
          error: brevoData?.message || 'Brevo rechazó el envío del correo.',
        },
        { status: brevoRes.status }
      );
    }

    return NextResponse.json({
      ok: true,
      messageId: brevoData?.messageId || null,
    });
  } catch (err: any) {
    console.error('Error en /api/correos:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error interno enviando el correo.' },
      { status: 500 }
    );
  }
}