'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// --- ICONOGRAFÍA VECTORIAL ---
const Icons = {
  History: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
    </svg>
  ),
  Users: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Modules: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
    </svg>
  ),
  Palette: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  ),
  UserCheck: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
    </svg>
  ),
  Lock: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Scanner: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>
    </svg>
  )
};

export default function AdminPanel() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [validando, setValidando] = useState(true);

  // Tabs de navegación: 'postulaciones' | 'historial' | 'padron' | 'modulos' | 'tema'
  const [activeTab, setActiveTab] = useState<'historial' | 'padron' | 'modulos' | 'tema' | 'postulaciones'>('postulaciones');
  const [idSindicatoActual, setIdSindicatoActual] = useState<number | null>(null);
  const [editNombreSindicato, setEditNombreSindicato] = useState('');
  const [userRol, setUserRol] = useState<string>('admin');

  // Configuración de Módulos (Soft Delete)
  const [modulosActivos, setModulosActivos] = useState<Record<string, boolean>>({
    beneficios: true,
    solidario: true,
    asistencia: true,
    finanzas: true,
    legal: true,
    actas: true,
    credencial: true,
    encuestas: true,
    negociacion: true,
    soporte: true
  });

  // Configuración JSONB
  const [configUI, setConfigUI] = useState<any>({
    tema: {
      fondo_base: '#0f172a',
      color_tarjetas: '#1e293b',
      color_acento: '#06b6d4',
      color_borde: '#334155'
    },
    hero: {
      titulo: 'Unidos Somos Más Fuertes.',
      subtitulo: 'Fondo solidario, contención y apoyo mutuo ante cualquier emergencia.'
    }
  });
  const [guardandoTema, setGuardandoTema] = useState(false);

  // Historial Pro y Asistencia
  const [historialAsambleas, setHistorialAsambleas] = useState<any[]>([]);
  const [asistenciaRegistros, setAsistenciaRegistros] = useState<any[]>([]);
  const [tituloNuevaAsamblea, setTituloNuevaAsamblea] = useState('');

  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [postulaciones, setPostulaciones] = useState<any[]>([]);
  const [loadingDatos, setLoadingDatos] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      validarAccesoAdmin();

      const handleStorageChange = () => {
        fetchEnterpriseData();
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [isMounted]);

  // SUSCRIPCIÓN EN TIEMPO REAL PARA ASISTENCIA
  useEffect(() => {
    if (!idSindicatoActual) return;
    const supabase = createClient();
    
    const refrescarAsistencias = async () => {
      const { data } = await supabase
        .from('asistencia_asambleas')
        .select('*')
        .eq('sindicato_id', idSindicatoActual)
        .order('hora_entrada', { ascending: false });

      if (Array.isArray(data)) {
        setAsistenciaRegistros(data);
      }
    };

    const channel = supabase
      .channel(`realtime-admin-asistencia-${idSindicatoActual}`)
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'asistencia_asambleas',
          filter: `sindicato_id=eq.${idSindicatoActual}`
        },
        () => {
          refrescarAsistencias();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [idSindicatoActual]);

  const validarAccesoAdmin = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('sindicato_id, role, estado')
        .eq('id', user.id)
        .maybeSingle();
      
      const rolUsuario = String(profile?.role || '').trim().toLowerCase();
      setUserRol(rolUsuario);

      if (['superadmin', 'admin', 'administrador', 'directiva'].includes(rolUsuario)) {
        setValidando(false);
        fetchEnterpriseData(); 
      } else {
        router.push('/dashboard'); 
      }
    } else {
      router.push('/');
    }
  };

  const fetchEnterpriseData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('sindicato_id, role')
          .eq('id', user.id)
          .maybeSingle();

        let targetSindicatoId = profile?.sindicato_id;
        const rolUsuario = String(profile?.role || '').toLowerCase();
        setUserRol(rolUsuario);

        if (rolUsuario === 'superadmin') {
          const cachedTenant = localStorage.getItem('sindicato_activo');
          if (cachedTenant) targetSindicatoId = Number(cachedTenant);
        }

        if (targetSindicatoId) {
          setIdSindicatoActual(targetSindicatoId);
          
          const { data: sindicato } = await supabase
            .from('sindicatos')
            .select('nombre, config_ui, configuracion')
            .eq('id', targetSindicatoId)
            .maybeSingle();

          if (sindicato) {
            setEditNombreSindicato(sindicato.nombre || '');
            
            if (sindicato.config_ui?.modulos_activos) {
              setModulosActivos((prev) => ({
                ...prev,
                ...sindicato.config_ui.modulos_activos
              }));
            }

            if (sindicato.configuracion) {
              setConfigUI((prev: any) => ({
                ...prev,
                ...sindicato.configuracion,
                tema: { ...prev.tema, ...(sindicato.configuracion.tema || {}) },
                hero: { ...prev.hero, ...(sindicato.configuracion.hero || {}) }
              }));
            }
          }

          const { data: usersData } = await supabase
            .from('profiles')
            .select('*')
            .eq('sindicato_id', targetSindicatoId);
          if (Array.isArray(usersData)) setUsuarios(usersData);

          const { data: postData } = await supabase
            .from('postulaciones')
            .select('*')
            .eq('sindicato_id', targetSindicatoId)
            .eq('estado', 'Pendiente');
          if (Array.isArray(postData)) setPostulaciones(postData);

          const { data: histData } = await supabase
            .from('historial_asambleas')
            .select('*')
            .eq('sindicato_id', targetSindicatoId)
            .order('created_at', { ascending: false });
          if (Array.isArray(histData)) setHistorialAsambleas(histData);

          const { data: asistData } = await supabase
            .from('asistencia_asambleas')
            .select('*')
            .eq('sindicato_id', targetSindicatoId)
            .order('hora_entrada', { ascending: false });
          if (Array.isArray(asistData)) setAsistenciaRegistros(asistData);
        }
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setLoadingDatos(false);
    }
  };

  const toggleModuloSoftDelete = async (nombreModulo: string, estadoActual: boolean) => {
    if (!idSindicatoActual) return alert("Error: No se detectó el sindicato activo.");
    try {
      const supabase = createClient();
      const { data: sindicato } = await supabase
        .from('sindicatos')
        .select('config_ui')
        .eq('id', idSindicatoActual)
        .maybeSingle();

      const config = sindicato?.config_ui || {};
      if (!config.modulos_activos) {
        config.modulos_activos = { ...modulosActivos };
      }

      config.modulos_activos[nombreModulo] = !estadoActual;

      const { error } = await supabase
        .from('sindicatos')
        .update({ config_ui: config })
        .eq('id', idSindicatoActual);

      if (error) throw error;
      setModulosActivos({ ...config.modulos_activos });
    } catch (err: any) { 
      alert("Error al actualizar módulo: " + err.message); 
    }
  };

  const handleGuardarConfiguracionJSONB = async () => {
    if (!idSindicatoActual) return;
    setGuardandoTema(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('sindicatos')
        .update({ configuracion: configUI })
        .eq('id', idSindicatoActual);

      if (error) throw error;
      alert("Diseño y configuración guardados exitosamente.");
    } catch (err: any) {
      alert("Error al guardar tema: " + err.message);
    } finally {
      setGuardandoTema(false);
    }
  };

  const handleCrearAsambleaHistorica = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloNuevaAsamblea.trim() || !idSindicatoActual) return;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      await supabase.from('historial_asambleas').insert([{
        titulo: tituloNuevaAsamblea.trim(),
        sindicato_id: idSindicatoActual,
        created_by: user.id,
        creador_nombre: adminProfile?.full_name || 'Administrador'
      }]);

      setTituloNuevaAsamblea('');
      fetchEnterpriseData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleEliminarAsamblea = async (id: number, titulo: string) => {
    if (!window.confirm(`¿Deseas eliminar la asamblea "${titulo}" y sus registros?`)) return;
    try {
      const supabase = createClient();
      await supabase.from('historial_asambleas').delete().eq('id', id);
      await supabase
        .from('asistencia_asambleas')
        .delete()
        .eq('asamblea_titulo', titulo)
        .eq('sindicato_id', idSindicatoActual);

      setHistorialAsambleas(historialAsambleas.filter(a => a.id !== id));
      setAsistenciaRegistros(asistenciaRegistros.filter(a => a.asamblea_titulo !== titulo));
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // ─── BLINDAJE DE SEGURIDAD ESTRICTO PARA POSTULACIONES ─────────────────────
  const esPostulacionDirectiva = (rolSolicitado: string | null | undefined) => {
    const rol = String(rolSolicitado || '').toLowerCase().trim();
    return ['admin', 'administrador', 'directiva', 'presidente'].includes(rol);
  };

  const handleAprobarPostulacion = async (postulacion: any) => {
    const esCargoAlto = esPostulacionDirectiva(postulacion.rol_solicitado);
    
    // VALIDACIÓN ESTRICTA: Solo Superadmin puede aprobar directivos/presidentes
    if (esCargoAlto && userRol !== 'superadmin') {
      alert("⛔ ACCESO DENEGADO: Por seguridad institucional, solo el SuperAdministrador de la plataforma puede aprobar o designar miembros de la directiva o presidente.");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('postulaciones')
        .update({ estado: 'Aceptada' })
        .eq('id', postulacion.id);

      if (error) throw error;
      setPostulaciones(postulaciones.filter(p => p.id !== postulacion.id));
      fetchEnterpriseData();
      alert(`✅ Postulación de ${postulacion.full_name} aprobada con éxito.`);
    } catch (err: any) {
      alert("Error al procesar: " + err.message);
    }
  };

  const handleRechazarPostulacion = async (id: number, rolSolicitado: string) => {
    if (esPostulacionDirectiva(rolSolicitado) && userRol !== 'superadmin') {
      alert("⛔ ACCESO DENEGADO: Solo el SuperAdministrador puede descartar solicitudes para cargos de Presidencia o Directiva.");
      return;
    }

    try {
      const supabase = createClient();
      await supabase.from('postulaciones').update({ estado: 'Rechazada' }).eq('id', id);
      setPostulaciones(postulaciones.filter(p => p.id !== id));
    } catch (err: any) {
      alert("Error al rechazar: " + err.message);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = "sb-sindicato-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/');
  };

  if (!isMounted || validando) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Cargando Panel de Control...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans text-slate-100 flex flex-col md:flex-row pb-20 md:pb-0">
      
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex w-72 bg-[#090f1d] border-r border-slate-800 flex-col justify-between shrink-0 shadow-2xl">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
              ⚡
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm truncate text-white">{editNombreSindicato || 'Sindicato Activo'}</h1>
              <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
                {userRol === 'superadmin' ? 'SuperAdmin SaaS' : 'Directiva Local'}
              </p>
            </div>
          </div>

          <nav className="p-4 space-y-1.5 text-xs font-semibold">
            <button 
              onClick={() => setActiveTab('postulaciones')} 
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'postulaciones' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <Icons.UserCheck />
                <span>Postulaciones</span>
              </div>
              {postulaciones.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-mono text-[9px] font-black">
                  {postulaciones.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('historial')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'historial' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <Icons.History />
              <span>Historial & Asambleas</span>
            </button>

            <button 
              onClick={() => setActiveTab('padron')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'padron' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <Icons.Users />
              <span>Padrón de Socios ({usuarios.length})</span>
            </button>

            <button 
              onClick={() => setActiveTab('modulos')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'modulos' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <Icons.Modules />
              <span>Módulos Visibles</span>
            </button>

            <button 
              onClick={() => setActiveTab('tema')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'tema' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <Icons.Palette />
              <span>Estudio UI (JSONB)</span>
            </button>

            <Link 
              href="/dashboard/asistencia" 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-all border border-emerald-500/20 mt-2"
            >
              <Icons.Scanner />
              <span>Lector QR Asistencia</span>
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link 
            href="/dashboard" 
            className="w-full flex items-center justify-center py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold tracking-wide transition-all"
          >
            ← Volver al Dashboard
          </Link>
          <button 
            onClick={handleLogout} 
            className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold tracking-wide transition-all"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* BOTTOM NAV MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#090f1d] border-t border-slate-800 z-50 px-3 py-2.5 flex justify-around items-center">
        <button onClick={() => setActiveTab('postulaciones')} className={`flex flex-col items-center p-1.5 relative ${activeTab === 'postulaciones' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.UserCheck />
          <span className="text-[9px] mt-1">Postulantes</span>
          {postulaciones.length > 0 && <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-cyan-400"></span>}
        </button>
        <button onClick={() => setActiveTab('historial')} className={`flex flex-col items-center p-1.5 ${activeTab === 'historial' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.History />
          <span className="text-[9px] mt-1">Historial</span>
        </button>
        <button onClick={() => setActiveTab('padron')} className={`flex flex-col items-center p-1.5 ${activeTab === 'padron' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.Users />
          <span className="text-[9px] mt-1">Padrón</span>
        </button>
        <button onClick={() => setActiveTab('modulos')} className={`flex flex-col items-center p-1.5 ${activeTab === 'modulos' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.Modules />
          <span className="text-[9px] mt-1">Módulos</span>
        </button>
        <button onClick={() => setActiveTab('tema')} className={`flex flex-col items-center p-1.5 ${activeTab === 'tema' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.Palette />
          <span className="text-[9px] mt-1">Tema</span>
        </button>
      </div>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-5 md:p-10">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* TAB: POSTULACIONES PROTEGIDAS */}
          {activeTab === 'postulaciones' && (
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg space-y-4">
              <header className="pb-4 border-b border-slate-700/80 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h3 className="text-lg font-black text-white">Postulaciones Pendientes ({postulaciones.length})</h3>
                  <p className="text-xs text-slate-400">Solicitudes de ingreso enviadas por socios o directivos.</p>
                </div>
                {userRol !== 'superadmin' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono">
                    <Icons.Lock />
                    <span>Cargos directivos restringidos a SuperAdmin</span>
                  </div>
                )}
              </header>

              {postulaciones.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No hay postulaciones pendientes de revisión en este sindicato.
                </div>
              ) : (
                <div className="space-y-3">
                  {postulaciones.map((post) => {
                    const esCargoAlto = esPostulacionDirectiva(post.rol_solicitado);
                    const puedeAccionar = !esCargoAlto || userRol === 'superadmin';

                    return (
                      <div 
                        key={post.id} 
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                          esCargoAlto 
                            ? 'bg-slate-900/90 border-amber-500/30 shadow-md' 
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-sm">{post.full_name}</p>
                            {esCargoAlto && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <Icons.Lock />
                                Cargo Directivo
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 font-mono">RUT: {post.rut} • {post.email}</p>
                          <p className="text-[11px] text-slate-400">
                            Teléfono: {post.telefono || 'No informado'} • Rol Solicitado: <strong className="text-cyan-300 font-mono uppercase">{post.rol_solicitado || 'Socio'}</strong>
                          </p>
                        </div>

                        {/* ACCIONES CONDICIONADAS POR SEGURIDAD */}
                        <div className="flex items-center gap-2">
                          {puedeAccionar ? (
                            <>
                              <button 
                                onClick={() => handleAprobarPostulacion(post)}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
                              >
                                Aprobar
                              </button>
                              <button 
                                onClick={() => handleRechazarPostulacion(post.id, post.rol_solicitado)}
                                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black rounded-xl text-xs uppercase tracking-wider transition-all"
                              >
                                Rechazar
                              </button>
                            </>
                          ) : (
                            <div className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-[11px] flex items-center gap-2 font-mono">
                              <Icons.Lock />
                              <span>Requiere SuperAdmin</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: HISTORIAL */}
          {activeTab === 'historial' && (
            <div className="space-y-6">
              <header className="pb-4 border-b border-slate-800">
                <h2 className="text-xl font-black text-white tracking-tight">Historial de Asambleas & Asistencias</h2>
                <p className="text-xs text-slate-400 mt-1">Crea sesiones oficiales y audita la asistencia de socios en vivo.</p>
              </header>

              <form onSubmit={handleCrearAsambleaHistorica} className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-lg space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">Iniciar Nueva Sesión</span>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input 
                    type="text" 
                    required 
                    value={tituloNuevaAsamblea} 
                    onChange={e => setTituloNuevaAsamblea(e.target.value)} 
                    placeholder="Ej: Asamblea Ordinaria de Rendición de Cuentas..." 
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button 
                    type="submit" 
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20"
                  >
                    <Icons.Plus />
                    <span>Crear Sesión</span>
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {historialAsambleas.length === 0 ? (
                  <div className="bg-[#1e293b]/60 border border-slate-800 p-10 rounded-2xl text-center text-slate-500 text-xs">
                    No existen asambleas registradas.
                  </div>
                ) : (
                  historialAsambleas.map((asam) => {
                    const asistentes = asistenciaRegistros.filter(
                      (a) => a.asamblea_titulo?.trim().toLowerCase() === asam.titulo?.trim().toLowerCase()
                    );

                    return (
                      <div key={asam.id} className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 shadow-lg space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
                          <div>
                            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                              {new Date(asam.created_at).toLocaleDateString('es-CL')}
                            </span>
                            <h3 className="text-base font-bold text-white mt-1.5">{asam.titulo}</h3>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-mono font-bold">
                              {asistentes.length} Asistente(s)
                            </span>
                            <button 
                              onClick={() => handleEliminarAsamblea(asam.id, asam.titulo)} 
                              className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition-colors"
                              title="Eliminar sesión"
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        </div>

                        {asistentes.length === 0 ? (
                          <p className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                            Aún no se han escaneado credenciales para esta sesión.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {asistentes.map((asist) => (
                              <div key={asist.id} className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-1 text-xs">
                                <span className="font-bold text-white truncate block">{asist.usuario_nombre || 'Socio'}</span>
                                <p className="text-[11px] font-mono text-slate-400">{asist.usuario_rut}</p>
                                <span className="text-[10px] text-cyan-400 font-mono block">
                                  Entrada: {asist.hora_entrada ? new Date(asist.hora_entrada).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB: PADRÓN */}
          {activeTab === 'padron' && (
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg space-y-4">
              <header className="pb-4 border-b border-slate-700/80">
                <h3 className="text-lg font-black text-white">Padrón Oficial de Socios</h3>
                <p className="text-xs text-slate-400">Total de miembros registrados ({usuarios.length}).</p>
              </header>

              <div className="divide-y divide-slate-800">
                {usuarios.map(u => (
                  <div key={u.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <p className="font-bold text-white text-sm">{u.full_name || 'Sin Nombre'}</p>
                      <p className="text-slate-400 font-mono">{u.rut || 'RUT N/A'} • {u.email}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase bg-slate-900 text-cyan-300 border border-slate-700">
                      {u.role || 'Socio'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: MÓDULOS */}
          {activeTab === 'modulos' && (
            <div className="bg-[#1e293b] p-6 md:p-8 rounded-2xl border border-slate-700 shadow-lg space-y-5">
              <header className="border-b border-slate-700/80 pb-4">
                <h3 className="text-lg font-black text-white">Módulos Activos (Soft Delete)</h3>
                <p className="text-xs text-slate-400 mt-1">Oculta o muestra secciones en el portal de {editNombreSindicato}.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {Object.entries(modulosActivos).map(([modulo, activo]) => (
                  <div key={modulo} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white capitalize text-xs">{modulo}</h4>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {activo ? '● Visible para socios' : '○ Oculto en el menú'}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleModuloSoftDelete(modulo, activo)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                        activo 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                    >
                      {activo ? 'Ocultar' : 'Activar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: TEMA / JSONB */}
          {activeTab === 'tema' && (
            <div className="bg-[#1e293b] p-6 md:p-8 rounded-2xl border border-slate-700 shadow-lg space-y-6">
              <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white">Diseño Visual y Configuración JSONB</h3>
                  <p className="text-xs text-slate-400 mt-1">Controla los colores y lemas corporativos para este sindicato.</p>
                </div>
                <button 
                  onClick={handleGuardarConfiguracionJSONB}
                  disabled={guardandoTema}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
                >
                  {guardandoTema ? 'Guardando...' : 'Aplicar a Socios'}
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <span className="font-bold text-white text-xs block uppercase tracking-wider">Paleta de Colores</span>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Fondo General:</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={configUI.tema?.fondo_base || '#0f172a'} 
                          onChange={(e) => setConfigUI({ ...configUI, tema: { ...configUI.tema, fondo_base: e.target.value } })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700" 
                        />
                        <span className="font-mono text-slate-300">{configUI.tema?.fondo_base}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Tarjetas / Contenedores:</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={configUI.tema?.color_tarjetas || '#1e293b'} 
                          onChange={(e) => setConfigUI({ ...configUI, tema: { ...configUI.tema, color_tarjetas: e.target.value } })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700" 
                        />
                        <span className="font-mono text-slate-300">{configUI.tema?.color_tarjetas}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Color Acento (Botones):</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={configUI.tema?.color_acento || '#06b6d4'} 
                          onChange={(e) => setConfigUI({ ...configUI, tema: { ...configUI.tema, color_acento: e.target.value } })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700" 
                        />
                        <span className="font-mono text-slate-300">{configUI.tema?.color_acento}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <span className="font-bold text-white text-xs block uppercase tracking-wider">Textos de Bienvenida</span>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Título Hero</label>
                      <input 
                        type="text" 
                        value={configUI.hero?.titulo || ''} 
                        onChange={(e) => setConfigUI({ ...configUI, hero: { ...configUI.hero, titulo: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Subtítulo Hero</label>
                      <input 
                        type="text" 
                        value={configUI.hero?.subtitulo || ''} 
                        onChange={(e) => setConfigUI({ ...configUI, hero: { ...configUI.hero, subtitulo: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}