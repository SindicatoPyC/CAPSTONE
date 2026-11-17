'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

// Colores por sindicato (hasta 10)
const COLORES_SINDICATOS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899'
];

const FILTROS = [
  { label: 'Último mes', value: 1 },
  { label: 'Últimos 3 meses', value: 3 },
  { label: 'Últimos 6 meses', value: 6 },
  { label: 'Último año', value: 12 },
];

export default function SuperAdminPanel() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [validando, setValidando] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Estados Globales
  const [sindicatos, setSindicatos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
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

  // Reportes
  const [asambleasGlobal, setAsambleasGlobal] = useState<any[]>([]);
  const [loadingReportes, setLoadingReportes] = useState(false);
  const [filtroMeses, setFiltroMeses] = useState(3);

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => { if (isMounted) validarAccesoSuperAdmin(); }, [isMounted]);

  useEffect(() => {
    if (activeTab === 'reportes' && asambleasGlobal.length === 0) {
      cargarReportes();
    }
  }, [activeTab]);

  const validarAccesoSuperAdmin = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (String(data?.role || '').trim().toLowerCase() === 'superadmin') {
        setValidando(false);
        fetchSuperAdminData();
      } else {
        alert('⚠️ Acceso denegado. Se requieren privilegios de Super Administrador.');
        router.push('/dashboard');
      }
    } else {
      router.push('/');
    }
  };

  const fetchSuperAdminData = async () => {
    try {
      const supabase = createClient();
      const { data: sindData } = await supabase.from('sindicatos').select('*').order('id', { ascending: true });
      if (Array.isArray(sindData)) setSindicatos(sindData);
      const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (Array.isArray(usersData)) setUsuarios(usersData);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const cargarReportes = async () => {
    setLoadingReportes(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('historial_asambleas')
        .select('id, sindicato_id, created_at')
        .order('created_at', { ascending: true });
      if (Array.isArray(data)) setAsambleasGlobal(data);
    } catch (err) {
      console.error('Error cargando reportes:', err);
    } finally {
      setLoadingReportes(false);
    }
  };

  // ─── Procesar datos para el gráfico ──────────────────────────────────────────
  const procesarDatosGrafico = () => {
    const ahora = new Date();
    const desde = new Date(ahora.getFullYear(), ahora.getMonth() - filtroMeses + 1, 1);

    // Filtrar por rango de tiempo
    const filtradas = asambleasGlobal.filter(a => new Date(a.created_at) >= desde);

    // Generar lista de meses en el rango
    const meses: string[] = [];
    for (let i = 0; i < filtroMeses; i++) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - filtroMeses + 1 + i, 1);
      meses.push(d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }));
    }

    // Construir mapa: mes → { sindicatoNombre: count }
    const mapa: Record<string, Record<string, number>> = {};
    meses.forEach(m => { mapa[m] = {}; });

    filtradas.forEach(a => {
      const fecha = new Date(a.created_at);
      const mesKey = fecha.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
      const sindicato = sindicatos.find(s => s.id === a.sindicato_id);
      const nombre = sindicato?.nombre || `Sindicato ${a.sindicato_id}`;
      if (mapa[mesKey] !== undefined) {
        mapa[mesKey][nombre] = (mapa[mesKey][nombre] || 0) + 1;
      }
    });

    return meses.map(mes => ({ mes, ...mapa[mes] }));
  };

  const datosGrafico = procesarDatosGrafico();
  const nombresSindicatos = sindicatos.map(s => s.nombre);

  // ─── Métodos de sindicatos ────────────────────────────────────────────────────
  const handleCrearSindicato = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreandoSindicato(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('sindicatos').insert([{
        nombre: nombreSindicato, rut_sindicato: rutSindicato,
        logo_url: logoSindicato.trim() !== '' ? logoSindicato.trim() : null, estado: 'activo'
      }]);
      if (error) throw error;
      alert('✅ Organización creada exitosamente.');
      setNombreSindicato(''); setRutSindicato(''); setLogoSindicato('');
      setActiveTab('tenants');
      fetchSuperAdminData();
    } catch (err: any) { alert('❌ Error: ' + err.message); }
    finally { setCreandoSindicato(false); }
  };

  const toggleEstadoSindicato = async (id: number, estadoActual: string) => {
    const nuevoEstado = estadoActual.toLowerCase() === 'activo' ? 'suspendido' : 'activo';
    if (!window.confirm(`⚠️ ¿Estás seguro de que deseas ${nuevoEstado === 'suspendido' ? 'SUSPENDER' : 'ACTIVAR'} esta organización?`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from('sindicatos').update({ estado: nuevoEstado }).eq('id', id);
      if (error) throw error;
      fetchSuperAdminData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const guardarEdicionSindicato = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoSindicato(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('sindicatos').update({
        nombre: editNombreSindicato, rut_sindicato: editRutSindicato,
        logo_url: editLogoSindicato.trim() !== '' ? editLogoSindicato.trim() : null
      }).eq('id', sindicatoSeleccionado.id);
      if (error) throw error;
      setSindicatoSeleccionado(null);
      fetchSuperAdminData();
    } catch (err: any) { alert('❌ Error: ' + err.message); }
    finally { setGuardandoSindicato(false); }
  };

  // ─── Métodos de usuarios ──────────────────────────────────────────────────────
  const guardarAsignacionTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoAsignacion(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({
        role: nuevoRol, sindicato_id: nuevoSindicatoId ? Number(nuevoSindicatoId) : null, estado: nuevoEstadoUsuario
      }).eq('id', usuarioSeleccionado.id);
      if (error) throw error;
      setUsuarioSeleccionado(null);
      fetchSuperAdminData();
    } catch (err: any) { alert('❌ Error: ' + err.message); }
    finally { setGuardandoAsignacion(false); }
  };

  const toggleEstadoUsuario = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual.toLowerCase() === 'activo' ? 'suspendido' : 'activo';
    if (!window.confirm(`⚠️ ¿Estás seguro de que deseas ${nuevoEstado === 'suspendido' ? 'BLOQUEAR' : 'RESTAURAR'} a este usuario?`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({ estado: nuevoEstado }).eq('id', id);
      if (error) throw error;
      fetchSuperAdminData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const exportarUsuariosCSV = () => {
    const headers = ['ID', 'Nombre_Completo', 'RUT', 'Email', 'Rol', 'Estado', 'Sindicato_ID'];
    const csvContent = [
      headers.join(','),
      ...usuarios.map(u => [
        u.id, `"${u.full_name || 'Sin Nombre'}"`, u.rut || '',
        u.email || '', u.role || 'socio', u.estado || 'activo', u.sindicato_id || 'Global'
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Auditoria_Usuarios_${new Date().toLocaleDateString('es-CL')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isMounted || validando) {
    return <div className="h-screen bg-slate-900 flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const tenantsActivos = sindicatos.filter(s => (s.estado || 'activo').toLowerCase() === 'activo').length;
  const usuariosSuspendidos = usuarios.filter(u => {
    const estadoIndividual = (u.estado || 'activo').toLowerCase() === 'suspendido';
    const tenantUsuario = sindicatos.find(s => s.id === u.sindicato_id);
    const estadoTenant = tenantUsuario ? (tenantUsuario.estado || 'activo').toLowerCase() === 'suspendido' : false;
    return estadoIndividual || estadoTenant;
  }).length;
  const superAdminsCount = usuarios.filter(u => u.role === 'superadmin').length;
  const adminsCount = usuarios.filter(u => u.role === 'admin').length;
  const sociosCount = usuarios.filter(u => !u.role || u.role === 'socio').length;

  return (
    <div className="flex h-screen bg-[#f4f7fb] font-sans overflow-hidden text-slate-900">

      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl relative z-20">
        <div className="p-8 border-b border-white/5 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-xl font-black">⚡</span>
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight leading-none">Master SaaS</h1>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Control Global</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {[
            { id: 'dashboard', icon: '📊', label: 'Resumen General' },
            { id: 'tenants',   icon: '🏢', label: 'Organizaciones' },
            { id: 'usuarios',  icon: '👥', label: 'Padrón Global' },
            { id: 'reportes',  icon: '📈', label: 'Reportes' },
            { id: 'nuevo',     icon: '✨', label: 'Registrar Nuevo' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <span className="text-lg">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <Link href="/dashboard/admin" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
            ⇦ Volver al Panel
          </Link>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20"></div>

        <div className="p-10 max-w-7xl mx-auto space-y-8 relative z-10">

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="mb-8 flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Rendimiento de la Plataforma</h2>
                  <p className="text-slate-500 font-medium">Estadísticas en tiempo real del ecosistema Multi-Tenant.</p>
                </div>
                <button onClick={exportarUsuariosCSV} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-black px-4 py-2.5 rounded-xl text-xs shadow-sm flex items-center gap-2 transition-all">
                  <span>⬇️</span> Exportar Padrón (CSV)
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-4">🏢</div>
                  <h4 className="text-3xl font-black text-slate-800">{sindicatos.length}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Tenants</p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mb-4">🟢</div>
                  <h4 className="text-3xl font-black text-slate-800">{tenantsActivos}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Tenants Activos</p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-4">👥</div>
                  <h4 className="text-3xl font-black text-slate-800">{usuarios.length}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Usuarios Globales</p>
                </div>
                <div className="bg-red-50 rounded-[2rem] p-6 shadow-xl shadow-red-200/50 border border-red-100">
                  <div className="w-12 h-12 bg-white text-red-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">⛔</div>
                  <h4 className="text-3xl font-black text-red-700">{usuariosSuspendidos}</h4>
                  <p className="text-xs font-bold text-red-500 uppercase tracking-widest mt-1">Accesos Bloqueados</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                  <h3 className="text-lg font-black text-slate-800 mb-6">Últimos Registros (Auditoría)</h3>
                  <div className="space-y-4">
                    {usuarios.slice(0, 5).map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-lg font-bold text-slate-400 border border-slate-200">
                            {u.full_name ? u.full_name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{u.full_name || 'Usuario Nuevo'}</p>
                            <p className="text-xs font-medium text-slate-500">{u.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{u.role || 'socio'}</span>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(u.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                    <h3 className="text-lg font-black text-slate-800 mb-6">Distribución de Permisos</h3>
                    <div className="space-y-5">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-2"><span className="text-slate-600">Socios Base</span><span className="text-slate-800">{sociosCount}</span></div>
                        <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-blue-400 h-2 rounded-full" style={{ width: `${(sociosCount / usuarios.length) * 100}%` }}></div></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-2"><span className="text-slate-600">Administradores (Directiva)</span><span className="text-slate-800">{adminsCount}</span></div>
                        <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-amber-400 h-2 rounded-full" style={{ width: `${(adminsCount / usuarios.length) * 100}%` }}></div></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-2"><span className="text-slate-600">Super Admins</span><span className="text-slate-800">{superAdminsCount}</span></div>
                        <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(superAdminsCount / usuarios.length) * 100}%` }}></div></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[2rem] p-8 shadow-xl shadow-indigo-500/10 border border-slate-800">
                    <h3 className="text-lg font-black text-white mb-6">Salud del Sistema</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base de Datos</span><span className="flex items-center gap-2 text-xs font-bold text-emerald-400"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div> Conectado</span></div>
                      <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Storage (Bucket)</span><span className="flex items-center gap-2 text-xs font-bold text-emerald-400"><div className="w-2 h-2 bg-emerald-400 rounded-full"></div> Operativo</span></div>
                      <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Auth (Supabase)</span><span className="flex items-center gap-2 text-xs font-bold text-emerald-400"><div className="w-2 h-2 bg-emerald-400 rounded-full"></div> Seguro</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ORGANIZACIONES */}
          {activeTab === 'tenants' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="mb-8 flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gestor de Organizaciones</h2>
                  <p className="text-slate-500 font-medium">Administra los accesos y configuraciones de cada sindicato.</p>
                </div>
                <button onClick={() => setActiveTab('nuevo')} className="bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-3 rounded-xl text-sm transition-all shadow-lg">+ Nuevo Tenant</button>
              </header>
              <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-6 pl-8">Organización</th><th className="p-6">RUT</th><th className="p-6 text-center">Estatus</th><th className="p-6 pr-8 text-right">Controles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sindicatos.map((s) => {
                      const isActivo = (s.estado || 'activo').toLowerCase() === 'activo';
                      return (
                        <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${!isActivo ? 'bg-red-50/30' : ''}`}>
                          <td className="p-6 pl-8">
                            <span className={`font-extrabold block text-sm ${!isActivo ? 'text-red-700' : 'text-slate-800'}`}>{s.nombre}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {s.id}</span>
                          </td>
                          <td className="p-6 font-bold text-slate-600 text-sm">{s.rut_sindicato}</td>
                          <td className="p-6 text-center">
                            <span className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full border ${isActivo ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{s.estado || 'activo'}</span>
                          </td>
                          <td className="p-6 pr-8 flex justify-end gap-2">
                            <button onClick={() => { setSindicatoSeleccionado(s); setEditNombreSindicato(s.nombre); setEditRutSindicato(s.rut_sindicato); setEditLogoSindicato(s.logo_url || ''); }} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black rounded-xl transition-all shadow-sm">Editar</button>
                            <button onClick={() => toggleEstadoSindicato(s.id, s.estado || 'activo')} className={`px-4 py-2 text-white text-xs font-black rounded-xl transition-all shadow-md ${isActivo ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>{isActivo ? 'Bloquear' : 'Restaurar'}</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: PADRÓN GLOBAL */}
          {activeTab === 'usuarios' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="mb-8">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Directorio Global de Cuentas</h2>
                <p className="text-slate-500 font-medium">Administra niveles de acceso, mueve usuarios entre tenants o bloquea cuentas.</p>
              </header>
              <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-6 pl-8">Usuario</th><th className="p-6">RUT / Permisos</th><th className="p-6">Tenant Asignado</th><th className="p-6 pr-8 text-right">Controles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {usuarios.map((user) => {
                      const sindicatoAsociado = sindicatos.find(s => s.id === user.sindicato_id);
                      const estadoPersonal = (user.estado || 'activo').toLowerCase() === 'activo';
                      return (
                        <tr key={user.id} className={`transition-colors ${estadoPersonal ? 'hover:bg-slate-50' : 'bg-red-50/50'}`}>
                          <td className="p-6 pl-8">
                            <div className="flex items-center gap-2">
                              <span className={`font-extrabold block text-sm ${!estadoPersonal ? 'text-red-700' : 'text-slate-800'}`}>{user.full_name || 'Sin nombre'}</span>
                              {!estadoPersonal && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">Bloqueado</span>}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 truncate w-48 block">{user.email}</span>
                          </td>
                          <td className="p-6">
                            <span className="font-bold text-slate-600 block text-sm mb-1">{user.rut}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border ${user.role === 'superadmin' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : user.role === 'admin' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{user.role || 'socio'}</span>
                          </td>
                          <td className="p-6">
                            {sindicatoAsociado ? (
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${sindicatoAsociado.estado === 'suspendido' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                <span className="font-bold text-slate-700 text-sm">{sindicatoAsociado.nombre}</span>
                              </div>
                            ) : <span className="text-xs font-bold text-slate-400 italic">Global / No asignado</span>}
                          </td>
                          <td className="p-6 pr-8 text-right flex justify-end gap-2">
                            <button onClick={() => { setUsuarioSeleccionado(user); setNuevoRol(user.role || 'socio'); setNuevoSindicatoId(user.sindicato_id ? String(user.sindicato_id) : ''); setNuevoEstadoUsuario(user.estado || 'activo'); }} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black rounded-xl transition-all shadow-sm">Modificar</button>
                            <button onClick={() => toggleEstadoUsuario(user.id, user.estado || 'activo')} className={`px-4 py-2 text-white text-xs font-black rounded-xl transition-all shadow-md ${estadoPersonal ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>{estadoPersonal ? 'Bloquear' : 'Restaurar'}</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: REPORTES */}
          {activeTab === 'reportes' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <header>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Reportes Globales</h2>
                <p className="text-slate-500 font-medium">Actividad de asambleas por sindicato a lo largo del tiempo.</p>
              </header>

              {/* Gráfico: Asambleas por sindicato */}
              <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800">Asambleas Realizadas por Sindicato</h3>
                    <p className="text-xs text-slate-400 mt-1">Cantidad de sesiones registradas por organización en el tiempo.</p>
                  </div>
                  {/* Filtro de tiempo */}
                  <div className="flex gap-2 flex-wrap">
                    {FILTROS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setFiltroMeses(f.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${filtroMeses === f.value ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {loadingReportes ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : asambleasGlobal.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <span className="text-4xl mb-3">📭</span>
                    <p className="font-bold text-sm">Sin datos de asambleas registrados.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={datosGrafico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                        formatter={(val: any, name: any) => [`${val} asambleas`, name]}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      {nombresSindicatos.map((nombre, i) => (
                        <Bar
                          key={nombre}
                          dataKey={nombre}
                          stackId="asambleas"
                          fill={COLORES_SINDICATOS[i % COLORES_SINDICATOS.length]}
                          radius={i === nombresSindicatos.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Tarjetas resumen por sindicato */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sindicatos.map((s, i) => {
                  const totalAsambleas = asambleasGlobal.filter(a => a.sindicato_id === s.id).length;
                  const totalSocios = usuarios.filter(u => u.sindicato_id === s.id).length;
                  const isActivo = (s.estado || 'activo').toLowerCase() === 'activo';
                  return (
                    <div key={s.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-3 h-3 rounded-full" style={{ background: COLORES_SINDICATOS[i % COLORES_SINDICATOS.length] }}></div>
                        <span className="font-black text-sm text-slate-800 truncate">{s.nombre}</span>
                        <span className={`ml-auto text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isActivo ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{s.estado || 'activo'}</span>
                      </div>
                      <div className="flex justify-between text-center">
                        <div>
                          <p className="text-2xl font-black text-slate-800">{totalAsambleas}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Asambleas</p>
                        </div>
                        <div className="w-px bg-slate-100"></div>
                        <div>
                          <p className="text-2xl font-black text-slate-800">{totalSocios}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Socios</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: NUEVO SINDICATO */}
          {activeTab === 'nuevo' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
              <header className="mb-8 text-center">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm border border-indigo-200">🏢</div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Onboarding de Tenant</h2>
                <p className="text-slate-500 font-medium">Crea un espacio independiente en la base de datos.</p>
              </header>
              <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-10">
                <form onSubmit={handleCrearSindicato} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre Oficial</label>
                    <input type="text" required value={nombreSindicato} onChange={e => setNombreSindicato(e.target.value)} placeholder="Ej: Sindicato Nacional..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">RUT Tributario</label>
                    <input type="text" required value={rutSindicato} onChange={e => setRutSindicato(e.target.value)} placeholder="Ej: 70.123.456-7" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Logotipo Corporativo (URL)</label>
                    <input type="url" value={logoSindicato} onChange={e => setLogoSindicato(e.target.value)} placeholder="https://..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                  </div>
                  <button type="submit" disabled={creandoSindicato} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-500/30 text-sm uppercase tracking-widest mt-8 transition-all">
                    {creandoSindicato ? 'Construyendo Entorno...' : 'Desplegar Nuevo Sindicato'}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODALES */}
      {sindicatoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setSindicatoSeleccionado(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div><h3 className="text-xl font-black text-slate-800">Editar Tenant</h3><p className="text-[10px] font-black text-slate-400 uppercase mt-1">ID: {sindicatoSeleccionado.id}</p></div>
              <button onClick={() => setSindicatoSeleccionado(null)} className="text-slate-400 font-bold text-xl hover:text-slate-800">✕</button>
            </div>
            <form onSubmit={guardarEdicionSindicato} className="p-8 space-y-5">
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nombre</label><input type="text" required value={editNombreSindicato} onChange={e => setEditNombreSindicato(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 outline-none" /></div>
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">RUT</label><input type="text" required value={editRutSindicato} onChange={e => setEditRutSindicato(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 outline-none" /></div>
              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Logo</label><input type="url" value={editLogoSindicato} onChange={e => setEditLogoSindicato(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 outline-none" /></div>
              <button type="submit" disabled={guardandoSindicato} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl mt-4">{guardandoSindicato ? 'Guardando...' : 'Aplicar Cambios'}</button>
            </form>
          </div>
        </div>
      )}

      {usuarioSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setUsuarioSeleccionado(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div><h3 className="text-xl font-black text-slate-800">Gestionar Permisos</h3><p className="text-[10px] font-black text-slate-400 uppercase mt-1">{usuarioSeleccionado.full_name}</p></div>
              <button onClick={() => setUsuarioSeleccionado(null)} className="text-slate-400 font-bold text-xl hover:text-slate-800">✕</button>
            </div>
            <form onSubmit={guardarAsignacionTenant} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nivel de Acceso</label>
                <select value={nuevoRol} onChange={e => setNuevoRol(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                  <option value="socio">Socio Normal</option>
                  <option value="admin">Administrador Local</option>
                  <option value="superadmin">Super Admin Global</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Asignar a Organización</label>
                <select value={nuevoSindicatoId} onChange={e => setNuevoSindicatoId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                  <option value="">-- Sin Asignar --</option>
                  {sindicatos.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <button type="submit" disabled={guardandoAsignacion} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl mt-4 shadow-lg shadow-indigo-500/20">{guardandoAsignacion ? 'Actualizando...' : 'Guardar Perfil'}</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
