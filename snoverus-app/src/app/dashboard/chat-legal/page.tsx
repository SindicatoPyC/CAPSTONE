'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface Mensaje {
  id: string;
  autor: 'asistente' | 'usuario';
  contenido: string;
  fuente?: string;
  fecha: string;
  etiqueta?: string;
}

type TopicoId = 'beneficios' | 'vacaciones' | 'permisos' | 'despido' | 'fuero' | 'licencia';

// --- ICONOS VECTORIALES MINIMALISTAS (STROKE 1.75) ---
const Icons = {
  Scale: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  ),
  Send: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  ),
  BookOpen: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  RotateCcw: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  Check: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  ),
  Briefcase: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  FileText: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  ),
  HeartPulse: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
};

// --- COPIA SEGURA AL PORTAPAPELES ---
async function copiarTextoSeguro(texto: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Fallback
  }
  try {
    const el = document.createElement('textarea');
    el.value = texto;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  } catch {
    return false;
  }
}

// --- RENDERIZADOR EDITORIAL DE NEGRITAS Y LISTAS ---
function formatearInline(texto: string) {
  const partes = texto.split(/(\*\*.*?\*\*)/g);
  return partes.map((parte, index) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-white">
          {parte.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{parte}</span>;
  });
}

function ContenidoLegal({ texto }: { texto: string }) {
  const lineas = texto.split('\n');

  return (
    <div className="space-y-2 text-[13.5px] leading-relaxed text-slate-300">
      {lineas.map((linea, idx) => {
        const trimmed = linea.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed.startsWith('• ')) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e5b32a] mt-2 shrink-0" />
              <p className="flex-1">{formatearInline(trimmed.slice(2))}</p>
            </div>
          );
        }

        const matchNum = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (matchNum) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-0.5">
              <span className="font-mono text-[11px] font-semibold text-[#e5b32a] bg-[#e5b32a]/10 border border-[#e5b32a]/25 rounded-md w-5 h-5 flex items-center justify-center mt-0.5 shrink-0">
                {matchNum[1]}
              </span>
              <p className="flex-1">{formatearInline(matchNum[2])}</p>
            </div>
          );
        }

        return <p key={idx}>{formatearInline(trimmed)}</p>;
      })}
    </div>
  );
}

// --- MOTOR JURÍDICO LABORAL CHILENO (SIN EMOJIS, TONO INSTITUCIONAL) ---
function generarRespuestaLegalLocal(
  consulta: string,
  nombreSindicato: string
): { texto: string; fuente: string; etiqueta: string; notaResumen: string } {
  const q = consulta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (q.includes('hola') || q.includes('buenos dias') || q.includes('buenas') || q.includes('estas ahi')) {
    return {
      texto: `Bienvenido al módulo de Orientación Laboral de **${nombreSindicato}**.\n\nPuedes realizar consultas sobre las siguientes materias:\n• **Feriado legal y feriado progresivo** (Arts. 67 y 68 del Código del Trabajo).\n• **Permisos legales remunerados** (nacimiento, matrimonio, fallecimiento y exámenes preventivos).\n• **Bonos, aguinaldos y convenios vigentes** del Contrato Colectivo.\n• **Despidos, cálculo de finiquito y reserva de derechos** (Arts. 159, 160, 161 y 177).\n• **Fuero sindical y licencias médicas** (Ley 16.744 y Libro III).`,
      fuente: `${nombreSindicato} · Marco Normativo Activo`,
      etiqueta: 'Orientación General',
      notaResumen: 'Selecciona un tópico en el panel lateral o redacta tu situación para consultar el artículo aplicable.',
    };
  }

  if (q.includes('vacacion') || q.includes('feriado')) {
    return {
      texto: `De acuerdo con el **Artículo 67 del Código del Trabajo de Chile**:\n\n1. **Derecho Base:** Todo trabajador con más de un año de servicio tiene derecho a un feriado anual de **15 días hábiles** con remuneración íntegra.\n2. **Cómputo de Días:** Para efectos del feriado legal, el día sábado se considera siempre inhábil; el conteo se realiza exclusivamente de lunes a viernes.\n3. **Feriado Progresivo (Art. 68):** Quien acredite 10 años de trabajo, continuos o no, para uno o más empleadores, tiene derecho a un día adicional por cada 3 nuevos años trabajados con su empleador actual.\n4. **Continuidad:** El descanso debe otorgarse de forma continua por al menos 10 días hábiles, pudiendo fraccionarse el exceso de común acuerdo.`,
      fuente: 'Código del Trabajo · Arts. 67 al 70',
      etiqueta: 'Feriado Legal',
      notaResumen: 'El día sábado es siempre inhábil para el cálculo de vacaciones (Art. 69).',
    };
  }

  if (q.includes('permiso') || q.includes('fallecimiento') || q.includes('matrimonio') || q.includes('nacimiento')) {
    return {
      texto: `La legislación laboral chilena garantiza los siguientes **permisos pagados**, independientes del feriado anual:\n\n• **Nacimiento de hijo (Art. 195):** 5 días pagados para el padre, utilizables de forma continua desde el parto o distribuidos dentro del primer mes.\n• **Matrimonio o Acuerdo de Unión Civil (Art. 207 bis):** 5 días hábiles continuos de permiso pagado adicionales a las vacaciones.\n• **Fallecimiento de hijo o cónyuge (Art. 66):** 10 días corridos de permiso pagado, acompañados de fuero laboral de 1 mes.\n• **Fallecimiento de padre, madre o hermano (Art. 66):** 4 días hábiles de permiso pagado.\n• **Exámenes preventivos de salud (Art. 66 bis):** Medio día anual pagado para exámenes de mamografía, próstata o Papanicolaou.`,
      fuente: 'Código del Trabajo · Arts. 66, 195 y 207 bis',
      etiqueta: 'Permisos Pagados',
      notaResumen: 'Estos permisos son 100% remunerados y no pueden imputarse a tus días de feriado legal.',
    };
  }

  if (q.includes('bono') || q.includes('beneficio') || q.includes('convenio') || q.includes('ayuda')) {
    return {
      texto: `En **${nombreSindicato}**, las asignaciones y convenios para socios se rigen por el **Contrato Colectivo vigente** y el Reglamento de Bienestar:\n\n• **Asignaciones Colectivas:** Escolaridad, natalidad, matrimonio y aguinaldos de Fiestas Patrias y Navidad.\n• **Salud y Bienestar:** Convenios ópticos, dentales, reembolsos médicos y seguro complementario.\n• **Fondo Solidario:** Apoyo económico directo ante emergencias médicas o situaciones catastróficas.\n\nPuedes revisar la disponibilidad y solicitar tu comprobante digital directamente en la sección **Beneficios** del menú principal.`,
      fuente: `Contrato Colectivo y Estatutos · ${nombreSindicato}`,
      etiqueta: 'Convenios y Bonos',
      notaResumen: 'Todo canje de beneficio emite un comprobante oficial vinculado a tu RUT de socio.',
    };
  }

  if (q.includes('despido') || q.includes('finiquito') || q.includes('indemnizacion') || q.includes('articulo 161') || q.includes('necesidades de la empresa')) {
    return {
      texto: `Ante el término de la relación laboral, el **Código del Trabajo** establece las siguientes garantías:\n\n1. **Necesidades de la Empresa (Art. 161):** Otorga indemnización por años de servicio (1 mes por año con tope de 11 años y límite de 90 UF) más indemnización sustitutiva si no hubo aviso previo de 30 días.\n2. **Plazo de Pago del Finiquito (Art. 177):** El empleador dispone de un máximo de **10 días hábiles** desde la separación para poner el finiquito y su pago a disposición.\n3. **Reserva de Derechos:** Si discrepas de la causal o del descuento del seguro de cesantía (AFC), puedes firmar escribiendo de puño y letra: **"Me reservo el derecho a demandar por despido injustificado y devolución del aporte AFC"**.\n4. **Plazo de Reclamo (Art. 168):** Cuentas con 60 días hábiles desde la separación para recurrir a la Inspección del Trabajo o tribunales laborales.`,
      fuente: 'Código del Trabajo · Arts. 159, 160, 161, 168 y 177',
      etiqueta: 'Término de Contrato',
      notaResumen: 'Estampar una Reserva de Derechos clara te permite cobrar lo indiscutido sin renunciar a reclamar.',
    };
  }

  if (q.includes('fuero') || q.includes('sindicato') || q.includes('directiva') || q.includes('asamblea')) {
    return {
      texto: `Marco de protección sobre **Libertad Sindical y Fuero Laboral** en Chile:\n\n• **Fuero de Candidatos (Art. 238):** Los candidatos al directorio sindical gozan de fuero desde la comunicación oficial de la lista hasta la realización de la elección.\n• **Fuero de Directores Sindicales (Art. 243):** Rige desde la elección hasta 6 meses después de cesar en el cargo; impide el despido sin autorización judicial previa (desafuero).\n• **Fuero en Negociación Colectiva (Art. 309):** Los socios involucrados en negociación reglada cuentan con fuero desde 10 días antes de presentar el proyecto hasta 30 días después de firmado el instrumento colectivo.`,
      fuente: 'Libro III del Código del Trabajo · Organizaciones Sindicales',
      etiqueta: 'Fuero Sindical',
      notaResumen: 'Ningún trabajador con fuero vigente puede ser desvinculado sin autorización judicial previa.',
    };
  }

  if (q.includes('licencia') || q.includes('enfermedad') || q.includes('mutual') || q.includes('accidente')) {
    return {
      texto: `Normativa aplicable a **Licencias Médicas y Accidentes del Trabajo (Ley 16.744)**:\n\n• **Plazo de Presentación:** En el sector privado existen **2 días hábiles** desde el inicio del reposo para presentar la licencia al empleador (si es electrónica, se notifica automáticamente).\n• **Protección frente al Despido (Art. 161 inc. final):** Un trabajador con licencia médica vigente por enfermedad común, accidente del trabajo o enfermedad profesional **no puede ser despedido** por necesidades de la empresa.\n• **Accidente de Trabajo o Trayecto:** Debe notificarse mediante formulario DIAT a la mutualidad correspondiente dentro de las 24 horas siguientes al evento.`,
      fuente: 'D.S. Nº 3 MINSAL · Ley 16.744 · Art. 161 Código del Trabajo',
      etiqueta: 'Salud y Licencias',
      notaResumen: 'Durante el reposo por licencia médica está prohibido invocar necesidades de la empresa.',
    };
  }

  return {
    texto: `Respecto a tu consulta sobre **"${consulta}"** en el marco de **${nombreSindicato}**:\n\n1. **Irrenunciabilidad de Derechos (Art. 5º):** Los derechos establecidos en el Código del Trabajo y en el Instrumento Colectivo vigente son irrenunciables mientras subsista el contrato laboral.\n2. **Modificaciones Contractuales (Art. 11):** Ningún cambio de funciones, turnos, remuneraciones o anexos puede imponerse de forma unilateral sin consentimiento expreso de ambas partes.\n\nPara citar el articulado exacto, indícame si tu consulta corresponde a **vacaciones, permisos pagados, beneficios, despido y finiquito, fuero sindical o licencias médicas**.`,
    fuente: `Código del Trabajo Arts. 5º y 11 · ${nombreSindicato}`,
    etiqueta: 'Consulta General',
    notaResumen: 'Todo anexo de contrato requiere acuerdo mutuo y no puede rebajar pisos colectivos vigentes.',
  };
}

const CRITERIOS_LEGALES = [
  {
    ref: 'Art. 5º y 11 · Código del Trabajo',
    texto: 'Ningún anexo de contrato individual puede rebajar los pisos y beneficios establecidos en tu instrumento colectivo vigente.',
  },
  {
    ref: 'Art. 66 bis · Prevención de Salud',
    texto: 'Todo trabajador cuenta con medio día laboral pagado al año para realizarse exámenes médicos preventivos.',
  },
  {
    ref: 'Art. 177 · Reserva de Derechos',
    texto: 'Ante dudas en un finiquito, puedes recibir el pago y dejar constancia manuscrita de tu Reserva de Derechos antes de firmar.',
  },
  {
    ref: 'Art. 69 · Feriado Legal',
    texto: 'El día sábado se considera siempre inhábil al contabilizar tus 15 días hábiles de vacaciones anuales.',
  },
];

const TOPICOS_CONSULTA: {
  id: TopicoId;
  label: string;
  desc: string;
  query: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'beneficios',
    label: 'Bonos y Beneficios',
    desc: 'Contrato colectivo y bienestar',
    query: '¿Cuáles son los bonos y beneficios sindicales vigentes?',
    icon: <Icons.Briefcase />,
  },
  {
    id: 'vacaciones',
    label: 'Feriado Legal',
    desc: 'Art. 67 y feriado progresivo',
    query: '¿Cuántos días de vacaciones me corresponden por ley?',
    icon: <Icons.Calendar />,
  },
  {
    id: 'permisos',
    label: 'Permisos Pagados',
    desc: 'Nacimiento, matrimonio y salud',
    query: '¿Qué permisos pagados contempla el Código del Trabajo?',
    icon: <Icons.Clock />,
  },
  {
    id: 'despido',
    label: 'Despido y Finiquito',
    desc: 'Art. 161 y reserva de derechos',
    query: '¿Cuáles son mis derechos ante un despido y firma de finiquito?',
    icon: <Icons.FileText />,
  },
  {
    id: 'fuero',
    label: 'Fuero Sindical',
    desc: 'Protección legal y negociación',
    query: '¿Cómo funciona el fuero sindical y en negociación colectiva?',
    icon: <Icons.Scale />,
  },
  {
    id: 'licencia',
    label: 'Licencias Médicas',
    desc: 'Plazos y protección Ley 16.744',
    query: '¿Cuáles son mis derechos con licencia médica o accidente laboral?',
    icon: <Icons.HeartPulse />,
  },
];

export default function ChatLegalPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: 'bienvenida',
      autor: 'asistente',
      etiqueta: 'Asesoría Laboral',
      contenido:
        'Bienvenido a la Mesa de Orientación Jurídica. Estoy conectado al marco regulatorio del **Código del Trabajo de Chile** y los estatutos vigentes de tu organización.\n\nSelecciona una materia en el panel lateral o escribe tu consulta para recibir el articulado correspondiente.',
      fuente: 'Código del Trabajo · Orientación Institucional',
      fecha: '',
    },
  ]);
  const [inputConsulta, setInputConsulta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [nombreSindicato, setNombreSindicato] = useState<string>('Sindicato PyC');
  const [notaActiva, setNotaActiva] = useState<string>(CRITERIOS_LEGALES[0].texto);
  const [refActiva, setRefActiva] = useState<string>(CRITERIOS_LEGALES[0].ref);
  const [criterioIdx, setCriterioIdx] = useState<number>(0);
  const [topicoActivo, setTopicoActivo] = useState<TopicoId | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Ref exclusivo del contenedor interno de mensajes (evita que scrollIntoView mueva la página entera)
  const mensajesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const horaInicial = new Date().toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setMensajes((prev) =>
      prev.map((m) => (m.id === 'bienvenida' ? { ...m, fecha: horaInicial } : m))
    );

    async function loadTenantContext() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('sindicato_id, role')
          .eq('id', user.id)
          .maybeSingle();

        let targetId = profile?.sindicato_id;
        if (String(profile?.role || '').toLowerCase() === 'superadmin') {
          const cached = localStorage.getItem('sindicato_activo');
          if (cached) targetId = Number(cached);
        }

        if (targetId) {
          const { data: sindData } = await supabase
            .from('sindicatos')
            .select('nombre')
            .eq('id', targetId)
            .maybeSingle();

          if (sindData?.nombre) setNombreSindicato(sindData.nombre);
        }
      } catch {
        // Silencioso
      }
    }
    loadTenantContext();
  }, []);

  // Desliza SOLO la caja interna de mensajes y mantiene estático el scroll de la página
  useEffect(() => {
    if (mensajes.length <= 1 && !enviando) return;
    const container = mensajesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [mensajes, enviando]);

  const rotarCriterioLegal = () => {
    const next = (criterioIdx + 1) % CRITERIOS_LEGALES.length;
    setCriterioIdx(next);
    setRefActiva(CRITERIOS_LEGALES[next].ref);
    setNotaActiva(CRITERIOS_LEGALES[next].texto);
  };

  const copiarRespuesta = async (id: string, texto: string) => {
    const limpio = texto.replace(/\*\*/g, '');
    const ok = await copiarTextoSeguro(limpio);
    if (ok) {
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 2000);
    }
  };

  const handleEnviar = async (
    e?: React.FormEvent,
    promptSugerido?: string,
    topicoId?: TopicoId
  ) => {
    if (e) e.preventDefault();
    const textoAEnviar = (promptSugerido || inputConsulta).trim();
    if (!textoAEnviar || enviando) return;

    if (topicoId) setTopicoActivo(topicoId);

    const horaActual = new Date().toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const nuevoMensajeUsuario: Mensaje = {
      id: Date.now().toString(),
      autor: 'usuario',
      contenido: textoAEnviar,
      fecha: horaActual,
    };

    setMensajes((prev) => [...prev, nuevoMensajeUsuario]);
    setInputConsulta('');
    setEnviando(true);

    await new Promise((resolve) => setTimeout(resolve, 420));
    const localRes = generarRespuestaLegalLocal(textoAEnviar, nombreSindicato);

    const respuestaAsistente: Mensaje = {
      id: (Date.now() + 1).toString(),
      autor: 'asistente',
      etiqueta: localRes.etiqueta,
      contenido: localRes.texto,
      fuente: localRes.fuente,
      fecha: new Date().toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMensajes((prev) => [...prev, respuestaAsistente]);
    setRefActiva(localRes.fuente);
    setNotaActiva(localRes.notaResumen);
    setEnviando(false);
  };

  const limpiarConversacion = () => {
    setTopicoActivo(null);
    setRefActiva(CRITERIOS_LEGALES[0].ref);
    setNotaActiva(CRITERIOS_LEGALES[0].texto);
    setMensajes([
      {
        id: Date.now().toString(),
        autor: 'asistente',
        etiqueta: 'Nueva Sesión',
        contenido: `Conversación reiniciada. ¿Qué materia laboral o estatutaria de **${nombreSindicato}** deseas consultar ahora?`,
        fuente: `${nombreSindicato} · Marco Normativo Activo`,
        fecha: new Date().toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
    if (mensajesContainerRef.current) {
      mensajesContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#0b0e14] text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 font-sans antialiased">
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ================= PANEL LATERAL: IDENTIDAD JURÍDICA Y TÓPICOS ================= */}
        <aside className="lg:col-span-4 flex flex-col justify-between rounded-2xl bg-[#10141e] border border-[#232a3b] p-5 sm:p-6 lg:h-[680px]">
          <div className="space-y-5 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#242c40] [&::-webkit-scrollbar-thumb]:rounded-full">
            {/* Identidad institucional */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#1f2637]">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#e5b32a]/12 border border-[#e5b32a]/35 text-[#e5b32a] flex items-center justify-center shrink-0">
                  <Icons.Scale className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#e5b32a]">
                    Asesoría Jurídica
                  </p>
                  <h1 className="text-base font-semibold text-white leading-tight truncate mt-0.5">
                    Consultor Laboral
                  </h1>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {nombreSindicato}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                En línea
              </span>
            </div>

            {/* Nota / Criterio Legal Activo */}
            <div className="rounded-xl bg-[#0b0e14] border border-[#222a3d] p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Criterio Destacado
                </span>
                <button
                  type="button"
                  onClick={rotarCriterioLegal}
                  className="text-[11px] font-medium text-[#e5b32a] hover:text-[#f3c64f] transition-colors cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={notaActiva}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-1.5"
                >
                  <p className="text-xs text-slate-200 leading-relaxed">{notaActiva}</p>
                  <p className="text-[11px] font-mono text-slate-500">{refActiva}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Tópicos de Consulta Directa */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Materias Frecuentes
                </span>
                <span className="text-[11px] text-slate-500">Consulta directa</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                {TOPICOS_CONSULTA.map((item) => {
                  const seleccionado = topicoActivo === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={enviando}
                      onClick={() => handleEnviar(undefined, item.query, item.id)}
                      className={`group text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer disabled:opacity-50 ${
                        seleccionado
                          ? 'bg-[#182032] border-[#e5b32a]/50 text-white'
                          : 'bg-[#121722] border-[#1f2637] hover:border-[#323d56] hover:bg-[#161c2b] text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                            seleccionado
                              ? 'bg-[#e5b32a]/15 border-[#e5b32a]/40 text-[#e5b32a]'
                              : 'bg-[#0b0e14] border-[#232a3b] text-slate-400 group-hover:text-[#e5b32a] group-hover:border-[#e5b32a]/30'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <span className="text-slate-500 group-hover:text-[#e5b32a] group-hover:translate-x-0.5 transition-all shrink-0">
                        <Icons.ChevronRight />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Nota de respaldo normativa */}
          <div className="mt-4 pt-4 border-t border-[#1f2637] flex items-start gap-2.5 text-[11px] text-slate-400 shrink-0">
            <div className="text-[#e5b32a] mt-0.5 shrink-0">
              <Icons.Shield />
            </div>
            <p className="leading-relaxed">
              Orientación referencial basada en el{' '}
              <strong className="text-slate-200 font-medium">Código del Trabajo de Chile</strong> y
              estatutos de <strong className="text-slate-200 font-medium">{nombreSindicato}</strong>.
            </p>
          </div>
        </aside>

        {/* ================= CONSOLA DE CONSULTA JURÍDICA ================= */}
        <section className="lg:col-span-8 flex flex-col rounded-2xl bg-[#10141e] border border-[#232a3b] overflow-hidden h-[620px] lg:h-[680px]">
          {/* Header limpio */}
          <header className="px-5 py-4 border-b border-[#1f2637] bg-[#0e121b] flex items-center justify-between gap-4 shrink-0">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight truncate">
                Mesa de Orientación Legal y Estatutaria
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {nombreSindicato} · Legislación Laboral Chilena Vigente
              </p>
            </div>

            <button
              type="button"
              onClick={limpiarConversacion}
              className="px-3.5 py-2 rounded-xl bg-[#161c2a] hover:bg-[#1e2638] text-slate-200 border border-[#2a3348] text-xs font-medium flex items-center gap-2 transition-colors shrink-0 cursor-pointer"
              title="Reiniciar conversación"
            >
              <Icons.RotateCcw />
              <span className="hidden sm:inline">Nueva consulta</span>
            </button>
          </header>

          {/* Flujo de Mensajes (Scroll 100% interno con barra oscura sutil) */}
          <div
            ref={mensajesContainerRef}
            className="flex-1 p-5 sm:p-6 overflow-y-auto overscroll-contain space-y-5 bg-[#0b0e14]/50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#242c40] hover:[&::-webkit-scrollbar-thumb]:bg-[#34405c] [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            <AnimatePresence initial={false}>
              {mensajes.map((m) => {
                const esUsuario = m.autor === 'usuario';
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${esUsuario ? 'justify-end' : 'justify-start'}`}
                  >
                    {esUsuario ? (
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-sm bg-[#1b2234] border border-[#2f3a54] px-4 py-3 text-sm text-white leading-relaxed">
                        <p>{m.contenido}</p>
                        {m.fecha && (
                          <span className="block text-[10px] font-mono text-slate-400 text-right mt-1.5">
                            {m.fecha}
                          </span>
                        )}
                      </div>
                    ) : (
                      <article className="max-w-[95%] sm:max-w-[86%] w-full rounded-2xl rounded-bl-sm bg-[#121722] border border-[#232b3e] p-5 space-y-3.5">
                        {/* Encabezado de la respuesta jurídica */}
                        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#1d2436]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-[#e5b32a]/12 border border-[#e5b32a]/30 text-[#e5b32a] flex items-center justify-center shrink-0">
                              <Icons.Scale className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-xs font-semibold text-white truncate">
                              {m.etiqueta || 'Orientación Jurídica'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => copiarRespuesta(m.id, m.contenido)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0b0e14] hover:bg-[#192030] border border-[#252e42] text-[11px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="Copiar texto"
                          >
                            {copiadoId === m.id ? (
                              <>
                                <span className="text-emerald-400">
                                  <Icons.Check />
                                </span>
                                <span className="text-emerald-300">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Icons.Copy />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Cuerpo estructurado */}
                        <ContenidoLegal texto={m.contenido} />

                        {/* Pie normativo */}
                        {m.fuente && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#1d2436] text-[11px] font-mono">
                            <div className="flex items-center gap-1.5 text-[#e5b32a]/90">
                              <Icons.BookOpen />
                              <span>{m.fuente}</span>
                            </div>
                            {m.fecha && <span className="text-slate-500">{m.fecha}</span>}
                          </div>
                        )}
                      </article>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {enviando && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#121722] border border-[#252e42] w-fit"
              >
                <span className="w-2 h-2 rounded-full bg-[#e5b32a] animate-pulse" />
                <span className="text-xs text-slate-300">
                  Consultando articulado del Código del Trabajo...
                </span>
              </motion.div>
            )}
          </div>

          {/* Barra Inferior de Entrada */}
          <form
            onSubmit={(e) => handleEnviar(e)}
            className="p-4 border-t border-[#1f2637] bg-[#0e121b] shrink-0"
          >
            <div className="flex items-center gap-2.5 bg-[#0b0e14] border border-[#283147] focus-within:border-[#e5b32a]/70 rounded-xl p-1.5 pl-4 transition-colors">
              <input
                type="text"
                value={inputConsulta}
                onChange={(e) => setInputConsulta(e.target.value)}
                disabled={enviando}
                placeholder="Escribe tu consulta sobre vacaciones, permisos, finiquitos, licencias o bonos..."
                className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={enviando || !inputConsulta.trim()}
                className="px-4 sm:px-5 py-2.5 bg-[#e5b32a] hover:bg-[#f0c038] disabled:bg-[#1a2030] disabled:text-slate-500 text-[#0b0e14] font-semibold rounded-lg text-xs sm:text-sm transition-colors flex items-center gap-2 shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Consultar</span>
                <Icons.Send />
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}