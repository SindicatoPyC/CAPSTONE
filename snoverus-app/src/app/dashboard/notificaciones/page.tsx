'use client';
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase"; 
import { motion } from "framer-motion";
import Link from "next/link";

export default function VistaNotificacionesSindicato() {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [sindicatoActual, setSindicatoActual] = useState<string>("Cargando...");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    cargarDatosSindicatoYAlertas();
  }, []);

  async function cargarDatosSindicatoYAlertas() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // 1. Obtener el perfil del usuario para saber su Sindicato / RUT
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        const nombreSindicato = profile.sindicato || 'Sindicato General';
        setSindicatoActual(nombreSindicato);

        // 2. Cargar las notificaciones EXCLUSIVAS de este sindicato (Independencia total)
        const { data: notifs, error } = await supabase
          .from('notificaciones')
          .select('*')
          .eq('sindicato', nombreSindicato) // Filtro multi-tenant estricto
          .order('created_at', { ascending: false });

        if (notifs) setNotificaciones(notifs);
      }
    }
    setLoading(false);
  }

  const marcarTodasComoLeidas = async () => {
    try {
      await supabase
        .from('notificaciones')
        .update({ leido: true })
        .eq('sindicato', sindicatoActual);

      setNotificaciones(notificaciones.map(n => ({ ...n, leido: true })));
    } catch (err) {
      console.error("Error al actualizar:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-6 sm:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Cabecera de la Vista 2.0 */}
        <motion.div 
          initial={{ opacity: 0, y: -15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-[2.5rem] p-8 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
        >
          <div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-[0.25em] px-3.5 py-1.5 rounded-full mb-3 inline-block">
              Panel Independiente
            </span>
            <h1 className="text-3xl font-black tracking-tight text-white">Centro de Notificaciones</h1>
            <p className="text-slate-400 text-xs font-medium mt-1">
              Canal de avisos exclusivo para: <span className="text-emerald-400 font-bold">{sindicatoActual}</span>
            </p>
          </div>

          <button 
            onClick={marcarTodasComoLeidas}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl transition-all shadow-sm"
          >
            Marcar todo leído ✓
          </button>
        </motion.div>

        {/* Listado de Datos de Salida (Notificaciones Independientes) */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20 text-xs font-black text-slate-500 uppercase tracking-widest">
              Sincronizando datos del sindicato...
            </div>
          ) : notificaciones.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="bg-slate-900/40 border border-slate-800/60 rounded-[2rem] p-16 text-center"
            >
              <span className="text-5xl opacity-30 block mb-4">📭</span>
              <h3 className="text-slate-300 font-black text-sm uppercase tracking-widest mb-1">Sin avisos vigentes</h3>
              <p className="text-slate-500 text-xs">No hay registros de notificaciones emitidos para este sindicato.</p>
            </motion.div>
          ) : (
            notificaciones.map((n, index) => (
              <motion.div 
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-6 rounded-[2rem] border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${!n.leido ? 'bg-emerald-950/20 border-emerald-500/30 shadow-lg shadow-emerald-950/20' : 'bg-slate-900/60 border-slate-800/80'}`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-slate-800 text-slate-300 px-3 py-1 rounded-lg">
                      {n.tipo || 'Informativo'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      {new Date(n.created_at).toLocaleDateString()} - {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white tracking-tight">{n.titulo}</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">{n.mensaje}</p>
                </div>

                {n.enlace && (
                  <Link 
                    href={n.enlace}
                    className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-md shadow-emerald-500/20"
                  >
                    Ver Detalle →
                  </Link>
                )}
              </motion.div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}