import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { mensaje, sindicatoId } = await req.json();

    if (!mensaje || !mensaje.trim()) {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No está configurada la variable GEMINI_API_KEY en el servidor.' },
        { status: 500 }
      );
    }

    // 1. Conexión a Supabase para obtener contexto del sindicato
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let contextoSindicato = 'Convenios generales y Código del Trabajo de Chile.';
    if (sindicatoId) {
      const { data: sindicato } = await supabase
        .from('sindicatos')
        .select('nombre, configuracion')
        .eq('id', sindicatoId)
        .maybeSingle();

      if (sindicato?.nombre) {
        contextoSindicato = `Organización: ${sindicato.nombre}.`;
      }
    }

    // 2. Prompt de Sistema especializado en Derecho Laboral Chileno
    const promptSistema = `
      Eres el Asistente Legal Inteligente del Sindicato, integrado en la plataforma Sindicato-PyC.
      Tu misión es orientar a los trabajadores y socios sobre sus dudas laborales en Chile.
      
      Marco normativo aplicable:
      - Código del Trabajo de Chile (licencias médicas, fueros sindicales y maternales, tipos de contrato, causales de despido arts. 159, 160 y 161).
      - Dictámenes de la Dirección del Trabajo (DT).
      - Negociación colectiva y contratos colectivos vigentes.
      Contexto de la organización sindical: ${contextoSindicato}

      Instrucciones de formato y tono:
      - Responde con precisión jurídica pero en lenguaje claro, cercano y comprensible para el trabajador.
      - Si una consulta requiere patrocinio presencial, aconseja acudir a su dirigente sindical o a la Inspección del Trabajo.
      - Sé conciso y directo en los puntos clave.
    `;

    // 3. Llamada directa a la API de Gemini (modelo flash rápido sin servidores intermedios)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const resIA = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${promptSistema}\n\nPregunta del socio: ${mensaje}` }
            ]
          }
        ]
      })
    });

    if (!resIA.ok) {
      const errData = await resIA.json();
      console.error('Error Gemini API:', errData);
      throw new Error('Error al consultar con el modelo de lenguaje.');
    }

    const dataIA = await resIA.json();
    const textoRespuesta =
      dataIA.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No se pudo generar una respuesta jurídica en este momento.';

    return NextResponse.json({ respuesta: textoRespuesta });

  } catch (error: any) {
    console.error('Error en /api/chat-legal:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}