'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { notificar } from '../../lib/notificar';

export default function EncuestasPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [encuestas, setEncuestas] = useState<any[]>([]);
  const [misVotos, setMisVotos] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  // Estados Admin (Modales)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ titulo: '', categoria: 'Asamblea', opcion_a: '', opcion_b: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (currentUser) {
      setUser(currentUser);
      
      // 1. Verificar Rol
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
      const rolUsuario = String(profile?.role || '').toLowerCase();
      setIsAdmin(rolUsuario === 'admin' || rolUsuario === 'administrador' || rolUsuario === 'directiva');

      // 2. Traer Encuestas
      const { data: encuestasData } = await supabase.from('encuestas_clima').select('*').order('created_at', { ascending: false });
      if (encuestasData) setEncuestas(encuestasData);

      // 3. Traer mis votos (para saber qué voté y permitir anular)
      const { data: misVotosData } = await supabase.from('votos_encuestas').select('encuesta_id, opcion').eq('user_id', currentUser.id);
      if (misVotosData) {
        const votosMap: Record<number, string> = {};
        misVotosData.forEach(v => { votosMap[v.encuesta_id] = v.opcion; });
        setMisVotos(votosMap);
      }
    }
    setLoading(false);
  }

  // --- LÓGICA DEL SOCIO (VOTAR Y ANULAR) ---
  const handleVotar = async (encuestaId: number, opcionElegida: 'a' | 'b') => {
    if (misVotos[encuestaId]) return; // Ya votó
    
    const supabase = createClient();
    const encuesta = encuestas.find(e => e.id === encuestaId);
    if (!encuesta) return;

    // Actualización optimista
    const campo = opcionElegida === 'a' ? 'votos_a' : 'votos_b';
    setMisVotos({ ...misVotos, [encuestaId]: opcionElegida });
    setEncuestas(encuestas.map(e => e.id === encuestaId ? { ...e, [campo]: (e[campo] || 0) + 1 } : e));

    try {
      // Registrar voto en tabla auxiliar
      await supabase.from('votos_encuestas').insert([{ encuesta_id: encuestaId, user_id: user.id, opcion: opcionElegida }]);
      // Incrementar contador en encuesta
      await supabase.from('encuestas_clima').update({ [campo]: (encuesta[campo] || 0) + 1 }).eq('id', encuestaId);
    } catch (err) { console.error(err); }
  };

  const handleAnularVoto = async (encuestaId: number) => {
    const opcionPrevia = misVotos[encuestaId];
    if (!opcionPrevia) return;

    const supabase = createClient();
    const encuesta = encuestas.find(e => e.id === encuestaId);
    if (!encuesta) return;

    // Actualización optimista
    const campo = opcionPrevia === 'a' ? 'votos_a' : 'votos_b';
    const nuevosVotos = { ...misVotos };
    delete nuevosVotos[encuestaId];
    setMisVotos(nuevosVotos);
    setEncuestas(encuestas.map(e => e.id === encuestaId ? { ...e, [campo]: Math.max(0, (e[campo] || 0) - 1) } : e));

    try {
      // Eliminar registro auxiliar
      await supabase.from('votos_encuestas').delete().eq('encuesta_id', encuestaId).eq('user_id', user.id);
      // Restar contador en encuesta
      await supabase.from('encuestas_clima').update({ [campo]: Math.max(0, (encuesta[campo] || 0) - 1) }).eq('id', encuestaId);
    } catch (err) { console.error(err); }
  };

  // --- LÓGICA DEL ADMIN (CRUD) ---
  const handleGuardarEncuesta = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const supabase = createClient();

    try {
      if (isEditing && currentId) {
        await supabase.from('encuestas_clima').update({
          titulo: formData.titulo, categoria: formData.categoria, opcion_a: formData.opcion_a, opcion_b: formData.opcion_b
        }).eq('id', currentId);
      } else {
        await supabase.from('encuestas_clima').insert([{
          titulo: formData.titulo, categoria: formData.categoria, opcion_a: formData.opcion_a, opcion_b: formData.opcion_b, votos_a: 0, votos_b: 0
        }]);
      }
      setShowModal(false);
      fetchInitialData();
    } catch (err) { notificar('Error al guardar'); } finally { setGuardando(false); }
  };

  const handleEliminarEncuesta = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta encuesta permanentemente?')) return;
    const supabase = createClient();
    await supabase.from('encuestas_clima').delete().eq('id', id);
    setEncuestas(encuestas.filter(e => e.id !== id));
  };

  const openEditModal = (encuesta: any) => {
    setFormData({ titulo: encuesta.titulo, categoria: encuesta.categoria, opcion_a: encuesta.opcion_a, opcion_b: encuesta.opcion_b });
    setCurrentId(encuesta.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setFormData({ titulo: '', categoria: 'Asamblea', opcion_a: '', opcion_b: '' });
    setIsEditing(false);
    setShowModal(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20 selection:bg-indigo-100">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-8 relative z-10">
        
        {/* CABECERA 2.0 */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div className="relative z-10">
             <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4 inline-block shadow-sm">Participación Activa</span>
             <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight mb-2">Votaciones y Clima</h2>
             <p className="text-slate-500 max-w-xl text-sm font-medium">Tu voz define el rumbo del sindicato. Participa en las asambleas y define prioridades.</p>
           </div>
           {isAdmin && (
             <button onClick={openCreateModal} className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs px-8 py-4 rounded-2xl shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-1">
               + Crear Votación
             </button>
           )}
        </motion.div>

        {encuestas.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-16 text-center">
             <span className="text-6xl mb-6 block opacity-80">🗳️</span>
             <h3 className="text-xl font-black text-slate-700 mb-2">Bandeja Vacía</h3>
             <p className="text-slate-400 font-medium text-sm">No hay asambleas o votaciones activas en este momento.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {encuestas.map((item) => {
              const votosA = item.votos_a || 0;
              const votosB = item.votos_b || 0;
              const total = votosA + votosB;
              const pctA = total === 0 ? 0 : Math.round((votosA / total) * 100);
              const pctB = total === 0 ? 0 : Math.round((votosB / total) * 100);
              const miVoto = misVotos[item.id];

              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-100 shadow-xl shadow-slate-200/30 relative overflow-hidden transition-all hover:shadow-2xl hover:shadow-slate-200/50">
                  
                  {/* ADMIN CONTROLS EN LA TARJETA */}
                  {isAdmin && (
                    <div className="absolute top-6 right-6 flex items-center gap-2">
                      <button onClick={() => openEditModal(item)} className="p-2.5 bg-slate-50 text-blue-600 hover:bg-blue-500 hover:text-white rounded-xl transition-colors font-bold text-xs shadow-sm">Editar</button>
                      <button onClick={() => handleEliminarEncuesta(item.id)} className="p-2.5 bg-slate-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors font-bold text-xs shadow-sm">Borrar</button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pr-24">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-inner">
                        {item.categoria}
                      </span>
                      <h3 className="text-2xl font-black text-slate-800 mt-4 leading-tight">{item.titulo}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* OPCIÓN A */}
                    <button 
                      onClick={() => !miVoto && handleVotar(item.id, 'a')}
                      disabled={!!miVoto}
                      className={`relative p-5 rounded-2xl border-2 transition-all text-left overflow-hidden group 
                        ${miVoto === 'a' ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/20' : 
                          miVoto ? 'border-slate-100 bg-slate-50 opacity-50' : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md cursor-pointer'}`}
                    >
                      <div className="flex justify-between items-center font-black text-slate-800 mb-4 relative z-10">
                        <span className={`text-base ${miVoto === 'a' && 'text-emerald-700'}`}>{item.opcion_a}</span>
                        <span className={`text-lg ${miVoto === 'a' ? 'text-emerald-600' : 'text-slate-400'}`}>{pctA}%</span>
                      </div>
                      <div className="w-full bg-slate-200/50 rounded-full h-2.5 relative z-10 overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full transition-all duration-1000 ${miVoto === 'a' ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pctA}%` }}></div>
                      </div>
                      {miVoto === 'a' && <div className="absolute top-4 right-4 text-emerald-500 text-xl">✅</div>}
                    </button>

                    {/* OPCIÓN B */}
                    <button 
                      onClick={() => !miVoto && handleVotar(item.id, 'b')}
                      disabled={!!miVoto}
                      className={`relative p-5 rounded-2xl border-2 transition-all text-left overflow-hidden group 
                        ${miVoto === 'b' ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/20' : 
                          miVoto ? 'border-slate-100 bg-slate-50 opacity-50' : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md cursor-pointer'}`}
                    >
                      <div className="flex justify-between items-center font-black text-slate-800 mb-4 relative z-10">
                        <span className={`text-base ${miVoto === 'b' && 'text-emerald-700'}`}>{item.opcion_b}</span>
                        <span className={`text-lg ${miVoto === 'b' ? 'text-emerald-600' : 'text-slate-400'}`}>{pctB}%</span>
                      </div>
                      <div className="w-full bg-slate-200/50 rounded-full h-2.5 relative z-10 overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full transition-all duration-1000 ${miVoto === 'b' ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pctB}%` }}></div>
                      </div>
                      {miVoto === 'b' && <div className="absolute top-4 right-4 text-emerald-500 text-xl">✅</div>}
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      👥 {total} Votos Totales
                    </span>
                    {miVoto && !isAdmin && (
                       <button onClick={() => handleAnularVoto(item.id)} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-white bg-red-50 hover:bg-red-500 px-4 py-2 rounded-xl transition-colors shadow-sm">
                         Anular mi Voto
                       </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <AnimatePresence>
        {/* MODAL ADMIN: CREAR / EDITAR ENCUESTA */}
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col border border-slate-100">
               <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center rounded-t-[2rem]">
                 <h3 className="text-xl font-black text-slate-800">{isEditing ? 'Editar Votación' : 'Crear Nueva Votación'}</h3>
                 <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-800 text-xl font-bold bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center">✕</button>
               </div>
               <div className="p-6">
                 <form onSubmit={handleGuardarEncuesta} className="space-y-5">
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Asunto / Materia a Votar</label>
                     <input type="text" required value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} placeholder="Ej: Aprobación de Presupuesto 2026" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoría</label>
                     <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm">
                       <option value="Asamblea">Asamblea Ordinaria</option>
                       <option value="Extraordinaria">Asamblea Extraordinaria</option>
                       <option value="Beneficios">Elección de Beneficios</option>
                       <option value="Directiva">Consulta Directiva</option>
                     </select>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Opción A</label>
                       <input type="text" required value={formData.opcion_a} onChange={e => setFormData({...formData, opcion_a: e.target.value})} placeholder="Ej: A Favor" className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Opción B</label>
                       <input type="text" required value={formData.opcion_b} onChange={e => setFormData({...formData, opcion_b: e.target.value})} placeholder="Ej: En Contra" className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                     </div>
                   </div>
                   <button type="submit" disabled={guardando} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-500/30 transition-all text-sm uppercase tracking-widest mt-4">
                     {guardando ? 'Guardando Votación...' : 'Publicar Votación'}
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