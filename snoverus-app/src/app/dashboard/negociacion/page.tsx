'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { notificar } from '../../lib/notificar';

export default function NegociacionPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estados de Datos
  const [infoGeneral, setInfoGeneral] = useState<any>(null);
  const [hitos, setHitos] = useState<any[]>([]);

  // Modales Admin
  const [showModalInfo, setShowModalInfo] = useState(false);
  const [showModalHito, setShowModalHito] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Formularios
  const [formInfo, setFormInfo] = useState({ titulo: '', descripcion: '' });
  const [archivoPetitorio, setArchivoPetitorio] = useState<File | null>(null);

  const [isEditingHito, setIsEditingHito] = useState(false);
  const [currentHitoId, setCurrentHitoId] = useState<number | null>(null);
  const [formHito, setFormHito] = useState({ titulo: '', descripcion: '', fecha: '', estado: 'Pendiente' });

  useEffect(() => {
    fetchNegociacionData();
  }, []);

  async function fetchNegociacionData() {
    setLoading(true);
    const supabase = createClient();
    
    // 🛡️ Escudo de Sesión
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      await supabase.auth.signOut();
      router.push('/');
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const rolUsuario = String(profile?.role || '').toLowerCase();
    setIsAdmin(rolUsuario === 'admin' || rolUsuario === 'administrador' || rolUsuario === 'directiva');

    // 1. Traer Información de la Negociación ACTIVA
    const { data: infoData } = await supabase
      .from('negociacion_info')
      .select('*')
      .eq('estado', 'Activa')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (infoData) {
      setInfoGeneral(infoData);
      setFormInfo({ titulo: infoData.titulo, descripcion: infoData.descripcion || '' });

      // 2. Traer Hitos del Cronograma que pertenezcan a esta negociación
      const { data: hitosData } = await supabase
        .from('hitos_negociacion')
        .select('*')
        .eq('negociacion_id', infoData.id)
        .order('fecha', { ascending: true });
        
      if (hitosData) setHitos(hitosData);
    } else {
      // Si por alguna razón no hay activa, la creamos (o dejamos en blanco)
      setInfoGeneral(null);
    }

    setLoading(false);
  }

  // --- FUNCIONES ADMIN: INFO GENERAL ---
  const handleGuardarInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const supabase = createClient();
      let publicUrl = infoGeneral?.petitorio_url;

      if (archivoPetitorio) {
        const fileExt = archivoPetitorio.name.split('.').pop();
        const fileName = `petitorio_${Date.now()}.${fileExt}`;
        
        // Se asume el uso del bucket "actas" para guardar los Pdfs
        const { error: uploadActasError } = await supabase.storage.from('actas').upload(fileName, archivoPetitorio);
        if (uploadActasError) throw uploadActasError;
        
        const { data: urlData } = supabase.storage.from('actas').getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      }

      if (infoGeneral) {
        await supabase.from('negociacion_info').update({
          titulo: formInfo.titulo,
          descripcion: formInfo.descripcion,
          petitorio_url: publicUrl
        }).eq('id', infoGeneral.id);
      }

      notificar('✅ Información actualizada.');
      setShowModalInfo(false);
      setArchivoPetitorio(null);
      fetchNegociacionData();
    } catch (err: any) { notificar("❌ Error: " + err.message); } finally { setGuardando(false); }
  };

  // --- NUEVA FUNCIÓN ADMIN: ARCHIVAR PROCESO ---
  const handleArchivarProceso = async () => {
    if (!window.confirm("⚠️ ¿Estás seguro de archivar esta negociación? Se guardará en el historial y se abrirá un nuevo proceso en blanco.")) return;
    
    setLoading(true);
    const supabase = createClient();
    
    try {
      // 1. Archivar la actual
      await supabase.from('negociacion_info').update({ estado: 'Archivada' }).eq('id', infoGeneral.id);
      
      // 2. Crear una nueva negociación en blanco
      await supabase.from('negociacion_info').insert([{ 
        titulo: 'Nueva Negociación Colectiva', 
        descripcion: 'Sigue en tiempo real el avance legal de nuestro pliego de peticiones.',
        estado: 'Activa'
      }]);

      notificar('📦 Proceso archivado exitosamente. Se ha habilitado una nueva negociación.');
      fetchNegociacionData();
    } catch (err: any) {
      notificar("❌ Error al archivar: " + err.message);
      setLoading(false);
    }
  };

  // --- FUNCIONES ADMIN: HITOS ---
  const openCrearHito = () => {
    setFormHito({ titulo: '', descripcion: '', fecha: '', estado: 'Pendiente' });
    setIsEditingHito(false);
    setShowModalHito(true);
  };

  const openEditarHito = (hito: any) => {
    setFormHito({ titulo: hito.titulo, descripcion: hito.descripcion, fecha: hito.fecha, estado: hito.estado });
    setCurrentHitoId(hito.id);
    setIsEditingHito(true);
    setShowModalHito(true);
  };

  const handleGuardarHito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoGeneral) return notificar("No hay una negociación activa.");
    setGuardando(true);
    try {
      const supabase = createClient();
      if (isEditingHito && currentHitoId) {
        await supabase.from('hitos_negociacion').update(formHito).eq('id', currentHitoId);
      } else {
        await supabase.from('hitos_negociacion').insert([{ ...formHito, negociacion_id: infoGeneral.id }]);
      }
      setShowModalHito(false);
      fetchNegociacionData();
    } catch (err: any) { notificar("❌ Error: " + err.message); } finally { setGuardando(false); }
  };

  const handleEliminarHito = async (id: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar este hito del cronograma?")) return;
    try {
      const supabase = createClient();
      await supabase.from('hitos_negociacion').delete().eq('id', id);
      setHitos(hitos.filter(h => h.id !== id));
    } catch (err: any) { notificar("Error al eliminar."); }
  };

  // NUEVA FUNCIÓN: CAMBIO DE ESTADO EN VIVO DESDE LA TARJETA
  const handleCambiarEstadoHitoVivo = async (id: number, nuevoEstado: string) => {
    try {
      const supabase = createClient();
      await supabase.from('hitos_negociacion').update({ estado: nuevoEstado }).eq('id', id);
      // Actualización optimista del UI
      setHitos(hitos.map(h => h.id === id ? { ...h, estado: nuevoEstado } : h));
    } catch (err: any) {
      notificar("❌ Error al actualizar el estado: " + err.message);
    }
  };

  const getTimelineStyle = (estado: string) => {
    switch (estado) {
      case 'Completado': return { dot: 'bg-emerald-500 border-emerald-200', card: 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50', icon: '✅', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'Actual': return { dot: 'bg-rose-600 border-rose-200 shadow-[0_0_15px_rgba(225,29,72,0.5)] animate-pulse', card: 'border-rose-300 bg-white shadow-xl shadow-rose-900/5', icon: '🔥', text: 'text-rose-600', badge: 'bg-rose-50 text-rose-600 border-rose-200' };
      default: return { dot: 'bg-slate-300 border-slate-100', card: 'border-slate-200 bg-slate-50 opacity-70 hover:opacity-100', icon: '⏳', text: 'text-slate-500', badge: 'bg-slate-100 text-slate-500 border-slate-200' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20 selection:bg-rose-100 relative overflow-hidden">
      
      {/* Fondos Decorativos */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-400/10 rounded-full blur-[120px] pointer-events-none -mr-40 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-400/10 rounded-full blur-[100px] pointer-events-none -ml-20 mb-20"></div>

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 mt-10 space-y-8 relative z-10">
        
        {/* CABECERA NEGOCIACIÓN */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 p-8 md:p-10 relative overflow-hidden">
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
             <div className="flex-1">
               <span className="bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4 inline-block shadow-sm">Proceso Legal Activo</span>
               <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight mb-2">
                 {infoGeneral?.titulo || 'Negociación Colectiva'}
               </h2>
               <p className="text-slate-500 max-w-2xl text-sm font-medium leading-relaxed">
                 {infoGeneral?.descripcion || 'Sigue en tiempo real el avance de nuestro pliego de peticiones.'}
               </p>
             </div>
             
             <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0 flex-wrap justify-end">
               {infoGeneral?.petitorio_url && (
                 <a href={infoGeneral.petitorio_url} target="_blank" rel="noopener noreferrer" className="bg-slate-900 hover:bg-rose-600 text-white text-[11px] font-black uppercase tracking-widest py-3 px-6 rounded-xl transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2">
                   <span>📄</span> Descargar Petitorio
                 </a>
               )}
               {isAdmin && (
                 <>
                   <button onClick={() => setShowModalInfo(true)} className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-[11px] font-black uppercase tracking-widest py-3 px-5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
                     ⚙️ Editar Cabecera
                   </button>
                   <button onClick={handleArchivarProceso} className="bg-white hover:bg-slate-50 text-amber-600 border border-amber-200 text-[11px] font-black uppercase tracking-widest py-3 px-5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
                     📦 Archivar Proceso
                   </button>
                 </>
               )}
             </div>
           </div>
        </motion.div>

        {/* CRONOGRAMA LEGAL */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100/80 p-8 sm:p-10 relative overflow-hidden">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <span className="p-2 bg-rose-50 rounded-xl text-rose-600 border border-rose-100 shadow-sm text-lg">⏱️</span> 
              Cronograma Legal
            </h3>
            {isAdmin && (
              <button onClick={openCrearHito} className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl shadow-md transition-all">
                + Agregar Hito
              </button>
            )}
          </div>

          {hitos.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3 block opacity-30">🗓️</span>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">El cronograma aún no tiene hitos registrados.</p>
            </div>
          ) : (
            <div className="relative border-l-4 border-slate-100 ml-4 sm:ml-8 space-y-10 pb-4">
              {hitos.map((hito) => {
                const styles = getTimelineStyle(hito.estado);
                return (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={hito.id} className="relative ml-8 sm:ml-12 group">
                    {/* Punto del Timeline */}
                    <span className={`absolute -left-[45px] sm:-left-[63px] flex h-6 w-6 items-center justify-center rounded-full border-4 ring-8 ring-white ${styles.dot}`}></span>
                    
                    {/* Tarjeta del Hito */}
                    <div className={`p-6 md:p-8 rounded-3xl border transition-all duration-300 ${styles.card}`}>
                      
                      {/* Controles Admin Absolutos */}
                      {isAdmin && (
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <button onClick={() => openEditarHito(hito)} className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 shadow-sm transition-colors text-xs">✏️</button>
                          <button onClick={() => handleEliminarHito(hito.id)} className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-600 shadow-sm transition-colors text-xs">🗑️</button>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pr-16 relative z-10">
                        <h4 className={`text-xl font-black flex items-center gap-3 ${styles.text}`}>
                          <span className="text-2xl">{styles.icon}</span> {hito.titulo}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          <span className="text-[11px] font-black text-slate-500 bg-white border border-slate-100 px-3 py-1.5 rounded-lg shadow-sm">
                            🗓️ {new Date(hito.fecha).toLocaleDateString('es-CL', { timeZone: 'UTC' })}
                          </span>
                          
                          {/* CONTROL DE ESTADO EN VIVO PARA ADMIN */}
                          {isAdmin ? (
                            <select 
                              value={hito.estado}
                              onChange={(e) => handleCambiarEstadoHitoVivo(hito.id, e.target.value)}
                              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border outline-none cursor-pointer hover:opacity-80 transition-opacity appearance-none text-center ${styles.badge}`}
                            >
                              <option value="Pendiente" className="text-slate-500 font-bold bg-white">Pendiente</option>
                              <option value="Actual" className="text-rose-600 font-bold bg-white">Actual</option>
                              <option value="Completado" className="text-emerald-700 font-bold bg-white">Completado</option>
                            </select>
                          ) : (
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${styles.badge}`}>
                              {hito.estado}
                            </span>
                          )}

                        </div>
                      </div>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed pl-10">
                        {hito.descripcion}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {/* MODAL ADMIN: EDITAR INFO GENERAL */}
        {showModalInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col border border-slate-100 max-h-[90vh]">
               <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center rounded-t-[2rem] shrink-0">
                 <h3 className="text-xl font-black text-slate-800">Ajustes de Negociación</h3>
                 <button onClick={() => setShowModalInfo(false)} className="text-slate-400 hover:text-slate-800 text-xl font-bold bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center">✕</button>
               </div>
               <div className="overflow-y-auto p-6">
                 <form onSubmit={handleGuardarInfo} className="space-y-5">
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título Principal</label>
                     <input type="text" required value={formInfo.titulo} onChange={e => setFormInfo({...formInfo, titulo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción General</label>
                     <textarea rows={3} required value={formInfo.descripcion} onChange={e => setFormInfo({...formInfo, descripcion: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm resize-none"></textarea>
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Documento de Petitorio (.pdf)</label>
                      <input type="file" accept=".pdf" onChange={(e) => setArchivoPetitorio(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl p-1.5 shadow-sm" />
                      {infoGeneral?.petitorio_url && !archivoPetitorio && <p className="text-[10px] text-emerald-500 font-bold mt-2">✓ Ya existe un documento cargado. Sube uno nuevo solo si deseas reemplazarlo.</p>}
                   </div>
                   <button type="submit" disabled={guardando} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-lg transition-all text-sm uppercase tracking-widest mt-4">
                     {guardando ? 'Guardando...' : 'Guardar Ajustes'}
                   </button>
                 </form>
               </div>
             </div>
          </motion.div>
        )}

        {/* MODAL ADMIN: CREAR / EDITAR HITO */}
        {showModalHito && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl flex flex-col border border-slate-100 max-h-[90vh]">
               <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center rounded-t-[2rem] shrink-0">
                 <h3 className="text-xl font-black text-slate-800">{isEditingHito ? 'Editar Hito' : 'Nuevo Hito'}</h3>
                 <button onClick={() => setShowModalHito(false)} className="text-slate-400 hover:text-slate-800 text-xl font-bold bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center">✕</button>
               </div>
               <div className="overflow-y-auto p-6">
                 <form onSubmit={handleGuardarHito} className="space-y-5">
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título del Evento</label>
                     <input type="text" required value={formHito.titulo} onChange={e => setFormHito({...formHito, titulo: e.target.value})} placeholder="Ej: Respuesta del Empleador" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha Estimada o Real</label>
                     <input type="date" required value={formHito.fecha} onChange={e => setFormHito({...formHito, fecha: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado</label>
                     <select value={formHito.estado} onChange={e => setFormHito({...formHito, estado: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm">
                       <option value="Pendiente">⏳ Pendiente</option>
                       <option value="Actual">🔥 Actual / En Proceso</option>
                       <option value="Completado">✅ Completado</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción Detallada</label>
                     <textarea rows={3} required value={formHito.descripcion} onChange={e => setFormHito({...formHito, descripcion: e.target.value})} placeholder="Detalles de este paso legal..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm resize-none"></textarea>
                   </div>
                   
                   <button type="submit" disabled={guardando} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-4 rounded-xl shadow-lg shadow-rose-500/30 transition-all text-sm uppercase tracking-widest mt-4">
                     {guardando ? 'Guardando...' : 'Guardar Hito'}
                   </button>
                 </form>
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}