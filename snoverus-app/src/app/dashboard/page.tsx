'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../app/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// --- ICONOGRAFÍA VECTORIAL V6 ---
const Icons = {
  Sparkles: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  ),
  Bank: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  TrendUp: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  Dollar: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  VideoCamera: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  VoteCheck: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 12 2 2 4-4"/><rect x="3" y="4" width="18" height="16" rx="3"/>
    </svg>
  ),
  ArrowUpRight: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
    </svg>
  ),
  Palette: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  ),
  IdCard: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
    </svg>
  ),
  Gift: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" x2="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  Scale: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
    </svg>
  ),
  FileText: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/>
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  Calculator: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>
    </svg>
  ),
  Check: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Minus: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
};

const DEFAULT_CONFIG = {
  tema: {
    fondo_base: '#090d16',
    color_tarjetas: '#131b2e',
    color_acento: '#06b6d4',
    color_borde: '#1e293b'
  },
  hero: { 
    tag: 'ECOSISTEMA SINDICAL DIGITAL', 
    titulo: 'Unidos Somos Más Fuertes.', 
    subtitulo: 'Fondo solidario, contención y apoyo mutuo ante cualquier emergencia.' 
  },
  carrusel_slides: [
    { 
      id: 1, 
      tag: 'NEGOCIACIÓN COLECTIVA 2026', 
      titulo: 'Mesa de Diálogo y Acuerdos Estratégicos', 
      bajada: 'Revisa los avances del petitorio, propuestas del directorio y el calendario oficial de votaciones.',
      href: '/dashboard/negociacion'
    },
    { 
      id: 2, 
      tag: 'BENEFICIOS & BIENESTAR', 
      titulo: 'Red de Convenios y Descuentos Activos', 
      bajada: 'Descubre coberturas exclusivas en salud, educación, recreación y reembolsos directos para socios.',
      href: '/dashboard/beneficios'
    },
    { 
      id: 3, 
      tag: 'TRANSPARENCIA INSTITUCIONAL', 
      titulo: 'Libro de Actas y Acuerdos al Día', 
      bajada: 'Accede en tiempo real a las actas firmadas por el directorio y auditorías contables del sindicato.',
      href: '/dashboard/actas'
    }
  ],
  modulos: { pulso_economico: true, asistente_legal: true, participacion_activa: true, actualidad: true }
};

const PRESET_THEMES = [
  {
    nombre: 'Aurora Marina',
    fondo_base: '#090d16',
    color_tarjetas: '#131b2e',
    color_acento: '#06b6d4',
    color_borde: '#1e293b'
  },
  {
    nombre: 'Esmeralda Pro',
    fondo_base: '#061311',
    color_tarjetas: '#0d211e',
    color_acento: '#10b981',
    color_borde: '#143832'
  },
  {
    nombre: 'Índigo Real',
    fondo_base: '#0a0d1d',
    color_tarjetas: '#141a35',
    color_acento: '#6366f1',
    color_borde: '#232c54'
  },
  {
    nombre: 'Ámbar Ejecutivo',
    fondo_base: '#14100d',
    color_tarjetas: '#221a15',
    color_acento: '#f59e0b',
    color_borde: '#382a21'
  }
];

function normalizarSlides(slidesRaw: any[]): typeof DEFAULT_CONFIG.carrusel_slides {
  if (!Array.isArray(slidesRaw) || slidesRaw.length === 0) return DEFAULT_CONFIG.carrusel_slides;
  return slidesRaw.map((s, idx) => ({
    id: s.id || idx + 1,
    tag: s.tag || s.badge || 'OFICIAL',
    titulo: s.titulo || 'Información Sindical',
    bajada: s.bajada || s.texto || 'Revisa los detalles actualizados en las secciones oficiales de tu portal.',
    href: s.href || '/dashboard/actas'
  }));
}

interface ToastNotif {
  id: number;
  tipo: 'exito' | 'error' | 'info';
  mensaje: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [asambleas, setAsambleas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [votoEstado, setVotoEstado] = useState<string>('');
  
  const [userRol, setUserRol] = useState<string>('socio');
  const [userNombre, setUserNombre] = useState<string>('Socio/a');
  const [sindicatoId, setSindicatoId] = useState<number | null>(null);
  const [sindicatoNombre, setSindicatoNombre] = useState<string>('');

  const [modulosVisibles, setModulosVisibles] = useState<Record<string, boolean>>({
    credencial: true,
    beneficios: true,
    actas: true,
    legal: true
  });

  const [slideActual, setSlideActual] = useState(0);
  const [carruselPausado, setCarruselPausado] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardandoCambios, setGuardandoCambios] = useState(false);
  const [comunicadoSeleccionado, setComunicadoSeleccionado] = useState<any | null>(null);

  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [filtroComunicados, setFiltroComunicados] = useState('');
  const [calcAbierta, setCalcAbierta] = useState(false);
  const [calcMonto, setCalcMonto] = useState<string>('1');
  const [calcUnidad, setCalcUnidad] = useState<'uf' | 'utm' | 'dolar'>('uf');
  const [toasts, setToasts] = useState<ToastNotif[]>([]);

  const [accesoBloqueado, setAccesoBloqueado] = useState({ bloqueado: false, motivo: '' });
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [indicadores, setIndicadores] = useState<any>({ uf: null, utm: null, dolar: null, cargando: true });

  const lanzarToast = (mensaje: string, tipo: 'exito' | 'error' | 'info' = 'exito') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, tipo, mensaje }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    let active = true;
    const supabase = createClient();
    let activeChannel: any = null;

    async function initDashboard() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/');
          return;
        }

        const user = session.user;
        const { data: profile } = await supabase
          .from('profiles')
          .select('sindicato_id, role, estado, full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (!active) return;

        if (profile?.estado?.toLowerCase() === 'suspendido') {
          setAccesoBloqueado({ bloqueado: true, motivo: 'Tu cuenta se encuentra suspendida temporalmente.' });
          setLoading(false);
          return;
        }

        const rolActual = String(profile?.role || 'socio').toLowerCase();
        setUserRol(rolActual);
        if (profile?.full_name) {
          setUserNombre(profile.full_name.split(' ')[0]);
        }

        let targetSindicatoId = profile?.sindicato_id;
        if (rolActual === 'superadmin') {
          const cached = localStorage.getItem('sindicato_activo');
          if (cached) targetSindicatoId = Number(cached);
        }

        if (targetSindicatoId) {
          setSindicatoId(targetSindicatoId);

          const { data: sindicatoData } = await supabase
            .from('sindicatos')
            .select('configuracion, config_ui, nombre, estado')
            .eq('id', targetSindicatoId)
            .maybeSingle();

          if (!active) return;

          if (sindicatoData?.estado?.toLowerCase() === 'suspendido') {
            setAccesoBloqueado({ bloqueado: true, motivo: 'El acceso de tu organización se encuentra inactivo.' });
            setLoading(false);
            return;
          }

          if (sindicatoData) {
            setSindicatoNombre(sindicatoData.nombre || 'Organización Sindical');
            
            if (sindicatoData.config_ui?.modulos_activos) {
              const ma = sindicatoData.config_ui.modulos_activos;
              setModulosVisibles({
                credencial: ma.credencial !== undefined ? Boolean(ma.credencial) : true,
                beneficios: ma.beneficios !== undefined ? Boolean(ma.beneficios) : true,
                actas: ma.actas !== undefined ? Boolean(ma.actas) : true,
                legal: ma.legal !== undefined ? Boolean(ma.legal) : true
              });
            }

            if (sindicatoData.configuracion) {
              const dbConfig = sindicatoData.configuracion;
              setConfig({
                tema: { ...DEFAULT_CONFIG.tema, ...(dbConfig.tema || {}) },
                hero: { ...DEFAULT_CONFIG.hero, ...(dbConfig.hero || {}) },
                carrusel_slides: normalizarSlides(dbConfig.carrusel_slides),
                modulos: { ...DEFAULT_CONFIG.modulos, ...(dbConfig.modulos || {}) }
              });
            }
          }

          const [comData, asamData] = await Promise.all([
            supabase.from('comunicados').select('*').eq('sindicato_id', targetSindicatoId).limit(10),
            supabase.from('asambleas_votaciones').select('*').eq('sindicato_id', targetSindicatoId).eq('estado', 'Abierta')
          ]);

          if (active) {
            if (Array.isArray(comData.data)) {
              const ordenados = [...comData.data].sort((a, b) => {
                const fA = new Date(a.fecha_creacion || a.created_at || 0).getTime();
                const fB = new Date(b.fecha_creacion || b.created_at || 0).getTime();
                return fB - fA;
              });
              setComunicados(ordenados.slice(0, 8));
            }
            if (Array.isArray(asamData.data)) setAsambleas(asamData.data);
          }

          // Suscripción Realtime aislada
          try {
            const existingChannels = supabase.getChannels();
            existingChannels.forEach((ch: any) => {
              if (ch.topic?.includes('sindicato-config')) {
                supabase.removeChannel(ch);
              }
            });

            const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            activeChannel = supabase.channel(`rt-dash-${targetSindicatoId}-${uniqueId}`);
            activeChannel
              .on(
                'postgres_changes',
                {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'sindicatos',
                  filter: `id=eq.${targetSindicatoId}`
                },
                (payload: any) => {
                  if (!active) return;
                  if (payload.new?.configuracion) {
                    const newConfig = payload.new.configuracion;
                    setConfig({
                      tema: { ...DEFAULT_CONFIG.tema, ...(newConfig.tema || {}) },
                      hero: { ...DEFAULT_CONFIG.hero, ...(newConfig.hero || {}) },
                      carrusel_slides: normalizarSlides(newConfig.carrusel_slides),
                      modulos: { ...DEFAULT_CONFIG.modulos, ...(newConfig.modulos || {}) }
                    });
                  }
                  if (payload.new?.config_ui?.modulos_activos) {
                    const ma = payload.new.config_ui.modulos_activos;
                    setModulosVisibles({
                      credencial: ma.credencial !== undefined ? Boolean(ma.credencial) : true,
                      beneficios: ma.beneficios !== undefined ? Boolean(ma.beneficios) : true,
                      actas: ma.actas !== undefined ? Boolean(ma.actas) : true,
                      legal: ma.legal !== undefined ? Boolean(ma.legal) : true
                    });
                  }
                  if (payload.new?.nombre) setSindicatoNombre(payload.new.nombre);
                }
              )
              .subscribe();
          } catch {
            // Silencioso
          }
        }
      } catch {
        // Silencioso
      } finally {
        if (active) setLoading(false);
      }

      try {
        const res = await fetch('https://mindicador.cl/api');
        const data = await res.json();
        if (active) {
          setIndicadores({ 
            uf: data.uf?.valor || 37950, 
            utm: data.utm?.valor || 66500, 
            dolar: data.dolar?.valor || 965, 
            cargando: false 
          });
        }
      } catch {
        if (active) {
          setIndicadores({ uf: 37950, utm: 66500, dolar: 965, cargando: false });
        }
      }
    }

    initDashboard();

    return () => {
      active = false;
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [isMounted, router]);

  useEffect(() => {
    if (modoEdicion || carruselPausado || config.carrusel_slides.length <= 1) return;
    const intervalo = setInterval(() => {
      setSlideActual((prev) => (prev + 1) % config.carrusel_slides.length);
    }, 8000);
    return () => clearInterval(intervalo);
  }, [config.carrusel_slides, modoEdicion, carruselPausado]);

  const handleVotar = async (asambleaId: string, opcion: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('rut').eq('id', user.id).maybeSingle();
    if (!profile?.rut) {
      lanzarToast('No se encontró un RUT asociado a tu perfil para auditar el voto.', 'error');
      return;
    }

    const { error } = await supabase
      .from('votos_registrados')
      .insert([{ asamblea_id: asambleaId, usuario_rut: profile.rut, opcion_elegida: opcion }]);

    if (error) {
      if (error.code === '23505') {
        lanzarToast('Ya has emitido tu sufragio oficial en esta asamblea.', 'info');
      } else {
        lanzarToast('Error al registrar voto: ' + error.message, 'error');
      }
    } else {
      setVotoEstado(opcion);
      lanzarToast(`Sufragio "${opcion}" registrado y encriptado con éxito.`, 'exito');
    }
  };

  const guardarConfiguracion = async () => {
    if (!sindicatoId) return;
    setGuardandoCambios(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('sindicatos')
        .update({ configuracion: config })
        .eq('id', sindicatoId);
      
      if (error) throw error;
      setModoEdicion(false);
      lanzarToast('Diseño institucional publicado en vivo para todos los socios.', 'exito');
    } catch (err: any) {
      lanzarToast('Error al guardar: ' + err.message, 'error');
    } finally {
      setGuardandoCambios(false);
    }
  };

  const aplicarPreset = (preset: typeof PRESET_THEMES[0]) => {
    setConfig({
      ...config,
      tema: {
        fondo_base: preset.fondo_base,
        color_tarjetas: preset.color_tarjetas,
        color_acento: preset.color_acento,
        color_borde: preset.color_borde
      }
    });
    lanzarToast(`Tema "${preset.nombre}" previsualizado.`, 'info');
  };

  const actualizarSlideEnEdicion = (campo: 'tag' | 'titulo' | 'bajada', valor: string) => {
    const copia = [...config.carrusel_slides];
    copia[slideActual] = { ...copia[slideActual], [campo]: valor };
    setConfig({ ...config, carrusel_slides: copia });
  };

  const obtenerSaludoHorario = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const calcularConversionCLP = () => {
    const num = parseFloat(calcMonto.replace(',', '.')) || 0;
    const tasa =
      calcUnidad === 'uf'
        ? indicadores.uf || 37950
        : calcUnidad === 'utm'
        ? indicadores.utm || 66500
        : indicadores.dolar || 965;
    return Math.round(num * tasa).toLocaleString('es-CL');
  };

  const esAdmin = ['superadmin', 'admin', 'administrador', 'directiva'].includes(userRol.toLowerCase());
  const slide = config.carrusel_slides[slideActual] || DEFAULT_CONFIG.carrusel_slides[0];

  const accesosRapidos = [
    { 
      key: 'credencial', 
      label: 'Credencial Digital QR', 
      desc: 'Identificación oficial activa', 
      href: '/dashboard/credencial', 
      icon: <Icons.IdCard />,
      accent: '#06b6d4',
      badge: 'Pase QR'
    },
    { 
      key: 'beneficios', 
      label: 'Red de Beneficios', 
      desc: 'Convenios y reembolsos', 
      href: '/dashboard/beneficios', 
      icon: <Icons.Gift />,
      accent: '#10b981',
      badge: 'Convenios'
    },
    { 
      key: 'actas', 
      label: 'Repositorio de Actas', 
      desc: 'Acuerdos y transparencia', 
      href: '/dashboard/actas', 
      icon: <Icons.FileText />,
      accent: '#6366f1',
      badge: 'Oficial'
    },
    { 
      key: 'legal', 
      label: 'SindiBot Legal IA', 
      desc: 'Consultoría laboral 24/7', 
      href: '/dashboard/chat-legal', 
      icon: <Icons.Scale />,
      accent: '#f59e0b',
      badge: 'IA 24/7'
    }
  ].filter((item) => modulosVisibles[item.key]);

  const comunicadosFiltrados = comunicados.filter((c) => {
    if (!filtroComunicados.trim()) return true;
    const q = filtroComunicados.toLowerCase();
    return (
      String(c.titulo || '').toLowerCase().includes(q) ||
      String(c.contenido || '').toLowerCase().includes(q)
    );
  });

  if (!isMounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span suppressHydrationWarning className="text-xs font-mono text-cyan-400 tracking-widest uppercase font-semibold">
            Cargando Plataforma V6...
          </span>
        </div>
      </div>
    );
  }

  if (accesoBloqueado.bloqueado) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-slate-100 p-6">
        <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center border border-rose-500/30 mb-4 shadow-lg">
          <Icons.X/>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white mb-2">Acceso Restringido</h1>
        <p className="text-slate-300 text-xs sm:text-sm max-w-sm text-center mb-6 leading-relaxed">{accesoBloqueado.motivo}</p>
        <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold uppercase tracking-wider border border-slate-700 transition-all">
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen font-sans text-slate-100 pb-28 relative w-full overflow-x-hidden transition-colors duration-500 selection:bg-cyan-500 selection:text-slate-950"
      style={{ backgroundColor: config.tema.fondo_base }}
    >
      {/* --- SISTEMA DE NOTIFICACIONES TOAST V6 (SIN ALERT NATIVO) --- */}
      <div className="fixed top-20 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.95 }}
              className={`pointer-events-auto p-3.5 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold ${
                t.tipo === 'exito'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                  : t.tipo === 'error'
                  ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                  : 'bg-slate-900/95 border-cyan-500/40 text-cyan-200'
              }`}
            >
              <span className="p-1.5 rounded-lg bg-white/10 shrink-0">
                {t.tipo === 'error' ? <Icons.X /> : <Icons.Check />}
              </span>
              <span className="flex-1 leading-snug">{t.mensaje}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Luces Aurora Tridimensionales */}
      <div 
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] blur-[160px] opacity-25 pointer-events-none transition-all duration-700"
        style={{ background: `radial-gradient(ellipse at center, ${config.tema.color_acento} 0%, rgba(99,102,241,0.25) 45%, transparent 75%)` }}
      />
      <div className="absolute top-[350px] -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[600px] -left-40 w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[150px] pointer-events-none" />

      {/* Botón Flotante para Directiva / Superadmin */}
      {esAdmin && (
        <div className="fixed bottom-6 right-6 z-40">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setModoEdicion(!modoEdicion)} 
            className="flex items-center gap-2.5 px-5 py-3 bg-slate-900/95 hover:bg-slate-800 text-white border rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl text-xs font-bold tracking-wide transition-all cursor-pointer"
            style={{ borderColor: config.tema.color_acento }}
          >
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: config.tema.color_acento }}></span>
            <span>{modoEdicion ? 'Cerrar Estudio UI V6' : 'Personalizar UI V6'}</span>
          </motion.button>
        </div>
      )}

      {/* Panel de Personalización Multi-Tenant (JSONB) */}
      <AnimatePresence>
        {esAdmin && modoEdicion && (
          <motion.div 
            initial={{ opacity: 0, y: -25 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -25 }} 
            className="bg-slate-900/98 border-b border-slate-700 p-5 sm:p-6 sticky top-0 z-40 backdrop-blur-2xl shadow-2xl"
          >
            <div className="max-w-7xl mx-auto space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Icons.Palette />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Estudio de Diseño Multi-Tenant V6</h3>
                    <p className="text-[11px] text-slate-400">Personaliza colores, portada y diapositivas para todos los socios de {sindicatoNombre}.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setModoEdicion(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={guardarConfiguracion}
                    disabled={guardandoCambios}
                    className="px-5 py-2 text-slate-950 font-black rounded-xl text-xs tracking-wide transition-all shadow-lg cursor-pointer"
                    style={{ backgroundColor: config.tema.color_acento }}
                  >
                    {guardandoCambios ? 'Guardando...' : 'Publicar a Socios'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
                <div className="lg:col-span-4 space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block font-bold">Plantillas Ejecutivas</span>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_THEMES.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => aplicarPreset(preset)}
                        className="p-3 rounded-xl border text-left transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: preset.fondo_base, borderColor: preset.color_borde }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white text-[11px]">{preset.nombre}</span>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.color_acento }}></span>
                        </div>
                        <div className="flex gap-1 mt-2">
                          <div className="h-2 flex-1 rounded" style={{ backgroundColor: preset.color_tarjetas }}></div>
                          <div className="h-2 flex-1 rounded" style={{ backgroundColor: preset.color_acento }}></div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Fondo Base</span>
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1.5 rounded-xl">
                        <input 
                          type="color" 
                          value={config.tema.fondo_base} 
                          onChange={(e) => setConfig({ ...config, tema: { ...config.tema, fondo_base: e.target.value } })}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" 
                        />
                        <span className="font-mono text-[10px] text-slate-300 uppercase">{config.tema.fondo_base}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Tarjetas</span>
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1.5 rounded-xl">
                        <input 
                          type="color" 
                          value={config.tema.color_tarjetas} 
                          onChange={(e) => setConfig({ ...config, tema: { ...config.tema, color_tarjetas: e.target.value } })}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" 
                        />
                        <span className="font-mono text-[10px] text-slate-300 uppercase">{config.tema.color_tarjetas}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Acento</span>
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1.5 rounded-xl">
                        <input 
                          type="color" 
                          value={config.tema.color_acento} 
                          onChange={(e) => setConfig({ ...config, tema: { ...config.tema, color_acento: e.target.value } })}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" 
                        />
                        <span className="font-mono text-[10px] text-slate-300 uppercase">{config.tema.color_acento}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Borde</span>
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1.5 rounded-xl">
                        <input 
                          type="color" 
                          value={config.tema.color_borde} 
                          onChange={(e) => setConfig({ ...config, tema: { ...config.tema, color_borde: e.target.value } })}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" 
                        />
                        <span className="font-mono text-[10px] text-slate-300 uppercase">{config.tema.color_borde}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Título Principal (Hero)</label>
                      <input 
                        type="text" 
                        value={config.hero.titulo} 
                        onChange={(e) => setConfig({ ...config, hero: { ...config.hero, titulo: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Subtítulo Principal</label>
                      <input 
                        type="text" 
                        value={config.hero.subtitulo} 
                        onChange={(e) => setConfig({ ...config, hero: { ...config.hero, subtitulo: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none" 
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-cyan-400 block mb-1">Etiqueta Slide #{slideActual + 1}</label>
                      <input 
                        type="text" 
                        value={slide.tag} 
                        onChange={(e) => actualizarSlideEnEdicion('tag', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-cyan-400 block mb-1">Título Slide #{slideActual + 1}</label>
                      <input 
                        type="text" 
                        value={slide.titulo} 
                        onChange={(e) => actualizarSlideEnEdicion('titulo', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-cyan-400 block mb-1">Descripción Slide #{slideActual + 1}</label>
                      <input 
                        type="text" 
                        value={slide.bajada} 
                        onChange={(e) => actualizarSlideEnEdicion('bajada', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-8 relative z-10">
        
        {/* --- BARRA SUPERIOR EJECUTIVA V6 (SALUDO + BUSCADOR RÁPIDO CTRL+K + CALCULADORA) --- */}
        <div 
          className="p-3.5 sm:px-5 rounded-2xl border border-white/[0.08] backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shadow-lg"
          style={{ backgroundColor: `${config.tema.color_tarjetas}B3` }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-slate-950 shadow-sm"
              style={{ backgroundColor: config.tema.color_acento }}
            >
              {userNombre.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>{obtenerSaludoHorario()}, {userNombre}</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  ● Socio Verificado
                </span>
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                {sindicatoNombre || 'Portal Sindical'} • Rol: <span className="uppercase text-slate-300">{userRol}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setCalcAbierta(!calcAbierta)}
              className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-slate-200 flex items-center gap-2 transition-all cursor-pointer"
              title="Convertidor de Bonos en UF / UTM a Pesos"
            >
              <Icons.Calculator />
              <span className="text-[11px] font-semibold">Calculadora UF/UTM</span>
            </button>

            <button
              onClick={() => setCommandOpen(true)}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-black/30 hover:bg-black/50 border border-white/10 hover:border-cyan-500/40 text-xs text-slate-400 flex items-center justify-between gap-4 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Icons.Search />
                <span>Buscar módulo o aviso...</span>
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/10 text-slate-300 rounded border border-white/10">
                Ctrl K
              </kbd>
            </button>
          </div>
        </div>

        {/* --- CALCULADORA SINDICAL DESPLEGABLE (BONOS EN UF / UTM A CLP) --- */}
        <AnimatePresence>
          {calcAbierta && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div 
                className="p-5 rounded-2xl border border-cyan-500/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                style={{ backgroundColor: config.tema.color_tarjetas }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase">
                    <Icons.Calculator />
                    <span>Simulador Sindical de Bonos e Indemnizaciones</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Calcula al instante a cuántos pesos chilenos equivalen tus cláusulas en UF, UTM o Dólar hoy.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={calcMonto}
                    onChange={(e) => setCalcMonto(e.target.value)}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                  />
                  <select
                    value={calcUnidad}
                    onChange={(e) => setCalcUnidad(e.target.value as 'uf' | 'utm' | 'dolar')}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-cyan-300 focus:outline-none"
                  >
                    <option value="uf">UF (${indicadores.uf?.toLocaleString('es-CL')})</option>
                    <option value="utm">UTM (${indicadores.utm?.toLocaleString('es-CL')})</option>
                    <option value="dolar">USD (${indicadores.dolar?.toLocaleString('es-CL')})</option>
                  </select>

                  <div className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-sm font-black">
                    = ${calcularConversionCLP()} CLP
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Section V6 */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border backdrop-blur-xl shadow-lg"
            style={{ 
              borderColor: `${config.tema.color_acento}45`,
              backgroundColor: `${config.tema.color_tarjetas}CC` 
            }}
          >
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: config.tema.color_acento }} />
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold" style={{ color: config.tema.color_acento }}>
              {sindicatoNombre || 'Portal Oficial'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold">Red Verificada V6</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-transparent leading-[1.1] pb-1"
          >
            {config.hero.titulo}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs sm:text-base text-slate-300/90 max-w-2xl mx-auto leading-relaxed font-normal"
          >
            {config.hero.subtitulo}
          </motion.p>
        </section>

        {/* Pulso Financiero Interactivo (Clic abre la Calculadora) */}
        {config.modulos.pulso_economico && (
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { 
                key: 'uf' as const,
                label: 'Unidad de Fomento (UF)', 
                value: indicadores.uf, 
                desc: 'Clic para simular bono en UF', 
                icon: <Icons.Bank/>, 
                trend: 'En Línea',
                accent: '#10b981'
              },
              { 
                key: 'utm' as const,
                label: 'Unidad Tributaria (UTM)', 
                value: indicadores.utm, 
                desc: 'Clic para simular monto UTM', 
                icon: <Icons.TrendUp/>, 
                trend: 'Mensual',
                accent: '#6366f1'
              },
              { 
                key: 'dolar' as const,
                label: 'Dólar Observado (USD)', 
                value: indicadores.dolar, 
                desc: 'Mercado Spot Oficial CMF', 
                icon: <Icons.Dollar/>, 
                trend: 'Spot CMF',
                accent: '#06b6d4'
              }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -4 }}
                onClick={() => {
                  setCalcUnidad(item.key);
                  setCalcAbierta(true);
                }}
                className="group relative rounded-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 overflow-hidden flex items-center justify-between ring-1 ring-white/[0.07] cursor-pointer"
                style={{ 
                  background: `linear-gradient(145deg, ${config.tema.color_tarjetas} 0%, ${config.tema.fondo_base} 100%)`
                }}
              >
                <div 
                  className="absolute top-0 left-0 right-0 h-[2px] opacity-80"
                  style={{ background: `linear-gradient(90deg, transparent, ${item.accent}, transparent)` }}
                />

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold">{item.label}</span>
                    <span 
                      className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold"
                      style={{ 
                        color: item.accent,
                        backgroundColor: `${item.accent}18`,
                        border: `1px solid ${item.accent}40`
                      }}
                    >
                      {item.trend}
                    </span>
                  </div>
                  {indicadores.cargando ? (
                    <div className="h-8 w-32 bg-slate-800 animate-pulse rounded-md mt-1"></div>
                  ) : (
                    <div className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
                      ${item.value?.toLocaleString('es-CL')}
                    </div>
                  )}
                  <span className="text-[11px] text-slate-400 group-hover:text-cyan-300 transition-colors font-medium mt-1.5 block">
                    {item.desc}
                  </span>
                </div>

                <div 
                  className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner"
                  style={{ 
                    backgroundColor: `${item.accent}15`,
                    border: `1px solid ${item.accent}35`,
                    color: item.accent
                  }}
                >
                  {item.icon}
                </div>
              </motion.div>
            ))}
          </section>
        )}

        {/* Dock Bento de Accesos Rápidos */}
        {accesosRapidos.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {accesosRapidos.map((acc) => (
              <Link
                key={acc.key}
                href={acc.href}
                className="group relative p-4 rounded-2xl transition-all duration-300 flex items-center justify-between hover:-translate-y-1 shadow-lg ring-1 ring-white/[0.08] overflow-hidden"
                style={{
                  backgroundColor: config.tema.color_tarjetas
                }}
              >
                <div 
                  className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl opacity-15 group-hover:opacity-35 transition-opacity"
                  style={{ backgroundColor: acc.accent }}
                />

                <div className="flex items-center gap-3.5 overflow-hidden relative z-10">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-md"
                    style={{
                      backgroundColor: `${acc.accent}18`,
                      border: `1px solid ${acc.accent}40`,
                      color: acc.accent
                    }}
                  >
                    {acc.icon}
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                        {acc.label}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{acc.desc}</p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-all shrink-0 ml-2 relative z-10">
                  <Icons.ArrowUpRight />
                </div>
              </Link>
            ))}
          </section>
        )}

        {/* Grid Principal Bento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Columna Izquierda */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Carrusel V6 con Barra de Progreso Temporal y Pausa en Hover */}
            <div 
              onMouseEnter={() => setCarruselPausado(true)}
              onMouseLeave={() => setCarruselPausado(false)}
              className="relative rounded-3xl p-6 sm:p-9 shadow-2xl backdrop-blur-xl overflow-hidden min-h-[300px] flex flex-col justify-between group ring-1 ring-white/10"
              style={{ 
                background: `radial-gradient(circle at 90% 15%, ${config.tema.color_acento}28 0%, ${config.tema.color_tarjetas} 55%, ${config.tema.fondo_base} 100%)`
              }}
            >
              {/* Barra de Progreso Automática V6 */}
              {!modoEdicion && config.carrusel_slides.length > 1 && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 overflow-hidden">
                  <motion.div
                    key={`${slideActual}-${carruselPausado}`}
                    initial={{ width: '0%' }}
                    animate={{ width: carruselPausado ? '0%' : '100%' }}
                    transition={{ duration: carruselPausado ? 0 : 8, ease: 'linear' }}
                    className="h-full"
                    style={{ backgroundColor: config.tema.color_acento }}
                  />
                </div>
              )}

              <div 
                className="absolute -right-16 -top-16 w-72 h-72 rounded-full border pointer-events-none opacity-20 group-hover:scale-105 transition-transform duration-700"
                style={{ borderColor: config.tema.color_acento }}
              />
              <div 
                className="absolute -right-6 -top-6 w-48 h-48 rounded-full border pointer-events-none opacity-15 group-hover:scale-110 transition-transform duration-700"
                style={{ borderColor: config.tema.color_acento }}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <div 
                    className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase shadow-sm"
                    style={{ 
                      color: config.tema.color_acento,
                      backgroundColor: `${config.tema.color_acento}18`,
                      border: `1px solid ${config.tema.color_acento}45`
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: config.tema.color_acento }} />
                    <span>{slide.tag || 'OFICIAL'}</span>
                  </div>
                  <div 
                    className="w-10 h-10 rounded-xl border flex items-center justify-center shadow-md backdrop-blur-md"
                    style={{ 
                      borderColor: `${config.tema.color_acento}40`,
                      backgroundColor: `${config.tema.fondo_base}90`,
                      color: config.tema.color_acento
                    }}
                  >
                    <Icons.Sparkles/>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={slideActual}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3.5 max-w-xl"
                  >
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                      {slide.titulo}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                      {slide.bajada}
                    </p>
                    <div className="pt-2">
                      <Link
                        href={slide.href || '/dashboard/actas'}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 transition-all hover:opacity-90 shadow-md"
                        style={{ backgroundColor: config.tema.color_acento }}
                      >
                        <span>Explorar Sección</span>
                        <Icons.ArrowUpRight />
                      </Link>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="relative z-10 flex items-center justify-between pt-6 border-t border-white/10 mt-6">
                <div className="flex gap-2 items-center">
                  {config.carrusel_slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSlideActual(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${slideActual === idx ? 'w-9 shadow-md' : 'w-2 bg-slate-700 hover:bg-slate-500'}`}
                      style={{ backgroundColor: slideActual === idx ? config.tema.color_acento : undefined }}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                  <span className="text-[10px] font-mono text-slate-400 ml-2">
                    0{slideActual + 1} / 0{config.carrusel_slides.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setSlideActual((prev) => (prev - 1 + config.carrusel_slides.length) % config.carrusel_slides.length)}
                    className="p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button 
                    onClick={() => setSlideActual((prev) => (prev + 1) % config.carrusel_slides.length)}
                    className="p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Sala Virtual y Votaciones */}
            <div className="grid grid-cols-1 gap-4">
              <div 
                className="p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xl ring-1 ring-white/10 transition-all relative overflow-hidden"
                style={{ backgroundColor: config.tema.color_tarjetas }}
              >
                <div className="space-y-1.5 relative z-10">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-400 font-bold">Transmisión Cifrada</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white pt-1">Sala de Asamblea Virtual Oficial</h3>
                  <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                    Conéctate en directo a las sesiones informativas y deliberativas con validación de asistencia.
                  </p>
                </div>
                <motion.a 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  href="https://meet.jit.si/SindicatoPYC-AsambleaOficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 text-slate-950 font-black rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 shrink-0 relative z-10"
                  style={{ backgroundColor: config.tema.color_acento }}
                >
                  <Icons.VideoCamera/>
                  <span>Ingresar a Sala</span>
                </motion.a>
              </div>

              {asambleas.length > 0 && (
                <div 
                  className="p-6 rounded-3xl space-y-4 shadow-xl ring-1 ring-white/10"
                  style={{ backgroundColor: config.tema.color_tarjetas }}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 rounded-xl border flex items-center justify-center"
                        style={{ 
                          backgroundColor: `${config.tema.color_acento}15`,
                          borderColor: `${config.tema.color_acento}40`,
                          color: config.tema.color_acento
                        }}
                      >
                        <Icons.VoteCheck/>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Urna Sindical Electrónica</h3>
                        <p className="text-[10px] text-slate-400 font-mono">Sufragio personal, directo y auditado</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[9px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 uppercase font-bold">
                      Votación Abierta
                    </span>
                  </div>

                  {asambleas.map((asamblea) => (
                    <div 
                      key={asamblea.id} 
                      className="p-4 rounded-2xl border border-white/10 space-y-3"
                      style={{ backgroundColor: `${config.tema.fondo_base}90` }}
                    >
                      <div>
                        <h4 className="text-sm font-bold text-white">{asamblea.titulo}</h4>
                        <p className="text-xs text-slate-300 mt-0.5">Selecciona tu preferencia conforme a los estatutos vigentes.</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleVotar(asamblea.id, 'A favor')}
                          className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-emerald-500/20 hover:border-emerald-400/50 hover:text-emerald-300 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Icons.Check/>
                          <span>A Favor</span>
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleVotar(asamblea.id, 'En contra')}
                          className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-rose-500/20 hover:border-rose-400/50 hover:text-rose-300 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Icons.X/>
                          <span>En Contra</span>
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleVotar(asamblea.id, 'Abstención')}
                          className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-400 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Icons.Minus/>
                          <span>Abstención</span>
                        </motion.button>
                      </div>

                      {votoEstado && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                          <Icons.Check/>
                          <span>Voto registrado: <strong className="uppercase underline">{votoEstado}</strong></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Muro de Comunicados con Filtro Instantáneo V6 */}
          <div className="lg:col-span-4">
            <div 
              className="rounded-3xl p-6 space-y-4 lg:sticky lg:top-24 shadow-xl ring-1 ring-white/10"
              style={{ backgroundColor: config.tema.color_tarjetas }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.tema.color_acento }}></div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Muro de Comunicados</h3>
                </div>
                <span 
                  className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-semibold"
                  style={{ 
                    color: config.tema.color_acento,
                    backgroundColor: `${config.tema.color_acento}15`,
                    borderColor: `${config.tema.color_acento}35`
                  }}
                >
                  {comunicadosFiltrados.length} Avisos
                </span>
              </div>

              {comunicados.length > 0 && (
                <div className="relative">
                  <input
                    type="text"
                    value={filtroComunicados}
                    onChange={(e) => setFiltroComunicados(e.target.value)}
                    placeholder="Filtrar avisos oficiales..."
                    className="w-full bg-black/25 border border-white/10 focus:border-cyan-400 rounded-xl pl-3.5 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                  />
                  {filtroComunicados && (
                    <button
                      onClick={() => setFiltroComunicados('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <Icons.X />
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {comunicadosFiltrados.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No se encontraron comunicados coincidentes.
                  </div>
                ) : (
                  comunicadosFiltrados.map((noticia) => {
                    const fechaRaw = noticia.fecha_creacion || noticia.created_at;
                    const fechaStr = fechaRaw ? new Date(fechaRaw).toLocaleDateString('es-CL') : 'Oficial';

                    return (
                      <motion.article 
                        key={noticia.id} 
                        whileHover={{ x: 4 }}
                        onClick={() => setComunicadoSeleccionado(noticia)}
                        className="p-4 rounded-2xl border border-white/[0.07] hover:border-cyan-400/40 transition-all space-y-1.5 cursor-pointer group shadow-sm"
                        style={{ backgroundColor: `${config.tema.fondo_base}95` }}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono font-semibold" style={{ color: config.tema.color_acento }}>
                          <span>{fechaStr}</span>
                          <Icons.ArrowUpRight/>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug">
                          {noticia.titulo}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {noticia.contenido}
                        </p>
                      </motion.article>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* --- COMMAND PALETTE / BUSCADOR RÁPIDO V6 (CTRL + K) --- */}
      <AnimatePresence>
        {commandOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommandOpen(false)}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm p-4 pt-20"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: -10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl p-4 shadow-2xl border border-white/15 space-y-3"
              style={{ backgroundColor: config.tema.color_tarjetas }}
            >
              <div className="flex items-center gap-3 px-3 py-2 border-b border-white/10">
                <span className="text-cyan-400">
                  <Icons.Search />
                </span>
                <input
                  type="text"
                  autoFocus
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  placeholder="Escribe un módulo (ej: credencial, legal, actas) o busca un comunicado..."
                  className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                />
                <button
                  onClick={() => setCommandOpen(false)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300"
                >
                  ESC
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto px-1">
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2">
                  Navegación Directa
                </p>
                {accesosRapidos
                  .filter(
                    (a) =>
                      !commandQuery ||
                      a.label.toLowerCase().includes(commandQuery.toLowerCase()) ||
                      a.desc.toLowerCase().includes(commandQuery.toLowerCase())
                  )
                  .map((acc) => (
                    <button
                      key={acc.key}
                      onClick={() => {
                        setCommandOpen(false);
                        router.push(acc.href);
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span style={{ color: acc.accent }}>{acc.icon}</span>
                        <div>
                          <p className="text-xs font-bold text-white">{acc.label}</p>
                          <p className="text-[10px] text-slate-400">{acc.desc}</p>
                        </div>
                      </div>
                      <Icons.ArrowUpRight />
                    </button>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Lector de Comunicado (Corregido el cierre </div>) */}
      <AnimatePresence>
        {comunicadoSeleccionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setComunicadoSeleccionado(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 ring-1 ring-white/15"
              style={{ backgroundColor: config.tema.color_tarjetas }}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span
                  className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md border font-bold"
                  style={{
                    color: config.tema.color_acento,
                    backgroundColor: `${config.tema.color_acento}15`,
                    borderColor: `${config.tema.color_acento}35`
                  }}
                >
                  Comunicado Oficial • {new Date(comunicadoSeleccionado.fecha_creacion || comunicadoSeleccionado.created_at || Date.now()).toLocaleDateString('es-CL')}
                </span>
                <button
                  onClick={() => setComunicadoSeleccionado(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <Icons.X />
                </button>
              </div>

              <h3 className="text-lg font-black text-white leading-snug">
                {comunicadoSeleccionado.titulo}
              </h3>

              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line max-h-[60vh] overflow-y-auto pr-1">
                {comunicadoSeleccionado.contenido}
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setComunicadoSeleccionado(null)}
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-950"
                  style={{ backgroundColor: config.tema.color_acento }}
                >
                  Cerrar Lectura
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}