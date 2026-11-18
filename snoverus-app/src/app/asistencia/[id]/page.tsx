'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import { motion } from 'framer-motion';

export default function RegistrarAsistenciaPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [estado, setEstado] = useState<'cargando' | 'exito' | 'error'>('cargando');
  const [mensaje, setMensaje] = useState('Validando tu asistencia en el quórum en vivo...');
  const [timestamp, setTimestamp] = useState<string>('');

  useEffect(() => {
    async function registrar() {
      const supabase = createClient();
      
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();

      if (sessionError || !user) {
        setEstado('error');
        setMensaje('Debes iniciar sesión en la plataforma primero para registrar tu asistencia.');
        setTimeout(() => {
          router.push(`/?redirect=/asistencia/${params.id}`);
        }, 3000);
        return;
      }

      // Consulta blindada sin .single() para evitar errores 406
      const { data: profiles } = await supabase.from('profiles').select('sindicato_id, rut').eq('id', user.id).limit(1);
      const profile = profiles && profiles.length > 0 ? profiles[0] : null;

      const { data: asambleas } = await supabase.from('asambleas_votaciones').select('sindicato_id, estado, titulo').eq('id', params.id).limit(1);
      const asamblea = asambleas && asambleas.length > 0 ? asambleas[0] : null;

      if (!asamblea || !profile || asamblea.sindicato_id !== profile.sindicato_id) {
        setEstado('error');
        setMensaje('Esta asamblea no pertenece a tu organización o no fue encontrada.');
        return;
      }

      if (asamblea.estado !== 'Abierta') {
        setEstado('error');
        setMensaje('El registro para esta asamblea ya se encuentra cerrado por la directiva.');
        return;
      }

      const horaActual = new Date().toISOString();

      // Registro oficial en Supabase con el sindicato_id incluido
      const { error: insertError } = await supabase.from('asistencia_asambleas').insert([{
        asamblea_titulo: asamblea.titulo,
        usuario_rut: profile.rut,
        user_id: user.id,
        estado: 'Presente',
        fecha_asistencia: horaActual,
        sindicato_id: asamblea.sindicato_id
      }]);

      setTimestamp(new Date(horaActual).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      if (insertError) {
        if (insertError.code === '23505' || insertError.message.includes('duplicate')) {
          setEstado('exito');
          setMensaje('Tu asistencia ya se encontraba registrada en el quórum de esta sesión.');
        } else {
          setEstado('error');
          setMensaje('Ocurrió un error al procesar tu registro. Intenta escanear de nuevo.');
        }
      } else {
        setEstado('exito');
        setMensaje(`¡Presencia confirmada con éxito para: ${asamblea.titulo}!`);
      }
    }
    
    registrar();
  }, [params.id, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-6 font-sans text-slate-100">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-white/10 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 sm:p-10 text-center border border-white/15 relative z-10"
      >
        {estado === 'cargando' && (
          <div className="py-8 space-y-6">
            <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
            <h3 className="text-xl font-black tracking-tight text-white">Verificando Credenciales</h3>
            <p className="text-slate-300 text-sm font-medium leading-relaxed">{mensaje}</p>
          </div>
        )}
        
        {estado === 'exito' && (
          <div className="space-y-6 py-4 flex flex-col items-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl mb-2 drop-shadow-[0_10px_15px_rgba(16,185,129,0.4)]">
              ✅
            </motion.div>
            <h2 className="text-3xl font-black text-white tracking-tight">¡Estás Presente!</h2>
            <p className="text-slate-300 text-sm font-medium leading-relaxed">{mensaje}</p>
            
            {timestamp && (
              <div className="bg-white/5 rounded-xl px-5 py-2.5 border border-white/10 text-xs font-mono font-bold text-emerald-400 shadow-inner w-fit">
                Hora de registro: {timestamp}
              </div>
            )}
            
            <div className="pt-4 w-full">
              <button 
                onClick={() => router.push('/asamblea')} 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl shadow-[0_10px_25px_rgba(37,99,235,0.4)] transition-all transform hover:-translate-y-0.5 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                <span>📹</span> Unirse a la Videollamada Oficial
              </button>
            </div>
          </div>
        )}

        {estado === 'error' && (
          <div className="space-y-6 py-4">
            <div className="text-6xl mb-2 drop-shadow-[0_10px_15px_rgba(239,68,68,0.4)]">⚠️</div>
            <h2 className="text-3xl font-black text-white tracking-tight">Acceso Restringido</h2>
            <p className="text-rose-300 font-semibold text-sm leading-relaxed">{mensaje}</p>
            
            <button 
              onClick={() => router.push(`/?redirect=/asistencia/${params.id}`)} 
              className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs border border-white/10"
            >
              Ir al Panel de Ingreso Seguro
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}