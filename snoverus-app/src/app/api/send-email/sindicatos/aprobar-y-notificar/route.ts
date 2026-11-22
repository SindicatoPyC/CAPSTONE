import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const BENEFIT_NAMES: Record<string, string> = {
  portal_socios: 'Portal de socios con login por RUT',
  beneficios_basicos: 'Gestión de beneficios básicos',
  beneficios_completos: 'Gestión de beneficios completa',
  actas_documentos: 'Actas y documentos digitales',
  notificaciones_realtime: 'Notificaciones en tiempo real',
  asistente_ia_rag: 'Asistente Legal IA (RAG)',
  power_bi: 'Analítica y tableros Power BI',
};

const PLAN_LABELS: Record<string, string> = {
  basico: 'Plan Básico ($4.990/mes)',
  estandar: 'Plan Estándar ($9.990/mes)',
  premium: 'Plan Premium ($14.990/mes)',
};

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Faltan variables de entorno de Supabase en el servidor.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      requestId,
      unionName,
      unionRut,
      companyRut,
      contactEmail,
      selectedPlan,
      maxMembers,
      benefits,
    } = body;

    if (!requestId || !unionName || !unionRut || !contactEmail || !selectedPlan) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios para aprobar el sindicato.' },
        { status: 400 }
      );
    }

    // 1. Guardar plan y beneficios en organizations
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .upsert(
        {
          name: unionName,
          rut_sindicato: unionRut,
          rut_empresa: companyRut,
          plan_id: selectedPlan,
          max_members: maxMembers,
          enabled_benefits: benefits,
          subscription_status: 'active',
        },
        { onConflict: 'rut_sindicato' }
      )
      .select('id')
      .single();

    if (orgError) {
      return NextResponse.json(
        { error: `Error al guardar en organizations: ${orgError.message}` },
        { status: 500 }
      );
    }

    // 2. Actualizar estado en union_purchase_requests
    const { error: reqError } = await supabaseAdmin
      .from('union_purchase_requests')
      .update({
        status: 'approved',
        assigned_plan_id: selectedPlan,
        assigned_benefits: benefits,
        assigned_max_members: maxMembers,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (reqError) {
      return NextResponse.json(
        { error: `Error al actualizar solicitud: ${reqError.message}` },
        { status: 500 }
      );
    }

    const activeBenefits = Object.entries(benefits || {})
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => BENEFIT_NAMES[key] || key);

    return NextResponse.json({
      ok: true,
      organizationId: org?.id,
      emailPayload: {
        to_email: contactEmail,
        union_name: unionName,
        union_rut: unionRut,
        company_rut: companyRut || 'No informado',
        plan_name: PLAN_LABELS[selectedPlan] || selectedPlan,
        max_members: maxMembers ? `${maxMembers} socios` : 'Ilimitados',
        benefits_list: activeBenefits.join(', '),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno en la aprobación.' },
      { status: 500 }
    );
  }
}