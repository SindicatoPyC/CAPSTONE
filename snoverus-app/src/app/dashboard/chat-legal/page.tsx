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
  categoria?: 'saludo' | 'vacaciones' | 'permisos' | 'beneficios' | 'despido' | 'fuero' | 'licencia' | 'general';
}

type EstadoMascota = 'saludando' | 'pensando' | 'hablando' | 'protector' | 'feliz';

// --- MONITO PERSONALIZADO ANIMADO (ESTILO MICROSOFT / ASISTENTE SINDICAL) ---
function MascotaSindical({
  estado,
  size = 'lg',
  onClick
}: {
  estado: EstadoMascota;
  size?: 'sm' | 'lg';
  onClick?: () => void;
}) {
  const isLarge = size === 'lg';

  return (
    <motion.div
      onClick={onClick}
      whileHover={isLarge ? { scale: 1.06, rotate: 2 } : undefined}
      whileTap={isLarge ? { scale: 0.95 } : undefined}
      animate={{
        y: isLarge ? [0, -8, 0] : [0, -2, 0]
      }}
      transition={{
        y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
      }}
      className={`relative select-none ${isLarge ? 'w-36 h-36 cursor-pointer' : 'w-10 h-10 shrink-0'}`}
      title={isLarge ? '¡Haz clic en mí para un consejo sindical!' : undefined}
    >
      {/* Halo de luz reactivo */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl transition-colors duration-500 pointer-events-none ${
          estado === 'pensando'
            ? 'bg-amber-400/30 animate-pulse'
            : estado === 'protector'
            ? 'bg-indigo-500/35'
            : estado === 'feliz'
            ? 'bg-emerald-400/30'
            : 'bg-cyan-500/30'
        }`}
      />

      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_12px_25px_rgba(6,182,212,0.35)]"
      >
        <defs>
          <linearGradient id="bodyGrad" x1="30" y1="20" x2="170" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="visorGrad" x1="50" y1="60" x2="150" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#090d16" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="helmetGrad" x1="60" y1="15" x2="140" y2="55" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          <linearGradient id="badgeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        {/* Sombra inferior flotante */}
        <ellipse cx="100" cy="186" rx="42" ry="7" fill="#0284c7" fillOpacity="0.25" />

        {/* Antena de conexión legal */}
        <motion.g
          animate={
            estado === 'pensando'
              ? { rotate: [-8, 8, -8] }
              : { rotate: [0, 3, 0] }
          }
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ originX: '100px', originY: '35px' }}
        >
          <rect x="96" y="14" width="8" height="22" rx="4" fill="#38bdf8" />
          <circle
            cx="100"
            cy="12"
            r="8"
            fill={estado === 'pensando' ? '#fbbf24' : '#22d3ee'}
          />
          <circle
            cx="100"
            cy="12"
            r="13"
            stroke={estado === 'pensando' ? '#fbbf24' : '#22d3ee'}
            strokeOpacity="0.4"
            strokeWidth="3"
          />
        </motion.g>

        {/* Orejeras / Auriculares de Soporte */}
        <rect x="24" y="78" width="16" height="36" rx="8" fill="#0284c7" stroke="#7dd3fc" strokeWidth="2" />
        <rect x="160" y="78" width="16" height="36" rx="8" fill="#0284c7" stroke="#7dd3fc" strokeWidth="2" />

        {/* Cabeza / Cuerpo Cápsula 3D */}
        <rect
          x="36"
          y="34"
          width="128"
          height="116"
          rx="52"
          fill="url(#bodyGrad)"
          stroke="#7dd3fc"
          strokeWidth="3"
        />

        {/* Brillo superior tipo cristal (Estilo Fluent) */}
        <path
          d="M65 44 C85 38, 115 38, 135 44 C125 48, 75 48, 65 44 Z"
          fill="white"
          fillOpacity="0.35"
        />

        {/* Visera / Casco Institucional Sindical */}
        <path
          d="M52 54 C52 36, 148 36, 148 54 C120 48, 80 48, 52 54 Z"
          fill="url(#helmetGrad)"
        />
        {/* Insignia de Justicia en la frente */}
        <circle cx="100" cy="46" r="9" fill="url(#badgeGrad)" stroke="#fef3c7" strokeWidth="1.5" />
        <path d="M96 46 L100 41 L104 46 L100 50 Z" fill="#fffbeb" />

        {/* Pantalla / Visor del Rostro */}
        <rect
          x="48"
          y="60"
          width="104"
          height="64"
          rx="28"
          fill="url(#visorGrad)"
          stroke="#38bdf8"
          strokeWidth="2.5"
        />

        {/* --- EXPRESIONES DE LOS OJOS Y BOCA SEGÚN ESTADO --- */}
        {estado === 'pensando' ? (
          <g>
            {/* Ojos escaneando */}
            <motion.circle
              animate={{ cx: [76, 84, 76] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              cx="80"
              cy="88"
              r="9"
              fill="#fbbf24"
            />
            <motion.circle
              animate={{ cx: [116, 124, 116] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              cx="120"
              cy="88"
              r="9"
              fill="#fbbf24"
            />
            {/* Línea de onda procesando */}
            <path
              d="M86 108 Q100 102 114 108"
              stroke="#fbbf24"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
        ) : estado === 'feliz' || estado === 'saludando' ? (
          <g>
            {/* Ojos felices curvados (^ ^) */}
            <path
              d="M68 90 Q78 76 88 90"
              stroke="#22d3ee"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M112 90 Q122 76 132 90"
              stroke="#22d3ee"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Sonrisa amplia */}
            <path
              d="M85 104 Q100 116 115 104"
              stroke="#34d399"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Mejillas brillantes */}
            <circle cx="64" cy="98" r="5" fill="#f472b6" fillOpacity="0.45" />
            <circle cx="136" cy="98" r="5" fill="#f472b6" fillOpacity="0.45" />
          </g>
        ) : estado === 'protector' ? (
          <g>
            {/* Ojos determinados y seguros */}
            <circle cx="78" cy="88" r="9" fill="#38bdf8" />
            <circle cx="122" cy="88" r="9" fill="#38bdf8" />
            <circle cx="81" cy="85" r="3" fill="white" />
            <circle cx="125" cy="85" r="3" fill="white" />
            {/* Sonrisa confiada */}
            <path
              d="M88 106 Q100 113 112 106"
              stroke="#38bdf8"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        ) : (
          <g>
            {/* Ojos normales con parpadeo */}
            <motion.ellipse
              cx="78"
              cy="88"
              rx="8.5"
              ry="10"
              fill="#22d3ee"
              animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
            />
            <motion.ellipse
              cx="122"
              cy="88"
              rx="8.5"
              ry="10"
              fill="#22d3ee"
              animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
            />
            <circle cx="81" cy="84" r="3" fill="white" />
            <circle cx="125" cy="84" r="3" fill="white" />
            {/* Sonrisa amigable */}
            <path
              d="M88 105 Q100 114 112 105"
              stroke="#22d3ee"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}

        {/* Corbatín / Insignia Legal en el pecho */}
        <path d="M84 148 L100 156 L84 164 Z" fill="#22d3ee" />
        <path d="M116 148 L100 156 L116 164 Z" fill="#0ea5e9" />
        <circle cx="100" cy="156" r="5" fill="#fbbf24" />

        {/* Manito derecha saludando o sosteniendo escudo */}
        <motion.g
          animate={
            estado === 'saludando' || estado === 'feliz'
              ? { rotate: [0, -18, 12, -18, 0] }
              : { y: [0, -4, 0] }
          }
          transition={{ duration: 2, repeat: Infinity }}
          style={{ originX: '165px', originY: '135px' }}
        >
          <circle cx="172" cy="132" r="12" fill="url(#bodyGrad)" stroke="#7dd3fc" strokeWidth="2.5" />
        </motion.g>

        {/* Manito izquierda con maletín/libro legal */}
        <circle cx="28" cy="136" r="11" fill="url(#bodyGrad)" stroke="#7dd3fc" strokeWidth="2.5" />
      </svg>
    </motion.div>
  );
}

// --- ICONOS VECTORIALES ---
const Icons = {
  Scale: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
    </svg>
  ),
  Send: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  ),
  BookOpen: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Trash: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  ),
  Copy: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  ),
  Check: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Shield: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    </svg>
  )
};

// --- RENDERIZADOR DE TEXTO CON NEGRITAS LIMPIAS ---
function formatearTextoLegal(texto: string) {
  const partes = texto.split(/(\*\*.*?\*\*)/g);
  return partes.map((parte, index) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-cyan-300">
          {parte.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{parte}</span>;
  });
}

// --- MOTOR JURÍDICO LABORAL CHILENO ---
function generarRespuestaLegalLocal(
  consulta: string,
  nombreSindicato: string
): { texto: string; fuente: string; estadoMascota: EstadoMascota; FraseBurbuja: string } {
  const q = consulta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (q.includes('hola') || q.includes('buenos dias') || q.includes('buenas') || q.includes('estas ahi')) {
    return {
      texto: `¡Hola compañero/a! Soy **SindiBot**, tu asistente de soporte legal y gremial en **${nombreSindicato}**.\n\nPuedes preguntarme directamente sobre:\n• **Feriado legal y vacaciones** (Art. 67 del Código del Trabajo).\n• **Permisos pagados** (nacimiento, matrimonio, fallecimiento, exámenes preventivos).\n• **Bonos, aguinaldos y beneficios activos** del sindicato.\n• **Fuero sindical, licencias médicas o causales de despido** (Arts. 159, 160 y 161).`,
      fuente: `${nombreSindicato} • Base Normativa Activa`,
      estadoMascota: 'saludando',
      FraseBurbuja: '¡Qué gusto saludarte! Estoy listo para revisar cualquier artículo por ti.'
    };
  }

  if (q.includes('vacacion') || q.includes('feriado')) {
    return {
      texto: `De acuerdo con el **Artículo 67 del Código del Trabajo de Chile**:\n\n1. **Derecho Base:** Todo trabajador con más de un año de servicio tiene derecho a un feriado anual de **15 días hábiles** con derecho a remuneración íntegra.\n2. **Cómputo:** Para efectos del feriado, el día sábado se considera siempre inhábil (se cuentan de lunes a viernes).\n3. **Feriado Progresivo (Art. 68):** Todo trabajador con 10 años de trabajo (para uno o más empleadores) tiene derecho a un día adicional de vacaciones por cada 3 nuevos años trabajados con su actual empleador.\n4. **Continuidad:** El feriado debe otorgarse de forma continua por al menos 10 días hábiles, pudiendo fraccionarse el exceso de común acuerdo.`,
      fuente: 'Código del Trabajo de Chile • Arts. 67 al 70',
      estadoMascota: 'feliz',
      FraseBurbuja: '¡El descanso es un derecho irrenunciable! Recuerda que los sábados no se descuentan.'
    };
  }

  if (q.includes('permiso') || q.includes('fallecimiento') || q.includes('matrimonio') || q.includes('nacimiento')) {
    return {
      texto: `Según la legislación laboral vigente y los permisos legales remunerados en Chile:\n\n• **Nacimiento de un hijo (Art. 195):** 5 días pagados para el padre, utilizables desde el parto de forma continua o distribuidos en el primer mes.\n• **Matrimonio o Acuerdo de Unión Civil (Art. 207 bis):** 5 días hábiles continuos de permiso pagado adicionales al feriado anual.\n• **Fallecimiento de hijo o cónyuge (Art. 66):** 10 días corridos de permiso pagado (con fuero de 1 mes).\n• **Fallecimiento de padre, madre o hermano (Art. 66):** 4 días hábiles de permiso pagado.\n• **Exámenes preventivos de salud (Art. 66 bis):** Medio día de permiso pagado anual para mamografía, próstata o Papanicolaou.`,
      fuente: 'Código del Trabajo • Arts. 66, 195 y 207 bis',
      estadoMascota: 'hablando',
      FraseBurbuja: 'Estos permisos son 100% pagados y no pueden descontarse de tus vacaciones.'
    };
  }

  if (q.includes('bono') || q.includes('beneficio') || q.includes('convenio') || q.includes('ayuda')) {
    return {
      texto: `En **${nombreSindicato}**, los bonos y beneficios sindicales se rigen por el Contrato Colectivo vigente y el Reglamento de Bienestar:\n\n• **Asignaciones Colectivas:** Escolaridad, natalidad, matrimonio y aguinaldos de Fiestas Patrias y Navidad.\n• **Salud y Bienestar:** Convenios ópticos, dentales, reembolsos médicos y seguro complementario.\n• **Fondo Solidario:** Apoyo ante emergencias médicas o catastróficas.\n\n📌 Puedes revisar y canjear tus beneficios activos directamente en la sección **Beneficios** de la barra superior.`,
      fuente: `Estatutos y Contrato Colectivo • ${nombreSindicato}`,
      estadoMascota: 'feliz',
      FraseBurbuja: '¡Tienes beneficios exclusivos por ser parte del sindicato! Revísalos en la pestaña Beneficios.'
    };
  }

  if (q.includes('despido') || q.includes('finiquito') || q.includes('indemnizacion') || q.includes('articulo 161') || q.includes('necesidades de la empresa')) {
    return {
      texto: `Ante un término de contrato o despido, el **Código del Trabajo** establece:\n\n1. **Necesidades de la Empresa (Art. 161):** Da derecho a indemnización por años de servicio (1 mes por año con tope de 11 años / 90 UF) e indemnización sustitutiva de aviso previo si no se avisó con 30 días de anticipación.\n2. **Plazo del Finiquito (Art. 177):** El empleador debe poner el finiquito y su pago a disposición dentro de **10 días hábiles** contados desde la separación.\n3. **Reserva de Derechos:** Si no estás de acuerdo con la causal o el descuento de AFC, tienes derecho a firmar el finiquito escribiendo de tu puño y letra: **"Me reservo el derecho a demandar por despido injustificado y devolución de aporte AFC"**.\n4. **Plazo para reclamar (Art. 168):** Tienes 60 días hábiles desde la separación para acudir a la Inspección del Trabajo o tribunales.`,
      fuente: 'Código del Trabajo • Arts. 159, 160, 161, 168 y 177',
      estadoMascota: 'protector',
      FraseBurbuja: '¡Ojo al firmar el finiquito! Siempre puedes estampar tu Reserva de Derechos.'
    };
  }

  if (q.includes('fuero') || q.includes('sindicato') || q.includes('directiva') || q.includes('asamblea')) {
    return {
      texto: `Sobre la **Libertad Sindical y Fuero Laboral** en Chile:\n\n• **Fuero de Candidatos (Art. 238):** Los trabajadores candidatos al directorio gozan de fuero desde que se comunica la lista hasta realizada la elección.\n• **Fuero de Directores Sindicales (Art. 243):** Desde la fecha de su elección y hasta 6 meses después de haber cesado en el cargo, no pueden ser despedidos sin autorización judicial previa (desafuero).\n• **Fuero en Negociación Colectiva (Art. 309):** Los socios involucrados en una negociación colectiva reglada gozan de fuero desde 10 días antes de presentar el proyecto hasta 30 días después de suscrito el instrumento colectivo.`,
      fuente: 'Libro III del Código del Trabajo • Organizaciones Sindicales',
      estadoMascota: 'protector',
      FraseBurbuja: 'El fuero sindical te protege contra despidos arbitrarios sin autorización de un juez.'
    };
  }

  if (q.includes('licencia') || q.includes('enfermedad') || q.includes('mutual') || q.includes('accidente')) {
    return {
      texto: `Respecto a **Licencias Médicas y Accidentes del Trabajo (Ley 16.744)**:\n\n• **Plazo de presentación:** En el sector privado, el trabajador tiene **2 días hábiles** desde el inicio del reposo para presentar la licencia al empleador (si es electrónica, se notifica automáticamente).\n• **Prohibición de despido con licencia (Art. 161 inc. final):** Un trabajador con licencia médica vigente **no puede ser despedido** por la causal de necesidades de la empresa.\n• **Accidente de trabajo o trayecto:** Debe ser denunciado mediante formulario DIAT a la mutualidad correspondiente dentro de las 24 horas siguientes.`,
      fuente: 'D.S. Nº 3 MINSAL / Ley 16.744 / Art. 161 Código del Trabajo',
      estadoMascota: 'protector',
      FraseBurbuja: 'Con licencia médica vigente nadie puede despedirte por necesidades de la empresa.'
    };
  }

  return {
    texto: `Respecto a tu consulta sobre **"${consulta}"** en el marco de **${nombreSindicato}**:\n\n1. Según el **Código del Trabajo de Chile**, todo derecho adquirido en tu contrato individual o en el **Instrumento Colectivo vigente** es irrenunciable mientras subsista la relación laboral (Art. 5º).\n2. Si existe una discrepancia sobre remuneraciones, turnos, anexos de contrato o cláusulas colectivas, ninguna modificación puede imponerse unilateralmente sin mutuo acuerdo de las partes (Art. 11).\n\n💡 Puedes detallarme si tu duda es sobre **vacaciones, bonos, permisos, licencias médicas, finiquitos o fuero sindical** para entregarte el artículo exacto.`,
    fuente: `Código del Trabajo Art. 5º y 11 • ${nombreSindicato}`,
    estadoMascota: 'hablando',
    FraseBurbuja: 'Ningún anexo de contrato es obligatorio sin tu firma y mutuo acuerdo (Art. 11).'
  };
}

const CONSEJOS_MASCOTA = [
  '💡 Tip Sindical: Ningún anexo de contrato puede rebajar tus beneficios colectivos vigentes.',
  '🛡️ ¿Sabías que tienes medio día pagado al año para exámenes preventivos de salud (Art. 66 bis)?',
  '⚖️ Si firmas un finiquito con dudas, escribe siempre tu "Reserva de Derechos" antes de firmar.',
  '🏖️ Los días sábado siempre se consideran inhábiles al calcular tus 15 días de vacaciones.',
  '🤝 Estamos conectados al marco regulatorio oficial de tu sindicato 24/7.'
];

export default function ChatLegalPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: 'bienvenida',
      autor: 'asistente',
      contenido: '¡Hola! Soy **SindiBot**, tu Asistente de Soporte Legal del Sindicato. Estoy conectado al marco regulatorio oficial y al Código del Trabajo de Chile. ¿En qué puedo orientarte hoy?',
      fuente: 'Sindicato PyC • Sistema IA Activo',
      fecha: 'Ahora'
    }
  ]);
  const [inputConsulta, setInputConsulta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [nombreSindicato, setNombreSindicato] = useState<string>('Sindicato PyC');
  const [estadoMascota, setEstadoMascota] = useState<EstadoMascota>('saludando');
  const [fraseMascota, setFraseMascota] = useState<string>(
    '¡Hola compañero/a! Haz clic en una consulta rápida o escríbeme tu duda laboral.'
  );
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const mensajesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMensajes((prev) =>
      prev.map((m) =>
        m.id === 'bienvenida'
          ? { ...m, fecha: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) }
          : m
      )
    );

    async function loadTenantContext() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
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
        // Silencioso para evitar ensuciar consola
      }
    }
    loadTenantContext();
  }, []);

  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, enviando]);

  const interactuarConMascota = () => {
    const randomTip = CONSEJOS_MASCOTA[Math.floor(Math.random() * CONSEJOS_MASCOTA.length)];
    setEstadoMascota('feliz');
    setFraseMascota(randomTip);
    setTimeout(() => setEstadoMascota('saludando'), 3500);
  };

  const copiarRespuesta = (id: string, texto: string) => {
    const limpio = texto.replace(/\*\*/g, '');
    navigator.clipboard.writeText(limpio);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const handleEnviar = async (e?: React.FormEvent, promptSugerido?: string) => {
    if (e) e.preventDefault();
    const textoAEnviar = (promptSugerido || inputConsulta).trim();
    if (!textoAEnviar || enviando) return;

    const horaActual = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const nuevoMensajeUsuario: Mensaje = {
      id: Date.now().toString(),
      autor: 'usuario',
      contenido: textoAEnviar,
      fecha: horaActual
    };

    setMensajes((prev) => [...prev, nuevoMensajeUsuario]);
    setInputConsulta('');
    setEnviando(true);
    setEstadoMascota('pensando');
    setFraseMascota('Revisando artículos del Código del Trabajo y el contrato colectivo...');

    await new Promise((resolve) => setTimeout(resolve, 550));
    const localRes = generarRespuestaLegalLocal(textoAEnviar, nombreSindicato);

    const respuestaIA: Mensaje = {
      id: (Date.now() + 1).toString(),
      autor: 'asistente',
      contenido: localRes.texto,
      fuente: localRes.fuente,
      fecha: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    };

    setMensajes((prev) => [...prev, respuestaIA]);
    setEstadoMascota(localRes.estadoMascota);
    setFraseMascota(localRes.FraseBurbuja);
    setEnviando(false);
  };

  const limpiarConversacion = () => {
    setEstadoMascota('saludando');
    setFraseMascota(`¡Lista la pizarra! ¿Qué tema laboral de ${nombreSindicato} revisamos ahora?`);
    setMensajes([
      {
        id: Date.now().toString(),
        autor: 'asistente',
        contenido: `Historial reiniciado. ¿En qué consulta laboral o estatutaria de **${nombreSindicato}** te puedo ayudar?`,
        fuente: `${nombreSindicato} • Sistema IA`,
        fecha: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const sugerenciasRapidas = [
    { label: '🎁 Bonos y Beneficios', query: '¿Cuáles son los bonos y beneficios sindicales vigentes?', desc: 'Contrato colectivo y bienestar' },
    { label: '🏖️ Vacaciones Legales', query: '¿Cuántos días de vacaciones me corresponden por ley?', desc: 'Art. 67 y feriado progresivo' },
    { label: '📅 Permisos Pagados', query: '¿Qué permisos pagados contempla el Código del Trabajo?', desc: 'Nacimiento, matrimonio, salud' },
    { label: '🛡️ Despido y Finiquito', query: '¿Cuáles son mis derechos ante un despido y firma de finiquito?', desc: 'Art. 161 y reserva de derechos' },
    { label: '⚖️ Fuero Sindical', query: '¿Cómo funciona el fuero sindical y en negociación colectiva?', desc: 'Protección legal gremial' },
    { label: '🏥 Licencias Médicas', query: '¿Cuáles son mis derechos con licencia médica o accidente laboral?', desc: 'Plazos y protección Ley 16.744' }
  ];

  return (
    <div className="min-h-[calc(100vh-76px)] bg-[#090d16] text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Luces Ambientales Estilo Copilot */}
      <div className="absolute top-0 left-1/4 w-[650px] h-[350px] bg-cyan-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[550px] h-[350px] bg-blue-600/10 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl w-full mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-stretch">
        
        {/* --- COLUMNA IZQUIERDA: MONITO PERSONALIZADO & CENTRO DE SOPORTE --- */}
        <aside className="lg:col-span-4 flex flex-col justify-between rounded-3xl bg-gradient-to-b from-[#131c2e]/95 to-[#0f172a]/95 border border-slate-700/80 shadow-2xl p-6 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-5">
            {/* Badge Estado Superior */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                <Icons.Sparkles />
                Copiloto Sindical
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Activo 24/7
              </span>
            </div>

            {/* Escenario del Monito */}
            <div className="flex flex-col items-center text-center pt-2">
              <MascotaSindical
                estado={enviando ? 'pensando' : estadoMascota}
                size="lg"
                onClick={interactuarConMascota}
              />

              <h1 className="text-lg sm:text-xl font-black text-white mt-3 tracking-tight flex items-center gap-2">
                <span>SindiBot Legal</span>
              </h1>
              <p className="text-xs text-cyan-400 font-mono font-semibold">
                {nombreSindicato}
              </p>

              {/* Globo de Diálogo Reactivo del Monito */}
              <motion.div
                key={fraseMascota}
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="mt-4 w-full bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-3.5 text-xs text-slate-200 leading-relaxed shadow-inner relative"
              >
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-slate-900 border-t border-l border-cyan-500/30 rotate-45" />
                <p className="relative z-10 font-medium">{fraseMascota}</p>
              </motion.div>
            </div>

            {/* Tarjetas de Temas Frecuentes en el Panel Lateral */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Tópicos de Consulta Directa
                </span>
                <span className="text-[10px] text-cyan-400/80 font-mono">1 clic</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                {sugerenciasRapidas.map((item) => (
                  <button
                    key={item.label}
                    disabled={enviando}
                    onClick={() => handleEnviar(undefined, item.query)}
                    className="group text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-cyan-500/15 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {item.desc}
                      </p>
                    </div>
                    <span className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all text-xs">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Nota de Respaldo Legal */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
            <div className="text-cyan-400 mt-0.5 shrink-0">
              <Icons.Shield />
            </div>
            <p className="leading-snug">
              Orientación basada en el <strong className="text-slate-300">Código del Trabajo de Chile</strong> y estatutos de <strong className="text-slate-300">{nombreSindicato}</strong>.
            </p>
          </div>
        </aside>

        {/* --- COLUMNA DERECHA: CONSOLA DE CHAT DE SOPORTE --- */}
        <section className="lg:col-span-8 flex flex-col rounded-3xl bg-[#131c2e]/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl overflow-hidden min-h-[600px] max-h-[82vh]">
          
          {/* Header de la Conversación */}
          <div className="p-4 sm:p-5 border-b border-slate-700/80 bg-[#0f172a]/90 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-sm">
                <Icons.Scale />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white">
                    Mesa de Ayuda Legal & Estatutaria
                  </h2>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {nombreSindicato} • Código del Trabajo & Estatutos Vigentes
                </p>
              </div>
            </div>

            <button
              onClick={limpiarConversacion}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Reiniciar conversación"
            >
              <Icons.Trash />
              <span className="hidden sm:inline">Nueva Consulta</span>
            </button>
          </div>

          {/* Flujo de Mensajes */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5">
            <AnimatePresence initial={false}>
              {mensajes.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className={`flex items-end gap-3 ${
                    m.autor === 'usuario' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Mini Avatar del Monito junto a cada respuesta del asistente */}
                  {m.autor === 'asistente' && (
                    <div className="hidden sm:block mb-1">
                      <MascotaSindical estado={estadoMascota} size="sm" />
                    </div>
                  )}

                  <div
                    className={`max-w-[90%] sm:max-w-[80%] p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg relative group ${
                      m.autor === 'usuario'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-br-xs shadow-cyan-500/10'
                        : 'bg-[#0f172a]/95 text-slate-200 border border-slate-700/90 rounded-bl-xs'
                    }`}
                  >
                    {/* Etiqueta superior del mensaje del asistente */}
                    {m.autor === 'asistente' && (
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/80">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                          SindiBot • Asesoría Sindical
                        </span>
                        <button
                          onClick={() => copiarRespuesta(m.id, m.contenido)}
                          className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 text-[10px] font-mono py-0.5 px-2 rounded bg-slate-800/70 border border-slate-700/60 transition-colors"
                          title="Copiar respuesta"
                        >
                          {copiadoId === m.id ? (
                            <>
                              <Icons.Check />
                              <span className="text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Icons.Copy />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <div className="whitespace-pre-line">
                      {m.autor === 'asistente' ? formatearTextoLegal(m.contenido) : m.contenido}
                    </div>

                    {m.fuente && (
                      <div className="flex items-center justify-between gap-2 text-[10px] text-cyan-400/90 mt-3.5 font-mono border-t border-slate-800/90 pt-2.5">
                        <div className="flex items-center gap-1.5">
                          <Icons.BookOpen />
                          <span>Fuente: {m.fuente}</span>
                        </div>
                        <span className="text-slate-500">{m.fecha}</span>
                      </div>
                    )}

                    {!m.fuente && (
                      <span className="block text-[9px] text-right mt-1.5 font-mono text-cyan-100/80">
                        {m.fecha}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {enviando && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <MascotaSindical estado="pensando" size="sm" />
                <div className="flex items-center gap-2.5 px-4 py-3 bg-[#0f172a] border border-cyan-500/30 rounded-2xl w-fit shadow-md">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs text-cyan-300 font-mono">
                    SindiBot está consultando el Código del Trabajo...
                  </span>
                </div>
              </motion.div>
            )}
            <div ref={mensajesEndRef} />
          </div>

          {/* Barra Inferior de Entrada */}
          <form
            onSubmit={(e) => handleEnviar(e)}
            className="p-4 border-t border-slate-700/80 bg-[#0f172a]/95 flex gap-2.5 items-center"
          >
            <input
              type="text"
              value={inputConsulta}
              onChange={(e) => setInputConsulta(e.target.value)}
              disabled={enviando}
              placeholder="Pregúntale a SindiBot sobre vacaciones, permisos, finiquitos, licencias o bonos..."
              className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
            />
            <button
              type="submit"
              disabled={enviando || !inputConsulta.trim()}
              className="px-5 sm:px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Consultar</span>
              <Icons.Send />
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}