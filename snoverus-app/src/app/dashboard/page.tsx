'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../app/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// --- ICONOGRAFÍA VECTORIAL ---
const Icons = {
  Sparkles: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  ),
  Bank: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  TrendUp: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  Dollar: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  VideoCamera: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  VoteCheck: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 12 2 2 4-4"/><rect x="3" y="4" width="18" height="16" rx="3"/>
    </svg>
  ),
  ArrowUpRight: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
    </svg>
  ),
  Palette: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
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

// Estructura JSONB por defecto (Equilibrada en tono medio)
const DEFAULT_CONFIG = {
  tema: {
    fondo_base: '#0f172a',       // Slate 900
    color_tarjetas: '#1e293b',   // Slate 800
    color_acento: '#06b6d4',     // Cyan 500
    color_borde: '#334155'       // Slate 700
  },
  hero: { 
    tag: 'PORTAL INSTITUCIONAL DIGITAL', 
    titulo: 'Unidos Somos Más Fuertes.', 
    subtitulo: 'Fondo solidario, contención y apoyo mutuo ante cualquier emergencia.' 
  },
  carrusel_slides: [
    { 
      id: 1, 
      tag: 'NEGOCIACIÓN COLECTIVA 2026', 
      titulo: 'Mesa de Diálogo y Acuerdos Estratégicos', 
      bajada: 'Revisa las actas preliminares, estado de petitorio y el cronograma de votaciones gremiales vigentes.' 
    },
    { 
      id: 2, 
      tag: 'BENEFICIOS VERANO & BIENESTAR', 
      titulo: 'Red de Convenios y Turismo Preferencial', 
      bajada: 'Descubre descuentos exclusivos en centros vacacionales, salud preventiva y seguros complementarios.' 
    },
    { 
      id: 3, 
      tag: 'TRANSPARENCIA INSTITUCIONAL', 
      titulo: 'Libro de Actas y Acuerdos al Día', 
      bajada: 'Accede en tiempo real a las actas firmadas por el directorio y auditorías contables.' 
    }
  ],
  modulos: { pulso_economico: true, asistente_legal: true, participacion_activa: true, actualidad: true }
};

// Paletas preconfiguradas
const PRESET_THEMES = [
  {
    nombre: 'Océano Fresco',
    fondo_base: '#0f172a',
    color_tarjetas: '#1e293b',
    color_acento: '#06b6d4',
    color_borde: '#334155'
  },
  {
    nombre: 'Esmeralda Ejecutivo',
    fondo_base: '#061715',
    color_tarjetas: '#0d2824',
    color_acento: '#10b981',
    color_borde: '#134e44'
  },
  {
    nombre: 'Zafiro Corporativo',
    fondo_base: '#0b1329',
    color_tarjetas: '#132042',
    color_acento: '#3b82f6',
    color_borde: '#1e3a8a'
  },
  {
    nombre: 'Atardecer Dorado',
    fondo_base: '#1a1412',
    color_tarjetas: '#2b201d',
    color_acento: '#f59e0b',
    color_borde: '#45302b'
  }
];

export default function Dashboard() {
  const router = useRouter();
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [asambleas, setAsambleas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [votoEstado, setVotoEstado] = useState<string>('');
  
  const [userRol, setUserRol] = useState<string>('socio');
  const [sindicatoId, setSindicatoId] = useState<number | null>(null);
  const [sindicatoNombre, setSindicatoNombre] = useState<string>('');

  const [slideActual, setSlideActual] = useState(0);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardandoCambios, setGuardandoCambios] = useState(false);

  const [accesoBloqueado, setAccesoBloqueado] = useState({ bloqueado: false, motivo: '' });
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [indicadores, setIndicadores] = useState<any>({ uf: null, utm: null, dolar: null, cargando: true });

  useEffect(() => {
    let realtimeChannel: any;

    async function initDashboard() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/');
          return;
        }

        const user = session.user;
        const { data: profile } = await supabase
          .from('profiles')
          .select('sindicato_id, role, estado')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.estado?.toLowerCase() === 'suspendido') {
          setAccesoBloqueado({ bloqueado: true, motivo: 'Tu cuenta se encuentra suspendida temporalmente.' });
          setLoading(false);
          return;
        }

        if (profile?.role) setUserRol(profile.role);

        if (profile?.sindicato_id) {
          setSindicatoId(profile.sindicato_id);

          // 1. Cargar datos del sindicato y configuración JSONB inicial
          const { data: sindicatoData } = await supabase
            .from('sindicatos')
            .select('configuracion, nombre, estado')
            .eq('id', profile.sindicato_id)
            .maybeSingle();

          if (sindicatoData?.estado?.toLowerCase() === 'suspendido') {
            setAccesoBloqueado({ bloqueado: true, motivo: 'El acceso de tu organización se encuentra inactivo.' });
            setLoading(false);
            return;
          }

          if (sindicatoData) {
            setSindicatoNombre(sindicatoData.nombre || 'Organización Sindical');
            
            if (sindicatoData.configuracion) {
              const dbConfig = sindicatoData.configuracion;
              setConfig({
                tema: { ...DEFAULT_CONFIG.tema, ...(dbConfig.tema || {}) },
                hero: { ...DEFAULT_CONFIG.hero, ...(dbConfig.hero || {}) },
                carrusel_slides: dbConfig.carrusel_slides && dbConfig.carrusel_slides.length > 0 ? dbConfig.carrusel_slides : DEFAULT_CONFIG.carrusel_slides,
                modulos: { ...DEFAULT_CONFIG.modulos, ...(dbConfig.modulos || {}) }
              });
            }
          }

          // 2. SUSCRIPCIÓN EN TIEMPO REAL: Los cambios del admin se reflejan a los socios al instante
          const channelName = `sindicato-config-${profile.sindicato_id}`;
          realtimeChannel = supabase
            .channel(channelName)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'sindicatos',
                filter: `id=eq.${profile.sindicato_id}`
              },
              (payload: any) => {
                if (payload.new?.configuracion) {
                  const newConfig = payload.new.configuracion;
                  setConfig({
                    tema: { ...DEFAULT_CONFIG.tema, ...(newConfig.tema || {}) },
                    hero: { ...DEFAULT_CONFIG.hero, ...(newConfig.hero || {}) },
                    carrusel_slides: newConfig.carrusel_slides && newConfig.carrusel_slides.length > 0 ? newConfig.carrusel_slides : DEFAULT_CONFIG.carrusel_slides,
                    modulos: { ...DEFAULT_CONFIG.modulos, ...(newConfig.modulos || {}) }
                  });
                }
                if (payload.new?.nombre) setSindicatoNombre(payload.new.nombre);
              }
            )
            .subscribe();

          // 3. Comunicados y Asambleas
          const [comData, asamData] = await Promise.all([
            supabase.from('comunicados').select('*').eq('sindicato_id', profile.sindicato_id).order('fecha_creacion', { ascending: false }).limit(6),
            supabase.from('asambleas_votaciones').select('*').eq('sindicato_id', profile.sindicato_id).eq('estado', 'Abierta')
          ]);
          
          if (comData.data) setComunicados(comData.data);
          if (asamData.data) setAsambleas(asamData.data);
        }
      } catch (err) {
        console.error("Error al sincronizar dashboard:", err);
      } finally {
        setLoading(false);
      }

      // Indicadores económicos
      try {
        const res = await fetch('https://mindicador.cl/api');
        const data = await res.json();
        setIndicadores({ 
          uf: data.uf?.valor || 37950, 
          utm: data.utm?.valor || 66500, 
          dolar: data.dolar?.valor || 965, 
          cargando: false 
        });
      } catch (error) {
        setIndicadores({ uf: 37950, utm: 66500, dolar: 965, cargando: false });
      }
    }

    initDashboard();

    return () => {
      if (realtimeChannel) {
        const supabase = createClient();
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [router]);

  // Rotación automática del carrusel
  useEffect(() => {
    if (modoEdicion || config.carrusel_slides.length <= 1) return;
    const intervalo = setInterval(() => {
      setSlideActual((prev) => (prev + 1) % config.carrusel_slides.length);
    }, 8500);
    return () => clearInterval(intervalo);
  }, [config.carrusel_slides, modoEdicion]);

  const handleVotar = async (asambleaId: string, opcion: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('rut').eq('id', user.id).maybeSingle();
    if (!profile?.rut) return;

    const { error } = await supabase.from('votos_registrados').insert([{ asamblea_id: asambleaId, usuario_rut: profile.rut, opcion_elegida: opcion }]);
    if (error) {
      if (error.code === '23505') alert('Ya has emitido tu sufragio en esta asamblea.');
      else alert('Error: ' + error.message);
    } else {
      setVotoEstado(opcion);
    }
  };

  // Guardado en la columna configuracion (JSONB)
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
      alert('Configuración guardada exitosamente y transmitida en vivo a todos los socios.');
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
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
  };

  const esAdmin = ['superadmin', 'admin', 'administrador', 'directiva'].includes(userRol.toLowerCase());
  const slide = config.carrusel_slides[slideActual] || DEFAULT_CONFIG.carrusel_slides[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase font-semibold">Cargando Plataforma...</span>
        </div>
      </div>
    );
  }

  if (accesoBloqueado.bloqueado) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-slate-100 p-6">
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
      {/* Luces Ambientales Vinculadas al Color de Acento */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] blur-[150px] opacity-25 pointer-events-none transition-all duration-700"
        style={{ background: `radial-gradient(circle, ${config.tema.color_acento} 0%, transparent 70%)` }}
      ></div>

      {/* Botón Flotante para Directiva / Superadmin */}
      {esAdmin && (
        <div className="fixed bottom-6 right-6 z-40">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setModoEdicion(!modoEdicion)} 
            className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-white border rounded-full shadow-2xl backdrop-blur-xl text-xs font-bold tracking-wide transition-all"
            style={{ borderColor: config.tema.color_acento }}
          >
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: config.tema.color_acento }}></span>
            <span>{modoEdicion ? 'Cerrar Estudio' : 'Personalizar UI'}</span>
          </motion.button>
        </div>
      )}

      {/* --- PANEL COMPLETO DE CONTROL DE TEMA Y CONTENIDO (JSONB EN VIVO) --- */}
      <AnimatePresence>
        {esAdmin && modoEdicion && (
          <motion.div 
            initial={{ opacity: 0, y: -25 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -25 }} 
            className="bg-slate-900/98 border-b border-slate-700 p-5 sm:p-6 sticky top-0 z-50 backdrop-blur-2xl shadow-2xl"
          >
            <div className="max-w-7xl mx-auto space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Icons.Palette />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Estudio de Diseño y Configuración Multi-Tenant</h3>
                    <p className="text-[11px] text-slate-400">Personaliza la estética que verán todos los socios de {sindicatoNombre} en tiempo real.</p>
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
                    className="px-5 py-2 text-slate-950 font-black rounded-xl text-xs tracking-wide transition-all shadow-lg shadow-cyan-500/20"
                    style={{ backgroundColor: config.tema.color_acento }}
                  >
                    {guardandoCambios ? 'Guardando en BD...' : 'Publicar a Socios'}
                  </button>
                </div>
              </div>

              {/* Selector de Paletas y Personalización de Colores */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                
                {/* Presets Rápidos */}
                <div className="md:col-span-5 space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block font-bold">Plantillas Rápidas</span>
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

                {/* Color Pickers Precisos */}
                <div className="md:col-span-7 space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block font-bold">Ajuste Fino de Colores (HEX)</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Fondo General</span>
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
                      <span className="text-[10px] text-slate-400 block mb-1">Acento / Botón</span>
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

                  {/* Editor Rápido del Lema Hero */}
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Título Hero</label>
                      <input 
                        type="text" 
                        value={config.hero.titulo} 
                        onChange={(e) => setConfig({ ...config, hero: { ...config.hero, titulo: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Subtítulo Hero</label>
                      <input 
                        type="text" 
                        value={config.hero.subtitulo} 
                        onChange={(e) => setConfig({ ...config, hero: { ...config.hero, subtitulo: e.target.value } })}
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

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 space-y-8 relative z-10">
        
        {/* --- HERO SECTION MULTI-TENANT --- */}
        <section className="text-center space-y-3.5 max-w-3xl mx-auto pt-2 pb-2">
          <div 
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md shadow-md"
            style={{ 
              borderColor: `${config.tema.color_acento}40`,
              backgroundColor: `${config.tema.color_tarjetas}80` 
            }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: config.tema.color_acento }}></span>
            <span className="text-[10px] font-mono tracking-[0.18em] uppercase font-bold" style={{ color: config.tema.color_acento }}>
              {sindicatoNombre || 'Portal Oficial'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            {config.hero.titulo}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed font-medium">
            {config.hero.subtitulo}
          </p>
        </section>

        {/* --- PULSO FINANCIERO DINÁMICO --- */}
        {config.modulos.pulso_economico && (
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Unidad de Fomento (UF)', value: indicadores.uf, desc: 'Banco Central de Chile', icon: <Icons.Bank/>, trend: 'En Línea' },
              { label: 'Unidad Tributaria (UTM)', value: indicadores.utm, desc: 'Servicio Impuestos Internos', icon: <Icons.TrendUp/>, trend: 'Mensual' },
              { label: 'Dólar Observado (USD)', value: indicadores.dolar, desc: 'Mercado Spot Oficial', icon: <Icons.Dollar/>, trend: 'Spot CMF' }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -3 }}
                className="group relative rounded-2xl p-5 shadow-lg backdrop-blur-xl transition-all duration-300 overflow-hidden flex items-center justify-between"
                style={{ 
                  backgroundColor: config.tema.color_tarjetas,
                  border: `1px solid ${config.tema.color_borde}`
                }}
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">{item.label}</span>
                    <span 
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded-md border"
                      style={{ 
                        color: config.tema.color_acento,
                        backgroundColor: `${config.tema.color_acento}15`,
                        borderColor: `${config.tema.color_acento}35`
                      }}
                    >
                      {item.trend}
                    </span>
                  </div>
                  {indicadores.cargando ? (
                    <div className="h-7 w-28 bg-slate-800 animate-pulse rounded-md mt-1"></div>
                  ) : (
                    <div className="text-2xl font-black tracking-tight text-white font-mono">
                      ${item.value?.toLocaleString('es-CL')}
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono tracking-wide mt-1 block">
                    {item.desc}
                  </span>
                </div>
                <div 
                  className="relative z-10 w-11 h-11 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm"
                  style={{ 
                    backgroundColor: `${config.tema.color_acento}15`,
                    borderColor: `${config.tema.color_acento}35`,
                    color: config.tema.color_acento
                  }}
                >
                  {item.icon}
                </div>
              </motion.div>
            ))}
          </section>
        )}

        {/* --- GRID PRINCIPAL --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMNA IZQUIERDA: CARRUSEL & PARTICIPACIÓN */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Carrusel Dinámico */}
            <div 
              className="relative rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-xl overflow-hidden min-h-[270px] flex flex-col justify-between group transition-all"
              style={{ 
                backgroundColor: config.tema.color_tarjetas,
                border: `1px solid ${config.tema.color_borde}`
              }}
            >
              <div 
                className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-colors opacity-20"
                style={{ backgroundColor: config.tema.color_acento }}
              ></div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div 
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-mono font-bold tracking-widest uppercase shadow-sm"
                    style={{ 
                      color: config.tema.color_acento,
                      backgroundColor: `${config.tema.color_acento}15`,
                      borderColor: `${config.tema.color_acento}40`
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: config.tema.color_acento }}></span>
                    {slide.tag}
                  </div>
                  <div 
                    className="w-9 h-9 rounded-xl border flex items-center justify-center shadow-sm"
                    style={{ 
                      borderColor: config.tema.color_borde,
                      backgroundColor: `${config.tema.fondo_base}80`,
                      color: config.tema.color_acento
                    }}
                  >
                    <Icons.Sparkles/>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={slideActual}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-2.5 max-w-xl"
                  >
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                      {slide.titulo}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                      {slide.bajada}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Indicadores Diapositiva */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-700/60 mt-4">
                <div className="flex gap-2">
                  {config.carrusel_slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSlideActual(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${slideActual === idx ? 'w-8 shadow-md' : 'w-2 bg-slate-700 hover:bg-slate-600'}`}
                      style={{ backgroundColor: slideActual === idx ? config.tema.color_acento : undefined }}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setSlideActual((prev) => (prev - 1 + config.carrusel_slides.length) % config.carrusel_slides.length)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button 
                    onClick={() => setSlideActual((prev) => (prev + 1) % config.carrusel_slides.length)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Participación: Sala y Votaciones */}
            <div className="grid grid-cols-1 gap-4">
              
              {/* Sala Virtual Oficial */}
              <div 
                className="p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg transition-all"
                style={{ 
                  backgroundColor: config.tema.color_tarjetas,
                  border: `1px solid ${config.tema.color_borde}`
                }}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-400 font-bold">Sesión en Vivo</span>
                  </div>
                  <h3 className="text-base font-bold text-white">Sala de Asamblea Virtual Oficial</h3>
                  <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                    Acceso en directo para asambleas informativas y deliberativas con registro de quorum.
                  </p>
                </div>
                <motion.a 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  href="https://meet.jit.si/SindicatoPYC-AsambleaOficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 text-slate-950 font-black rounded-xl text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2 shrink-0"
                  style={{ backgroundColor: config.tema.color_acento }}
                >
                  <Icons.VideoCamera/>
                  <span>Ingresar a Sesión</span>
                </motion.a>
              </div>

              {/* Votaciones Activas */}
              {asambleas.length > 0 && (
                <div 
                  className="p-5 sm:p-6 rounded-2xl space-y-4 shadow-lg"
                  style={{ 
                    backgroundColor: config.tema.color_tarjetas,
                    border: `1px solid ${config.tema.color_borde}`
                  }}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-8 h-8 rounded-lg border flex items-center justify-center"
                        style={{ 
                          backgroundColor: `${config.tema.color_acento}15`,
                          borderColor: `${config.tema.color_acento}40`,
                          color: config.tema.color_acento
                        }}
                      >
                        <Icons.VoteCheck/>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Votación Sindical Abierta</h3>
                        <p className="text-[10px] text-slate-400 font-mono">Sufragio personal, directo e intransferible</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 uppercase font-bold">
                      Activa
                    </span>
                  </div>

                  {asambleas.map((asamblea) => (
                    <div 
                      key={asamblea.id} 
                      className="p-4 rounded-xl border space-y-3"
                      style={{ 
                        backgroundColor: `${config.tema.fondo_base}80`,
                        borderColor: config.tema.color_borde
                      }}
                    >
                      <div>
                        <h4 className="text-sm font-bold text-white">{asamblea.titulo}</h4>
                        <p className="text-xs text-slate-300 mt-0.5">Emite tu voto conforme a los estatutos vigentes de la organización.</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleVotar(asamblea.id, 'A favor')}
                          className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-emerald-500/20 hover:border-emerald-400/50 hover:text-emerald-300 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                        >
                          <Icons.Check/>
                          <span>A Favor</span>
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleVotar(asamblea.id, 'En contra')}
                          className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-rose-500/20 hover:border-rose-400/50 hover:text-rose-300 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                        >
                          <Icons.X/>
                          <span>En Contra</span>
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleVotar(asamblea.id, 'Abstención')}
                          className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-400 text-xs font-semibold transition-all flex items-center justify-center gap-2"
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

          {/* COLUMNA DERECHA: COMUNICADOS */}
          <div className="lg:col-span-4">
            <div 
              className="rounded-2xl p-5 space-y-4 lg:sticky lg:top-24 shadow-lg"
              style={{ 
                backgroundColor: config.tema.color_tarjetas,
                border: `1px solid ${config.tema.color_borde}`
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.tema.color_acento }}></div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Comunicados Oficiales</h3>
                </div>
                <span 
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold"
                  style={{ 
                    color: config.tema.color_acento,
                    backgroundColor: `${config.tema.color_acento}15`,
                    borderColor: `${config.tema.color_acento}35`
                  }}
                >
                  {comunicados.length} Registros
                </span>
              </div>

              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {comunicados.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No existen comunicados recientes.
                  </div>
                ) : (
                  comunicados.map((noticia) => (
                    <motion.article 
                      key={noticia.id} 
                      whileHover={{ x: 3 }}
                      className="p-3.5 rounded-xl border transition-all space-y-1.5 cursor-pointer group"
                      style={{ 
                        backgroundColor: `${config.tema.fondo_base}90`,
                        borderColor: config.tema.color_borde
                      }}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono font-semibold" style={{ color: config.tema.color_acento }}>
                        <span>{new Date(noticia.fecha_creacion).toLocaleDateString('es-CL')}</span>
                        <Icons.ArrowUpRight/>
                      </div>
                      <h4 className="text-xs font-bold text-white transition-colors leading-snug">
                        {noticia.titulo}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {noticia.contenido}
                      </p>
                    </motion.article>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}