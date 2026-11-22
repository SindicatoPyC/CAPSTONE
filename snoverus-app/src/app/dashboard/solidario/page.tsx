'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { notificar } from '../../lib/notificar';

export default function SolidarioPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sindicatoIdActual, setSindicatoIdActual] = useState<number | null>(null);

  // Estados de Datos
  const [meta, setMeta] = useState(1000000);
  const [aportes, setAportes] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);

  // Estados de Modales Socio
  const [showAportarModal, setShowAportarModal] = useState(false);
  const [montoAporte, setMontoAporte] = useState('');
  const [archivoAporte, setArchivoAporte] = useState<File | null>(null);
  const [enviandoAporte, setEnviandoAporte] = useState(false);

  const [showSolicitarModal, setShowSolicitarModal] = useState(false);
  const [tipoBeneficio, setTipoBeneficio] = useState('Salud / Emergencia Médica');
  const [montoSolicitado, setMontoSolicitado] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);

  // Estados de Modales Admin
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [nuevaMeta, setNuevaMeta] = useState('');
  const [guardandoMeta, setGuardandoMeta] = useState(false);

  const [perfilCache, setPerfilCache] = useState<any>(null);

  useEffect(() => {
    fetchSolidarioData();
  }, []);

  async function fetchSolidarioData() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (currentUser) {
      setUser(currentUser);
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
      
      if (profile) {
        setPerfilCache(profile);
        let targetSindicatoId = profile.sindicato_id;

        // Si es Superadmin, respeta el sindicato activo seleccionado en el Navbar (localStorage)
        const rolUsuario = String(profile.role || '').toLowerCase();
        const esAdministrador = rolUsuario === 'admin' || rolUsuario === 'administrador' || rolUsuario === 'directiva' || rolUsuario === 'superadmin';
        setIsAdmin(esAdministrador);

        if (rolUsuario === 'superadmin') {
          const cachedTenant = localStorage.getItem('sindicato_activo');
          if (cachedTenant) {
            targetSindicatoId = Number(cachedTenant);
          }
        }

        if (targetSindicatoId) {
          setSindicatoIdActual(targetSindicatoId);

          // Traer Meta Multi-Tenant desde la configuración del sindicato (o fallback a tabla)
          const { data: sindicatoData } = await supabase.from('sindicatos').select('config_ui').eq('id', targetSindicatoId).single();
          if (sindicatoData?.config_ui?.fondo_meta) {
            setMeta(Number(sindicatoData.config_ui.fondo_meta));
          } else {
            const { data: metaData } = await supabase.from('fondo_meta').select('monto_meta').eq('id', 1).maybeSingle();
            if (metaData) setMeta(metaData.monto_meta);
          }

          // Traer Aportes filtrados por sindicato_id (con control limpio para socios/admins)
          let queryAportes = supabase.from('fondo_aportes').select('*').eq('sindicato_id', targetSindicatoId).order('created_at', { ascending: false });
          if (!esAdministrador) {
            queryAportes = queryAportes.eq('user_id', currentUser.id);
          }
          const { data: aportesData } = await queryAportes;
          setAportes(aportesData || []);

          // Traer Solicitudes (fondo_solidario) filtradas por sindicato_id
          let querySol = supabase.from('fondo_solidario').select('*').eq('sindicato_id', targetSindicatoId).order('created_at', { ascending: false });
          if (!esAdministrador) {
            querySol = querySol.eq('usuario_rut', profile.rut);
          }
          const { data: solData } = await querySol;
          setSolicitudes(solData || []);
        }
      }
    }
    setLoading(false);
  }

  // --- ACCIONES SOCIO ---
  const handleEnviarAporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivoAporte) return notificar("Sube el comprobante de transferencia.");
    if (!sindicatoIdActual) return notificar("Error: No se detectó el sindicato activo.");
    
    setEnviandoAporte(true);
    try {
      const supabase = createClient();
      const fileExt = archivoAporte.name.split('.').pop();
      const fileName = `${user.id}_aporte_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('comprobantes').upload(fileName, archivoAporte);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('comprobantes').getPublicUrl(fileName);
      
      await supabase.from('fondo_aportes').insert([{
        sindicato_id: sindicatoIdActual,
        user_id: user.id, 
        rut: perfilCache.rut, 
        nombre: perfilCache.full_name, 
        monto: parseInt(montoAporte), 
        comprobante_url: publicUrlData.publicUrl, 
        estado: 'Pendiente'
      }]);

      notificar("✅ Aporte enviado para revisión. ¡Gracias por tu solidaridad!");
      setShowAportarModal(false);
      setMontoAporte(''); setArchivoAporte(null);
      fetchSolidarioData();
    } catch (err: any) { notificar("Error: " + err.message); } finally { setEnviandoAporte(false); }
  };

  const handleEnviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sindicatoIdActual) return notificar("Error: No se detectó el sindicato activo.");
    
    setEnviandoSolicitud(true);
    try {
      const supabase = createClient();
      await supabase.from('fondo_solidario').insert([{
        sindicato_id: sindicatoIdActual,
        usuario_rut: perfilCache.rut, 
        tipo_beneficio: tipoBeneficio, 
        monto_solicitado: parseInt(montoSolicitado), 
        descripcion: descripcion, 
        estado: 'En Revisión'
      }]);
      notificar("✅ Solicitud de auxilio enviada al directorio.");
      setShowSolicitarModal(false);
      setMontoSolicitado(''); setDescripcion('');
      fetchSolidarioData();
    } catch (err: any) { notificar("Error: " + err.message); } finally { setEnviandoSolicitud(false); }
  };

  // --- ACCIONES ADMIN ---
  const handleGuardarMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sindicatoIdActual) return;
    setGuardandoMeta(true);
    try {
      const supabase = createClient();
      
      const { data: sindicatoActual } = await supabase.from('sindicatos').select('config_ui').eq('id', sindicatoIdActual).single();
      const configActual = sindicatoActual?.config_ui || {};
      configActual.fondo_meta = parseInt(nuevaMeta);

      await supabase.from('sindicatos').update({ config_ui: configActual }).eq('id', sindicatoIdActual);
      
      setMeta(parseInt(nuevaMeta));
      setShowMetaModal(false);
      setNuevaMeta('');
      notificar("✅ Meta actualizada con éxito para tu organización.");
    } catch (err) { notificar("Error al guardar la meta."); } finally { setGuardandoMeta(false); }
  };

  const handleCambiarEstadoAporte = async (id: number, nuevoEstado: string) => {
    const supabase = createClient();
    await supabase.from('fondo_aportes').update({ estado: nuevoEstado }).eq('id', id);
    setAportes(aportes.map(a => a.id === id ? { ...a, estado: nuevoEstado } : a));
  };

  const handleCambiarEstadoSolicitud = async (id: number, nuevoEstado: string) => {
    const supabase = createClient();
    await supabase.from('fondo_solidario').update({ estado: nuevoEstado }).eq('id', id);
    setSolicitudes(solicitudes.map(s => s.id === id ? { ...s, estado: nuevoEstado } : s));
  };

  // Cálculos
  const totalRecaudado = aportes.filter(a => a.estado === 'Aprobado').reduce((sum, curr) => sum + Number(curr.monto), 0);
  const porcentajeMeta = Math.min(100, (totalRecaudado / meta) * 100);

  const getBadgeStyle = (estado: string) => {
    switch (estado) {
      case 'Aprobado': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rechazado': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center"><div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20 selection:bg-rose-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-8 relative z-10">
        
        {/* CABECERA Y META PREMIUM */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 p-8 relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          
          <div className="relative z-10 w-full lg:w-1/2">
            <span className="bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4 inline-block shadow-sm">Apoyo Mutuo</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight mb-2">Fondo Solidario</h2>
            <p className="text-slate-500 max-w-xl text-sm font-medium">Financiado por y para los socios. Apoya a tus compañeros o solicita asistencia en caso de emergencias médicas o familiares.</p>
            
            {!isAdmin && (
              <div className="mt-8 flex gap-4">
                <button onClick={() => setShowAportarModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest px-6 py-3.5 rounded-xl shadow-lg transition-transform hover:-translate-y-1">💚 Realizar Aporte</button>
                <button onClick={() => setShowSolicitarModal(true)} className="bg-white hover:bg-slate-50 text-rose-600 border border-rose-200 text-xs font-black uppercase tracking-widest px-6 py-3.5 rounded-xl shadow-sm transition-transform hover:-translate-y-1">🆘 Solicitar Auxilio</button>
              </div>
            )}
            {isAdmin && (
              <div className="mt-8">
                <button onClick={() => setShowMetaModal(true)} className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest px-6 py-3.5 rounded-xl shadow-lg shadow-rose-500/30 transition-transform hover:-translate-y-1">🎯 Configurar Meta</button>
              </div>
            )}
          </div>

          {/* BARRA DE PROGRESO GLOBAL */}
          <div className="w-full lg:w-5/12 bg-slate-900 rounded-3xl p-8 relative overflow-hidden shadow-2xl shadow-slate-900/20 shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Progreso de Recaudación</p>
            
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-sm font-bold text-slate-400">Recaudado</p>
                <p className="text-3xl font-black text-white">${totalRecaudado.toLocaleString('es-CL')}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-500">Meta Actual</p>
                <p className="text-lg font-bold text-rose-400">${meta.toLocaleString('es-CL')}</p>
              </div>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner relative">
              <div className="bg-gradient-to-r from-rose-500 to-pink-400 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${porcentajeMeta}%` }}>
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <p className="text-right text-xs font-black text-rose-500 mt-2">{porcentajeMeta.toFixed(1)}% Completado</p>
          </div>
        </motion.div>

        {/* TABLAS DE GESTIÓN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* APORTES VOLUNTARIOS */}
          <motion.section initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100/80 p-8 flex flex-col overflow-hidden">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 text-xl shadow-sm border border-emerald-100/50">💸</div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{isAdmin ? 'Auditoría de Aportes' : 'Mis Aportes'}</h3>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm flex-1 bg-white">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {isAdmin && <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Socio</th>}
                    <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                    <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Monto</th>
                    <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {aportes.length === 0 ? (
                    <tr><td colSpan={isAdmin ? 4 : 3} className="p-8 text-center text-slate-400 text-xs font-bold">No hay registros de aportes.</td></tr>
                  ) : aportes.map(aporte => (
                    <tr key={aporte.id} className="hover:bg-slate-50/80 transition-colors">
                      {isAdmin && (
                        <td className="p-4">
                          <span className="font-bold text-slate-800 text-xs block">{aporte.nombre}</span>
                          <span className="text-[9px] font-bold text-slate-400">{aporte.rut}</span>
                        </td>
                      )}
                      <td className="p-4 text-xs font-bold text-slate-600">{new Date(aporte.created_at).toLocaleDateString('es-CL')}</td>
                      <td className="p-4 font-black text-emerald-600 text-sm">${Number(aporte.monto).toLocaleString('es-CL')}</td>
                      <td className="p-4 text-right">
                        {isAdmin ? (
                          <div className="flex justify-end gap-2 items-center">
                            {aporte.comprobante_url && <a href={aporte.comprobante_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 underline font-bold hover:text-blue-800 mr-2">Ver Doc</a>}
                            <select 
                              value={aporte.estado}
                              onChange={(e) => handleCambiarEstadoAporte(aporte.id, e.target.value)}
                              className={`appearance-none text-[9px] font-black uppercase tracking-widest rounded-lg px-2.5 py-1.5 outline-none cursor-pointer border text-center ${aporte.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : aporte.estado === 'Rechazado' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                            >
                              <option value="Aprobado">Aprobado</option>
                              <option value="Pendiente">Pendiente</option>
                              <option value="Rechazado">Rechazado</option>
                            </select>
                          </div>
                        ) : (
                          <span className={`inline-flex px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${aporte.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : aporte.estado === 'Rechazado' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {aporte.estado}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* SOLICITUDES DE AYUDA (fondo_solidario original) */}
          <motion.section initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100/80 p-8 flex flex-col overflow-hidden">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-rose-50 p-3 rounded-2xl text-rose-600 text-xl shadow-sm border border-rose-100/50">🤝</div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{isAdmin ? 'Solicitudes de Asistencia' : 'Mis Solicitudes'}</h3>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm flex-1 bg-white">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {isAdmin && <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">RUT Socio</th>}
                    <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Motivo</th>
                    <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Monto</th>
                    <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {solicitudes.length === 0 ? (
                    <tr><td colSpan={isAdmin ? 4 : 3} className="p-8 text-center text-slate-400 text-xs font-bold">No hay solicitudes.</td></tr>
                  ) : solicitudes.map(sol => (
                    <tr key={sol.id} className="hover:bg-slate-50/80 transition-colors">
                      {isAdmin && (
                        <td className="p-4 font-bold text-slate-600 text-xs">{sol.usuario_rut}</td>
                      )}
                      <td className="p-4">
                        <span className="text-xs font-black text-slate-700 block mb-0.5">{sol.tipo_beneficio}</span>
                        <span className="text-[10px] font-medium text-slate-500 line-clamp-1">{sol.descripcion}</span>
                      </td>
                      <td className="p-4 font-black text-rose-600 text-sm">${Number(sol.monto_solicitado).toLocaleString('es-CL')}</td>
                      <td className="p-4 text-right">
                        {isAdmin ? (
                          <select 
                            value={sol.estado === 'En Revisión' ? 'Pendiente' : sol.estado}
                            onChange={(e) => handleCambiarEstadoSolicitud(sol.id, e.target.value)}
                            className={`appearance-none text-[9px] font-black uppercase tracking-widest rounded-lg px-2.5 py-1.5 outline-none cursor-pointer border text-center ${sol.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : sol.estado === 'Rechazado' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                          >
                            <option value="Aprobado">Aprobado</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="En Revisión">En Revisión</option>
                            <option value="Rechazado">Rechazado</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${getBadgeStyle(sol.estado)}`}>
                            {sol.estado}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

        </div>
      </main>

      <AnimatePresence>
        {/* MODALES ADAPTADOS CON ESTILOS MODERNOS */}
        
        {/* MODAL ADMIN: CONFIGURAR META */}
        {showMetaModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col border border-slate-100">
               <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center rounded-t-[2rem]">
                 <h3 className="text-xl font-black text-slate-800">Meta del Fondo</h3>
                 <button onClick={() => setShowMetaModal(false)} className="text-slate-400 hover:text-slate-800 text-xl font-bold bg-white w-8 h-8 rounded-full shadow-sm">✕</button>
               </div>
               <form onSubmit={handleGuardarMeta} className="p-6 space-y-4">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nuevo Monto Meta ($)</label>
                   <input type="number" required value={nuevaMeta} onChange={e => setNuevaMeta(e.target.value)} placeholder="Ej: 2000000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm" />
                 </div>
                 <button type="submit" disabled={guardandoMeta} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-4 rounded-xl shadow-lg transition-all text-sm uppercase tracking-widest mt-2">
                   {guardandoMeta ? 'Guardando...' : 'Actualizar Meta'}
                 </button>
               </form>
             </div>
          </motion.div>
        )}

        {/* MODAL SOCIO: APORTAR */}
        {showAportarModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col border border-slate-100">
               <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center rounded-t-[2rem]">
                 <div className="flex items-center gap-3">
                   <div className="bg-emerald-100 text-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center text-xl">💚</div>
                   <h3 className="text-xl font-black text-slate-800">Nuevo Aporte</h3>
                 </div>
                 <button onClick={() => setShowAportarModal(false)} className="text-slate-400 hover:text-slate-800 text-xl font-bold bg-white w-8 h-8 rounded-full shadow-sm">✕</button>
               </div>
               <form onSubmit={handleEnviarAporte} className="p-6 space-y-4">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monto Transferido ($)</label>
                   <input type="number" required value={montoAporte} onChange={e => setMontoAporte(e.target.value)} placeholder="Ej: 5000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Comprobante</label>
                    <input type="file" required accept=".pdf, image/*" onChange={(e) => setArchivoAporte(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl p-1.5 shadow-sm" />
                 </div>
                 <button type="submit" disabled={enviandoAporte} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-lg transition-all text-sm uppercase tracking-widest mt-4">
                   {enviandoAporte ? 'Subiendo...' : 'Notificar Aporte'}
                 </button>
               </form>
             </div>
          </motion.div>
        )}

        {/* MODAL SOCIO: SOLICITAR AYUDA */}
        {showSolicitarModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl flex flex-col border border-slate-100">
               <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center rounded-t-[2rem]">
                 <div className="flex items-center gap-3">
                   <div className="bg-rose-100 text-rose-600 w-10 h-10 rounded-xl flex items-center justify-center text-xl">🆘</div>
                   <h3 className="text-xl font-black text-slate-800">Solicitar Ayuda</h3>
                 </div>
                 <button onClick={() => setShowSolicitarModal(false)} className="text-slate-400 hover:text-slate-800 text-xl font-bold bg-white w-8 h-8 rounded-full shadow-sm">✕</button>
               </div>
               <form onSubmit={handleEnviarSolicitud} className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Causal de Solicitud</label>
                     <select value={tipoBeneficio} onChange={e => setTipoBeneficio(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm">
                       <option value="Salud / Médica">Salud / Médica</option>
                       <option value="Bono Nacimiento">Bono Nacimiento</option>
                       <option value="Defunción">Defunción Familiar</option>
                       <option value="Siniestro">Siniestro / Catástrofe</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monto Solicitado ($)</label>
                     <input type="number" required value={montoSolicitado} onChange={e => setMontoSolicitado(e.target.value)} placeholder="Ej: 50000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm" />
                   </div>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Motivo o Justificación Breve</label>
                    <textarea rows={3} required value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Explica brevemente tu situación..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm resize-none"></textarea>
                 </div>
                 <button type="submit" disabled={enviandoSolicitud} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-lg transition-all text-sm uppercase tracking-widest mt-4">
                   {enviandoSolicitud ? 'Enviando...' : 'Enviar Solicitud al Directorio'}
                 </button>
               </form>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}