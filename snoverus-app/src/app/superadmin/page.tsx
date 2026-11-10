'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// --- ICONOGRAFÍA VECTORIAL ---
const Icons = {
  Chart: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
    </svg>
  ),
  Building: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/>
    </svg>
  ),
  Users: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  ShieldCheck: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  Palette: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Lock: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
};

export default function SuperAdminPanel() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [validando, setValidando] = useState(true);

  // Tabs: 'dashboard' | 'tenants' | 'usuarios' | 'postulaciones' | 'tema' | 'nuevo'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tenants' | 'usuarios' | 'postulaciones' | 'tema' | 'nuevo'>('dashboard');

  // Estados Globales
  const [sindicatos, setSindicatos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [postulacionesDirectivas, setPostulacionesDirectivas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formularios Sindicatos
  const [nombreSindicato, setNombreSindicato] = useState('');
  const [rutSindicato, setRutSindicato] = useState('');
  const [logoSindicato, setLogoSindicato] = useState('');
  const [creandoSindicato, setCreandoSindicato] = useState(false);

  // Modales
  const [sindicatoSeleccionado, setSindicatoSeleccionado] = useState<any>(null);
  const [editNombreSindicato, setEditNombreSindicato] = useState('');
  const [editRutSindicato, setEditRutSindicato] = useState('');
  const [editLogoSindicato, setEditLogoSindicato] = useState('');
  const [guardandoSindicato, setGuardandoSindicato] = useState(false);

  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<any>(null);
  const [nuevoRol, setNuevoRol] = useState('socio');
  const [nuevoSindicatoId, setNuevoSindicatoId] = useState<string>('');
  const [nuevoEstadoUsuario, setNuevoEstadoUsuario] = useState('activo');
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);

  // Selector de Sindicato para Edición de Tema JSONB
  const [tenantSeleccionadoTema, setTenantSeleccionadoTema] = useState<number | null>(null);
  const [configUITema, setConfigUITema] = useState<any>({
    tema: { fondo_base: '#0f172a', color_tarjetas: '#1e293b', color_acento: '#06b6d4', color_borde: '#334155' },
    hero: { titulo: 'Unidos Somos Más Fuertes.', subtitulo: 'Fondo solidario, contención y apoyo mutuo ante cualquier emergencia.' }
  });
  const [guardandoTemaJSONB, setGuardandoTemaJSONB] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) validarAccesoSuperAdmin();
  }, [isMounted]);

  const validarAccesoSuperAdmin = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (String(data?.role || '').trim().toLowerCase() === 'superadmin') {
        setValidando(false);
        fetchSuperAdminData();
      } else {
        alert('Acceso restringido. Se requieren credenciales de SuperAdministrador.');
        router.push('/dashboard');
      }
    } else {
      router.push('/');
    }
  };

  const fetchSuperAdminData = async () => {
    try {
      const supabase = createClient();
      const [sindRes, usersRes, postRes] = await Promise.all([
        supabase.from('sindicatos').select('*').order('id', { ascending: true }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('postulaciones').select('*').eq('estado', 'Pendiente').order('created_at', { ascending: false })
      ]);

      if (Array.isArray(sindRes.data)) {
        setSindicatos(sindRes.data);
        if (!tenantSeleccionadoTema && sindRes.data.length > 0) {
          setTenantSeleccionadoTema(sindRes.data[0].id);
          cargarConfiguracionSindicatoTema(sindRes.data[0]);
        }
      }

      if (Array.isArray(usersRes.data)) setUsuarios(usersRes.data);

      if (Array.isArray(postRes.data)) {
        // Filtrar solicitudes con rol directivo para resolución exclusiva
        const directivas = postRes.data.filter((p: any) =>
          ['admin', 'administrador', 'directiva', 'presidente'].includes(String(p.rol_solicitado || '').toLowerCase().trim())
        );
        setPostulacionesDirectivas(directivas);
      }
    } catch (err) {
      console.error("Error cargando panel de SuperAdmin:", err);
    } finally {
      setLoading(false);
    }
  };

  const cargarConfiguracionSindicatoTema = (sind: any) => {
    if (sind?.configuracion) {
      setConfigUITema({
        tema: {
          fondo_base: sind.configuracion.tema?.fondo_base || '#0f172a',
          color_tarjetas: sind.configuracion.tema?.color_tarjetas || '#1e293b',
          color_acento: sind.configuracion.tema?.color_acento || '#06b6d4',
          color_borde: sind.configuracion.tema?.color_borde || '#334155'
        },
        hero: {
          titulo: sind.configuracion.hero?.titulo || 'Unidos Somos Más Fuertes.',
          subtitulo: sind.configuracion.hero?.subtitulo || 'Fondo solidario, contención y apoyo mutuo ante cualquier emergencia.'
        }
      });
    }
  };

  const handleCambiarTenantTema = (id: number) => {
    setTenantSeleccionadoTema(id);
    const sind = sindicatos.find(s => s.id === id);
    if (sind) cargarConfiguracionSindicatoTema(sind);
  };

  const handleGuardarConfiguracionJSONB = async () => {
    if (!tenantSeleccionadoTema) return;
    setGuardandoTemaJSONB(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('sindicatos')
        .update({ configuracion: configUITema })
        .eq('id', tenantSeleccionadoTema);

      if (error) throw error;
      alert("Configuración JSONB actualizada y transmitida a los socios.");
      fetchSuperAdminData();
    } catch (err: any) {
      alert("Error al guardar tema: " + err.message);
    } finally {
      setGuardandoTemaJSONB(false);
    }
  };

  // --- GESTIÓN DE POSTULACIONES DIRECTIVAS ---
  const handleAprobarDirectivo = async (post: any) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('postulaciones')
        .update({ estado: 'Aceptada' })
        .eq('id', post.id);

      if (error) throw error;

      // Actualizar perfil a admin si el usuario ya existe en profiles
      await supabase
        .from('profiles')
        .update({ role: 'admin', sindicato_id: post.sindicato_id })
        .eq('email', post.email);

      setPostulacionesDirectivas(postulacionesDirectivas.filter(p => p.id !== post.id));
      fetchSuperAdminData();
      alert(`Cargo directivo aprobado para ${post.full_name}.`);
    } catch (err: any) {
      alert("Error al procesar directivo: " + err.message);
    }
  };

  const handleRechazarDirectivo = async (id: number) => {
    try {
      const supabase = createClient();
      await supabase.from('postulaciones').update({ estado: 'Rechazada' }).eq('id', id);
      setPostulacionesDirectivas(postulacionesDirectivas.filter(p => p.id !== id));
    } catch (err: any) {
      alert("Error al descartar postulación: " + err.message);
    }
  };

  // --- SINDICATOS CRUD ---
  const handleCrearSindicato = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreandoSindicato(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('sindicatos').insert([{
        nombre: nombreSindicato,
        rut_sindicato: rutSindicato,
        logo_url: logoSindicato.trim() !== '' ? logoSindicato.trim() : null,
        estado: 'activo',
        configuracion: configUITema
      }]);
      if (error) throw error;

      alert('Organización sindical desplegada exitosamente.');
      setNombreSindicato('');
      setRutSindicato('');
      setLogoSindicato('');
      setActiveTab('tenants');
      fetchSuperAdminData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setCreandoSindicato(false);
    }
  };

  const toggleEstadoSindicato = async (id: number, estadoActual: string) => {
    const nuevoEstado = estadoActual.toLowerCase() === 'activo' ? 'suspendido' : 'activo';
    if (!window.confirm(`¿Confirmas ${nuevoEstado === 'suspendido' ? 'SUSPENDER' : 'RESTAURAR'} esta organización sindical?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('sindicatos').update({ estado: nuevoEstado }).eq('id', id);
      if (error) throw error;
      fetchSuperAdminData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const guardarEdicionSindicato = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoSindicato(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('sindicatos').update({
        nombre: editNombreSindicato,
        rut_sindicato: editRutSindicato,
        logo_url: editLogoSindicato.trim() !== '' ? editLogoSindicato.trim() : null
      }).eq('id', sindicatoSeleccionado.id);

      if (error) throw error;
      setSindicatoSeleccionado(null);
      fetchSuperAdminData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGuardandoSindicato(false);
    }
  };

  // --- USUARIOS ASIGNACIÓN ---
  const guardarAsignacionTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoAsignacion(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({
        role: nuevoRol,
        sindicato_id: nuevoSindicatoId ? Number(nuevoSindicatoId) : null,
        estado: nuevoEstadoUsuario
      }).eq('id', usuarioSeleccionado.id);

      if (error) throw error;
      setUsuarioSeleccionado(null);
      fetchSuperAdminData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGuardandoAsignacion(false);
    }
  };

  const toggleEstadoUsuario = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual.toLowerCase() === 'activo' ? 'suspendido' : 'activo';
    if (!window.confirm(`¿Confirmas ${nuevoEstado === 'suspendido' ? 'SUSPENDER' : 'HABILITAR'} la cuenta del usuario?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({ estado: nuevoEstado }).eq('id', id);
      if (error) throw error;
      fetchSuperAdminData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const exportarUsuariosCSV = () => {
    const headers = ['ID', 'Nombre_Completo', 'RUT', 'Email', 'Rol', 'Estado', 'Sindicato_ID'];
    const csvContent = [
      headers.join(','),
      ...usuarios.map(u => [
        u.id,
        `"${u.full_name || 'Sin Nombre'}"`,
        u.rut || '',
        u.email || '',
        u.role || 'socio',
        u.estado || 'activo',
        u.sindicato_id || 'Global'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Padrón_Global_${new Date().toLocaleDateString('es-CL')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Autenticando SuperAdministrador...</span>
        </div>
      </div>
    );
  }

  // Métricas
  const tenantsActivos = sindicatos.filter(s => (s.estado || 'activo').toLowerCase() === 'activo').length;
  const usuariosSuspendidos = usuarios.filter(u => (u.estado || 'activo').toLowerCase() === 'suspendido').length;
  const directivosCount = usuarios.filter(u => ['admin', 'administrador', 'directiva'].includes(String(u.role || '').toLowerCase())).length;

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans text-slate-100 flex flex-col md:flex-row pb-20 md:pb-0">

      {/* --- SIDEBAR MASTER SAAS --- */}
      <aside className="hidden md:flex w-72 bg-[#090f1d] border-r border-slate-800 flex-col justify-between shrink-0 shadow-2xl">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
              ⚡
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white leading-tight">Master SaaS</h1>
              <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold mt-0.5">Control Global Sindicatos</p>
            </div>
          </div>

          <nav className="p-4 space-y-1.5 text-xs font-semibold">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <Icons.Chart />
              <span>Resumen Ejecutivo</span>
            </button>

            <button 
              onClick={() => setActiveTab('postulaciones')} 
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'postulaciones' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <Icons.ShieldCheck />
                <span>Validar Directivas</span>
              </div>
              {postulacionesDirectivas.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[9px] font-black">
                  {postulacionesDirectivas.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('tenants')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'tenants' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <Icons.Building />
              <span>Organizaciones ({sindicatos.length})</span>
            </button>

            <button 
              onClick={() => setActiveTab('usuarios')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'usuarios' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <Icons.Users />
              <span>Padrón Global ({usuarios.length})</span>
            </button>

            <button 
              onClick={() => setActiveTab('tema')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'tema' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <Icons.Palette />
              <span>Estudio UI Multi-Tenant</span>
            </button>

            <button 
              onClick={() => setActiveTab('nuevo')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'nuevo' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <Icons.Plus />
              <span>Crear Nuevo Tenant</span>
            </button>
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

      {/* --- BOTTOM NAV MOBILE --- */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#090f1d] border-t border-slate-800 z-50 px-3 py-2.5 flex justify-around items-center">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center p-1.5 ${activeTab === 'dashboard' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.Chart />
          <span className="text-[9px] mt-1">Métricas</span>
        </button>
        <button onClick={() => setActiveTab('postulaciones')} className={`flex flex-col items-center p-1.5 relative ${activeTab === 'postulaciones' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.ShieldCheck />
          <span className="text-[9px] mt-1">Directivas</span>
          {postulacionesDirectivas.length > 0 && <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-amber-400"></span>}
        </button>
        <button onClick={() => setActiveTab('tenants')} className={`flex flex-col items-center p-1.5 ${activeTab === 'tenants' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.Building />
          <span className="text-[9px] mt-1">Tenants</span>
        </button>
        <button onClick={() => setActiveTab('usuarios')} className={`flex flex-col items-center p-1.5 ${activeTab === 'usuarios' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.Users />
          <span className="text-[9px] mt-1">Padrón</span>
        </button>
        <button onClick={() => setActiveTab('tema')} className={`flex flex-col items-center p-1.5 ${activeTab === 'tema' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.Palette />
          <span className="text-[9px] mt-1">UI JSONB</span>
        </button>
      </div>

      {/* --- ÁREA PRINCIPAL --- */}
      <main className="flex-1 overflow-y-auto p-5 md:p-10">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* TAB 1: RESUMEN EJECUTIVO */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Rendimiento Global de la Infraestructura SaaS</h2>
                  <p className="text-xs text-slate-400 mt-1">Monitoreo y métricas de organizaciones conectadas a Supabase.</p>
                </div>
                <button 
                  onClick={exportarUsuariosCSV} 
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold tracking-wider flex items-center gap-2 border border-slate-700 transition-all"
                >
                  <Icons.Download />
                  <span>Exportar Padrón (CSV)</span>
                </button>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 shadow-lg">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Organizaciones</span>
                  <div className="text-3xl font-black text-white font-mono mt-1">{sindicatos.length}</div>
                  <span className="text-[10px] text-cyan-400 font-mono mt-2 block">Total Tenants Registrados</span>
                </div>
                <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 shadow-lg">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Activas</span>
                  <div className="text-3xl font-black text-emerald-400 font-mono mt-1">{tenantsActivos}</div>
                  <span className="text-[10px] text-slate-400 font-mono mt-2 block">Operando sin restricciones</span>
                </div>
                <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 shadow-lg">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Padrón Global</span>
                  <div className="text-3xl font-black text-white font-mono mt-1">{usuarios.length}</div>
                  <span className="text-[10px] text-cyan-400 font-mono mt-2 block">Socios y Directivos</span>
                </div>
                <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 shadow-lg">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Directivas Aprobadas</span>
                  <div className="text-3xl font-black text-amber-300 font-mono mt-1">{directivosCount}</div>
                  <span className="text-[10px] text-slate-400 font-mono mt-2 block">Cuentas con Privilegios Admin</span>
                </div>
              </div>

              {/* Registro Reciente */}
              <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 shadow-lg space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Últimos Registros en la Plataforma</h3>
                <div className="divide-y divide-slate-800">
                  {usuarios.slice(0, 5).map(u => (
                    <div key={u.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white text-sm">{u.full_name || 'Sin nombre'}</p>
                        <p className="text-slate-400 font-mono">{u.email} • RUT: {u.rut || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-900 text-cyan-300 border border-slate-700">
                          {u.role || 'socio'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-1">
                          {new Date(u.created_at).toLocaleDateString('es-CL')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: POSTULACIONES DIRECTIVAS (EXCLUSIVO SUPERADMIN) */}
          {activeTab === 'postulaciones' && (
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg space-y-4">
              <header className="pb-4 border-b border-slate-700/80">
                <div className="flex items-center gap-2 mb-1">
                  <Icons.Lock />
                  <h3 className="text-lg font-black text-white">Validación de Directivas y Presidencia ({postulacionesDirectivas.length})</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Módulo protegido: Únicamente el SuperAdministrador posee la facultad de designar o rechazar miembros con perfil directivo.
                </p>
              </header>

              {postulacionesDirectivas.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No hay solicitudes directivas pendientes de revisión.
                </div>
              ) : (
                <div className="space-y-3">
                  {postulacionesDirectivas.map((post) => {
                    const sindicatoDestino = sindicatos.find(s => s.id === post.sindicato_id);

                    return (
                      <div key={post.id} className="p-4 bg-slate-900/90 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{post.full_name}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Postula a {post.rol_solicitado}
                            </span>
                          </div>
                          <p className="text-slate-400 font-mono">RUT: {post.rut} • {post.email}</p>
                          <p className="text-[11px] text-slate-400">
                            Sindicato Solicitado: <strong className="text-cyan-300">{sindicatoDestino?.nombre || `ID #${post.sindicato_id}`}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleAprobarDirectivo(post)}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
                          >
                            Aprobar Presidente/Admin
                          </button>
                          <button 
                            onClick={() => handleRechazarDirectivo(post.id)}
                            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black rounded-xl text-xs uppercase tracking-wider transition-all"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TENANTS (ORGANIZACIONES) */}
          {activeTab === 'tenants' && (
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg space-y-4">
              <header className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-700/80">
                <div>
                  <h3 className="text-lg font-black text-white">Directorio de Organizaciones ({sindicatos.length})</h3>
                  <p className="text-xs text-slate-400">Control de activación, suspensión y edición de tenants.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('nuevo')}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20"
                >
                  + Desplegar Tenant
                </button>
              </header>

              <div className="divide-y divide-slate-800">
                {sindicatos.map((s) => {
                  const isActivo = (s.estado || 'activo').toLowerCase() === 'activo';
                  return (
                    <div key={s.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{s.nombre}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${isActivo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
                            {s.estado || 'activo'}
                          </span>
                        </div>
                        <p className="text-slate-400 font-mono mt-0.5">RUT: {s.rut_sindicato} • ID #{s.id}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setSindicatoSeleccionado(s);
                            setEditNombreSindicato(s.nombre);
                            setEditRutSindicato(s.rut_sindicato);
                            setEditLogoSindicato(s.logo_url || '');
                          }}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold border border-slate-700 transition-colors"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => toggleEstadoSindicato(s.id, s.estado || 'activo')}
                          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${isActivo ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}
                        >
                          {isActivo ? 'Suspender' : 'Reactivar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: USUARIOS */}
          {activeTab === 'usuarios' && (
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg space-y-4">
              <header className="pb-4 border-b border-slate-700/80">
                <h3 className="text-lg font-black text-white">Padrón Global Multi-Tenant ({usuarios.length})</h3>
                <p className="text-xs text-slate-400">Reasigna organizaciones, eleva permisos o suspende accesos.</p>
              </header>

              <div className="divide-y divide-slate-800">
                {usuarios.map(u => {
                  const sindicatoAsociado = sindicatos.find(s => s.id === u.sindicato_id);
                  const isActivo = (u.estado || 'activo').toLowerCase() === 'activo';

                  return (
                    <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-sm">{u.full_name || 'Sin Nombre'}</p>
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-900 text-cyan-300 border border-slate-700">
                            {u.role || 'socio'}
                          </span>
                          {!isActivo && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Suspendido
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 font-mono mt-0.5">{u.email} • RUT: {u.rut || 'N/A'}</p>
                        <p className="text-[11px] text-slate-500">Tenant: {sindicatoAsociado?.nombre || 'Global / Sin Asignar'}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setUsuarioSeleccionado(u);
                            setNuevoRol(u.role || 'socio');
                            setNuevoSindicatoId(u.sindicato_id ? String(u.sindicato_id) : '');
                            setNuevoEstadoUsuario(u.estado || 'activo');
                          }}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold border border-slate-700 transition-colors"
                        >
                          Asignar Rol/Tenant
                        </button>
                        <button 
                          onClick={() => toggleEstadoUsuario(u.id, u.estado || 'activo')}
                          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${isActivo ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}
                        >
                          {isActivo ? 'Bloquear' : 'Restaurar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: ESTUDIO UI MULTI-TENANT (JSONB) */}
          {activeTab === 'tema' && (
            <div className="bg-[#1e293b] p-6 md:p-8 rounded-2xl border border-slate-700 shadow-lg space-y-6">
              <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white">Configuración Visual JSONB por Organización</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Selecciona un sindicato y edita sus colores institucionales en la base de datos.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    value={tenantSeleccionadoTema || ''} 
                    onChange={e => handleCambiarTenantTema(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {sindicatos.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleGuardarConfiguracionJSONB}
                    disabled={guardandoTemaJSONB}
                    className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20"
                  >
                    {guardandoTemaJSONB ? 'Guardando...' : 'Aplicar a Socios'}
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                {/* Colores */}
                <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <span className="font-bold text-white text-xs block uppercase tracking-wider">Paleta de Colores de la Organización</span>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Fondo General (Fondo Base):</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={configUITema.tema?.fondo_base || '#0f172a'} 
                          onChange={(e) => setConfigUITema({
                            ...configUITema,
                            tema: { ...configUITema.tema, fondo_base: e.target.value }
                          })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700" 
                        />
                        <span className="font-mono text-slate-300">{configUITema.tema?.fondo_base}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Color de Tarjetas / Contenedores:</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={configUITema.tema?.color_tarjetas || '#1e293b'} 
                          onChange={(e) => setConfigUITema({
                            ...configUITema,
                            tema: { ...configUITema.tema, color_tarjetas: e.target.value }
                          })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700" 
                        />
                        <span className="font-mono text-slate-300">{configUITema.tema?.color_tarjetas}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Color Acento (Botones):</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={configUITema.tema?.color_acento || '#06b6d4'} 
                          onChange={(e) => setConfigUITema({
                            ...configUITema,
                            tema: { ...configUITema.tema, color_acento: e.target.value }
                          })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700" 
                        />
                        <span className="font-mono text-slate-300">{configUITema.tema?.color_acento}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Color de Borde:</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={configUITema.tema?.color_borde || '#334155'} 
                          onChange={(e) => setConfigUITema({
                            ...configUITema,
                            tema: { ...configUITema.tema, color_borde: e.target.value }
                          })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700" 
                        />
                        <span className="font-mono text-slate-300">{configUITema.tema?.color_borde}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Textos */}
                <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <span className="font-bold text-white text-xs block uppercase tracking-wider">Lema y Portada del Dashboard</span>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Título Hero</label>
                      <input 
                        type="text" 
                        value={configUITema.hero?.titulo || ''} 
                        onChange={(e) => setConfigUITema({
                          ...configUITema,
                          hero: { ...configUITema.hero, titulo: e.target.value }
                        })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Subtítulo Hero</label>
                      <input 
                        type="text" 
                        value={configUITema.hero?.subtitulo || ''} 
                        onChange={(e) => setConfigUITema({
                          ...configUITema,
                          hero: { ...configUITema.hero, subtitulo: e.target.value }
                        })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ONBOARDING NUEVO TENANT */}
          {activeTab === 'nuevo' && (
            <div className="bg-[#1e293b] p-6 md:p-8 rounded-2xl border border-slate-700 shadow-lg space-y-6 max-w-2xl mx-auto">
              <header className="text-center pb-4 border-b border-slate-700/80">
                <h3 className="text-xl font-black text-white">Despliegue de Nueva Organización</h3>
                <p className="text-xs text-slate-400 mt-1">Crea un espacio independiente con aislamiento en la base de datos.</p>
              </header>

              <form onSubmit={handleCrearSindicato} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nombre Oficial</label>
                  <input 
                    type="text" 
                    required 
                    value={nombreSindicato} 
                    onChange={e => setNombreSindicato(e.target.value)} 
                    placeholder="Ej: Sindicato Nacional de Trabajadores..." 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">RUT Tributario</label>
                  <input 
                    type="text" 
                    required 
                    value={rutSindicato} 
                    onChange={e => setRutSindicato(e.target.value)} 
                    placeholder="Ej: 76.543.210-K" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Logo URL (Opcional)</label>
                  <input 
                    type="url" 
                    value={logoSindicato} 
                    onChange={e => setLogoSindicato(e.target.value)} 
                    placeholder="https://..." 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={creandoSindicato}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 mt-4"
                >
                  {creandoSindicato ? 'Desplegando en Supabase...' : 'Confirmar y Desplegar Sindicato'}
                </button>
              </form>
            </div>
          )}

        </div>
      </main>

      {/* --- MODAL EDITAR SINDICATO --- */}
      {sindicatoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSindicatoSeleccionado(null)}>
          <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-700/80 flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Editar Organización #{sindicatoSeleccionado.id}</h3>
              <button onClick={() => setSindicatoSeleccionado(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={guardarEdicionSindicato} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nombre</label>
                <input type="text" required value={editNombreSindicato} onChange={e => setEditNombreSindicato(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">RUT</label>
                <input type="text" required value={editRutSindicato} onChange={e => setEditRutSindicato(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Logo URL</label>
                <input type="url" value={editLogoSindicato} onChange={e => setEditLogoSindicato(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400" />
              </div>
              <button type="submit" disabled={guardandoSindicato} className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl uppercase tracking-wider transition-all mt-2">
                {guardandoSindicato ? 'Guardando...' : 'Aplicar Cambios'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL ASIGNAR USUARIO --- */}
      {usuarioSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setUsuarioSeleccionado(null)}>
          <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-700/80 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">Gestionar Usuario</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{usuarioSeleccionado.email}</p>
              </div>
              <button onClick={() => setUsuarioSeleccionado(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={guardarAsignacionTenant} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nivel de Privilegios</label>
                <select value={nuevoRol} onChange={e => setNuevoRol(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400">
                  <option value="socio">Socio Regular</option>
                  <option value="admin">Administrador Local (Presidente)</option>
                  <option value="superadmin">SuperAdministrador Global</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Organización Asignada</label>
                <select value={nuevoSindicatoId} onChange={e => setNuevoSindicatoId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400">
                  <option value="">-- Sin Organización (Global) --</option>
                  {sindicatos.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Estado de Acceso</label>
                <select value={nuevoEstadoUsuario} onChange={e => setNuevoEstadoUsuario(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400">
                  <option value="activo">Activo</option>
                  <option value="suspendido">Suspendido (Acceso Bloqueado)</option>
                </select>
              </div>
              <button type="submit" disabled={guardandoAsignacion} className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl uppercase tracking-wider transition-all mt-2">
                {guardandoAsignacion ? 'Actualizando...' : 'Confirmar Asignación'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}