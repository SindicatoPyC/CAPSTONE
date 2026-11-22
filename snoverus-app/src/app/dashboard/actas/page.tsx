'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { notificar } from '../../lib/notificar';

export default function ActasPage() {
  const [actas, setActas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [borrandoId, setBorrandoId] = useState<number | null>(null);

  // Estados del Modal Admin (CRUD)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: '',
    tipo_asamblea: 'Ordinaria',
    fecha_reunion: '',
    resumen_acuerdos: ''
  });
  const [archivoActa, setArchivoActa] = useState<File | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    const supabase = createClient();
    
    // 1. Verificar Rol
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const rolUsuario = String(profile?.role || '').toLowerCase();
      setIsAdmin(rolUsuario === 'admin' || rolUsuario === 'administrador' || rolUsuario === 'directiva');
    }

    // 2. Traer Actas
    const { data, error } = await supabase
      .from('libro_actas')
      .select('*')
      .order('fecha_reunion', { ascending: false });

    if (!error && data) {
      setActas(data);
    }
    setLoading(false);
  }

  // --- FUNCIONES ADMIN (CRUD) ---
  const openCreateModal = () => {
    setFormData({ titulo: '', tipo_asamblea: 'Ordinaria', fecha_reunion: '', resumen_acuerdos: '' });
    setArchivoActa(null);
    setIsEditing(false);
    setShowModal(true);
  };

  const openEditModal = (acta: any) => {
    setFormData({
      titulo: acta.titulo,
      tipo_asamblea: acta.tipo_asamblea,
      fecha_reunion: acta.fecha_reunion || '',
      resumen_acuerdos: acta.resumen_acuerdos
    });
    setArchivoActa(null); // Solo requiere archivo si desea reemplazarlo
    setCurrentId(acta.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleGuardarActa = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const supabase = createClient();
      let publicUrl = null;

      // Si sube un archivo nuevo, lo guardamos en Storage
      if (archivoActa) {
        const fileExt = archivoActa.name.split('.').pop();
        const fileName = `${Date.now()}_acta.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('actas').upload(fileName, archivoActa);
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('actas').getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      } else if (!isEditing) {
        throw new Error("Debes adjuntar un documento (PDF o Word) para crear el acta.");
      }

      const datosGuardar: any = {
        titulo: formData.titulo,
        tipo_asamblea: formData.tipo_asamblea,
        fecha_reunion: formData.fecha_reunion,
        resumen_acuerdos: formData.resumen_acuerdos,
      };

      // Solo actualizamos la URL si se subió un nuevo archivo
      if (publicUrl) {
        datosGuardar.url_acta_pdf = publicUrl;
      }

      if (isEditing && currentId) {
        await supabase.from('libro_actas').update(datosGuardar).eq('id', currentId);
        notificar('✅ Acta actualizada exitosamente.');
      } else {
        await supabase.from('libro_actas').insert([datosGuardar]);
        notificar('✅ Nueva Acta publicada exitosamente.');
      }

      setShowModal(false);
      fetchInitialData();
    } catch (err: any) {
      notificar("❌ Error al guardar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarActa = async (id: number) => {
    if (!window.confirm("⚠️ ¿Estás seguro de que deseas eliminar este documento oficial de forma permanente?")) return;
    
    setBorrandoId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('libro_actas').delete().eq('id', id);
      if (error) throw error;
      
      setActas(actas.filter(acta => acta.id !== id));
    } catch (err: any) {
      notificar("❌ Error al eliminar el acta: " + err.message);
    } finally {
      setBorrandoId(null);
    }
  };

  // --- UTILIDADES ---
  const getBadgeStyle = (tipo: string) => {
    switch (tipo) {
      case 'Extraordinaria': return 'bg-amber-100 text-amber-700 border-amber-200 shadow-amber-100';
      case 'Directorio': return 'bg-purple-100 text-purple-700 border-purple-200 shadow-purple-100';
      default: return 'bg-blue-100 text-blue-700 border-blue-200 shadow-blue-100'; // Ordinaria
    }
  };

  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return '';
    const partes = fechaStr.split('T')[0].split('-');
    if (partes.length === 3) {
      return `${partes[2]}-${partes[1]}-${partes[0]}`; // DD-MM-YYYY
    }
    return fechaStr;
  };

  const actasFiltradas = actas.filter(acta => 
    acta.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    acta.resumen_acuerdos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acta.tipo_asamblea?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20 selection:bg-indigo-100 relative overflow-hidden">
      
      {/* Fondos Decorativos */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none -mr-40 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-400/10 rounded-full blur-[100px] pointer-events-none -ml-20 mb-20"></div>

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-10 space-y-8 relative z-10">
        
        {/* CABECERA PREMIUM */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 p-8 md:p-10 relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
           <div className="relative z-10 flex-1">
             <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4 inline-block shadow-sm">Documentación Legal</span>
             <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight mb-2">Libro de Actas</h2>
             <p className="text-slate-500 max-w-xl text-sm font-medium leading-relaxed">
               Repositorio oficial y transparente de todas las actas de asambleas y reuniones de directorio.
             </p>
           </div>
           
           <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto shrink-0 relative z-10">
             {/* Buscador Inteligente */}
             <div className="w-full sm:w-72 relative">
               <input 
                 type="text" 
                 placeholder="Buscar documento..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all placeholder:text-slate-400 placeholder:font-medium"
               />
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
             </div>

             {/* Botón Admin Crear Acta */}
             {isAdmin && (
               <button onClick={openCreateModal} className="w-full sm:w-auto shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs px-6 py-4 rounded-2xl shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-1">
                 + Subir Acta
               </button>
             )}
           </div>
        </motion.div>

        {/* LISTA DE ACTAS */}
        <div className="space-y-6">
          <h3 className="text-xl font-black text-slate-800 ml-2 flex items-center gap-3">
            <span className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">📜</span> 
            Registro Histórico Oficial
            <span className="bg-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded-full ml-2">{actasFiltradas.length}</span>
          </h3>

          {actas.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-16 text-center">
              <span className="text-6xl mb-6 block opacity-80">🗄️</span>
              <h3 className="text-xl font-black text-slate-700 mb-2">Repositorio Vacío</h3>
              <p className="text-slate-400 font-medium text-sm">No hay documentos registrados en el sistema.</p>
            </motion.div>
          ) : actasFiltradas.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-12 text-center">
              <p className="text-slate-500 font-bold">No se encontraron actas que coincidan con "{searchTerm}".</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              <AnimatePresence>
                {actasFiltradas.map((acta) => (
                  <motion.div 
                    key={acta.id} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6 md:p-8 border border-slate-100 bg-white rounded-[2rem] shadow-lg shadow-slate-200/30 hover:shadow-xl hover:shadow-indigo-500/10 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group"
                  >
                    <div className="space-y-3 max-w-3xl flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border shadow-sm ${getBadgeStyle(acta.tipo_asamblea)}`}>
                          {acta.tipo_asamblea}
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          🗓️ {formatearFecha(acta.fecha_reunion)}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-800 text-xl leading-snug group-hover:text-indigo-600 transition-colors">{acta.titulo}</h4>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">{acta.resumen_acuerdos}</p>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto shrink-0">
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => openEditModal(acta)}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-black uppercase tracking-widest py-3.5 px-5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            ✏️ Editar
                          </button>
                          <button 
                            onClick={() => handleEliminarActa(acta.id)}
                            disabled={borrandoId === acta.id}
                            className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border border-red-100 text-xs font-black uppercase tracking-widest py-3.5 px-5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            {borrandoId === acta.id ? 'Borrando...' : '🗑️ Eliminar'}
                          </button>
                        </>
                      )}
                      <a 
                        href={acta.url_acta_pdf} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-slate-900 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                      >
                        📥 Descargar Doc
                      </a>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {/* MODAL ADMIN: CREAR / EDITAR ACTA */}
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col border border-slate-100 max-h-[90vh]">
               <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center rounded-t-[2rem] shrink-0">
                 <h3 className="text-xl font-black text-slate-800">{isEditing ? 'Editar Documento Oficial' : 'Subir Nueva Acta'}</h3>
                 <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-800 text-xl font-bold bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center">✕</button>
               </div>
               <div className="overflow-y-auto p-6">
                 <form onSubmit={handleGuardarActa} className="space-y-5">
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título del Acta</label>
                     <input type="text" required value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} placeholder="Ej: Acta Asamblea Extraordinaria N°5" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Asamblea</label>
                       <select value={formData.tipo_asamblea} onChange={e => setFormData({...formData, tipo_asamblea: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm">
                         <option value="Ordinaria">Ordinaria</option>
                         <option value="Extraordinaria">Extraordinaria</option>
                         <option value="Directorio">Directorio</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha de Reunión</label>
                       <input type="date" required value={formData.fecha_reunion} onChange={e => setFormData({...formData, fecha_reunion: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                     </div>
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resumen Corto de Acuerdos</label>
                     <textarea rows={3} required value={formData.resumen_acuerdos} onChange={e => setFormData({...formData, resumen_acuerdos: e.target.value})} placeholder="Escribe un resumen de los temas tratados..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm resize-none"></textarea>
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        {isEditing ? 'Archivo (Opcional, si desea reemplazar)' : 'Archivo Documento Oficial (.pdf, .doc, .docx)'}
                      </label>
                      <input 
                        type="file" 
                        accept=".pdf, .doc, .docx, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                        onChange={(e) => setArchivoActa(e.target.files ? e.target.files[0] : null)} 
                        required={!isEditing}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl p-1.5 shadow-sm" 
                      />
                   </div>
                   <button type="submit" disabled={guardando} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-500/30 transition-all text-sm uppercase tracking-widest mt-4">
                     {guardando ? 'Guardando Registro...' : 'Guardar y Publicar Acta'}
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