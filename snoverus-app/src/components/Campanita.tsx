"use client";
import { useState, useEffect } from "react";
import { createClient } from "../app/lib/supabase";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function Campanita() {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sindicatoUsuario, setSindicatoUsuario] = useState<string>("");
  
  // Paginación interna del menú flotante
  const [paginaActual, setPaginaActual] = useState(1);
  const porPagina = 3; // Cuántas notificaciones mostrar por "página" en el dropdown

  const supabase = createClient();

  useEffect(() => {
    let canalActivo: any = null;

    const initCampanita = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        
        // 1. Obtener el sindicato del usuario actual
        const { data: profile } = await supabase
          .from('profiles')
          .select('sindicato')
          .eq('id', user.id)
          .single();

        const nombreSindicato = profile?.sindicato || '';
        setSindicatoUsuario(nombreSindicato);

        // 2. Cargar notificaciones
        cargarNotificaciones(user.id, nombreSindicato);

        // 3. Tiempo real
        const channelName = `notificaciones_${user.id}_${Date.now()}`;
        canalActivo = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'notificaciones',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              setNotificaciones((prev) => [payload.new, ...prev]);
            }
          )
          .subscribe();
      }
    };

    initCampanita();

    return () => {
      if (canalActivo) supabase.removeChannel(canalActivo);
    };
  }, []);

  const cargarNotificaciones = async (uid: string, sindicato: string) => {
    try {
      let query = supabase
        .from('notificaciones') 
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (sindicato) {
        query = query.eq('sindicato', sindicato);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) setNotificaciones(data);
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
    }
  };

  const toggleMenu = async () => {
    const nuevoEstado = !mostrarMenu;
    setMostrarMenu(nuevoEstado);
    
    if (nuevoEstado && userId) {
      try {
        await supabase
          .from('notificaciones')
          .update({ leido: true }) 
          .eq('user_id', userId)
          .eq('leido', false);
        
        setNotificaciones(notificaciones.map(n => ({ ...n, leido: true })));
      } catch (err) {
        console.error("Error al actualizar:", err);
      }
    }
  };

  // Lógica de Paginación para el menú flotante
  const totalPaginas = Math.ceil(notificaciones.length / porPagina) || 1;
  const indiceUltimo = paginaActual * porPagina;
  const indicePrimero = indiceUltimo - porPagina;
  const notificacionesPaginadas = notificaciones.slice(indicePrimero, indiceUltimo);

  const noLeidasCount = notificaciones.filter(n => !n.leido).length;

  return (
    <div className="relative">
      {/* Botón de la Campanita */}
      <button 
        onClick={toggleMenu}
        className="relative p-2.5 text-slate-300 hover:text-white transition-all rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 focus:outline-none cursor-pointer shadow-sm group flex items-center justify-center"
      >
        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {noLeidasCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-lg shadow-red-500/50 animate-pulse">
            {noLeidasCount}
          </span>
        )}
      </button>

      {/* Menú Flotante con Paginador Interno */}
      <AnimatePresence>
        {mostrarMenu && (
          <motion.div 
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl shadow-slate-950/80 overflow-hidden z-50 flex flex-col backdrop-blur-xl"
          >
            {/* Cabecera */}
            <div className="p-5 bg-slate-950/80 border-b border-slate-800/80 flex justify-between items-center">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-200 block">Centro de Alertas</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{sindicatoUsuario || 'Sindicato General'}</span>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black px-2.5 py-1 rounded-full">
                {notificaciones.length} Totales
              </span>
            </div>

            {/* Listado con Paginación Interna */}
            <div className="p-3 space-y-2 min-h-[220px]">
              {notificacionesPaginadas.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="text-3xl opacity-30 block mb-2">📭</span>
                  <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No hay avisos recientes.</p>
                </div>
              ) : (
                notificacionesPaginadas.map((n) => (
                  <div key={n.id} className="p-3 rounded-2xl bg-slate-800/30 border border-slate-800/60 hover:bg-slate-800/60 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        {n.tipo || 'Aviso'}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-white tracking-tight mb-1">{n.titulo}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium line-clamp-2">{n.mensaje}</p>
                  </div>
                ))
              )}
            </div>

            {/* Controles del Paginador (Anterior / Siguiente) */}
            {totalPaginas > 1 && (
              <div className="px-5 py-2.5 bg-slate-950/40 border-t border-slate-800/60 flex justify-between items-center text-xs">
                <button 
                  onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
                  disabled={paginaActual === 1}
                  className="px-3 py-1 bg-slate-800 text-slate-300 font-bold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition"
                >
                  ← Anterior
                </button>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Página {paginaActual} de {totalPaginas}
                </span>
                <button 
                  onClick={() => setPaginaActual((p) => Math.min(p + 1, totalPaginas))}
                  disabled={paginaActual === totalPaginas}
                  className="px-3 py-1 bg-slate-800 text-slate-300 font-bold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition"
                >
                  Siguiente →
                </button>
              </div>
            )}

            {/* Pie con Redirección a la Vista Completa */}
            <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 text-center">
              <Link 
                href="/dashboard/notificaciones" 
                onClick={() => setMostrarMenu(false)}
                className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-colors block py-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/20 shadow-sm"
              >
                Abrir centro completo de notificaciones →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}