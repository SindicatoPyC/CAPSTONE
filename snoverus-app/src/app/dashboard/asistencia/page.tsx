'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase';
import { Scanner } from '@yudiel/react-qr-scanner';
import Link from 'next/link';

export default function AsistenciaPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sindicatoId, setSindicatoId] = useState<number | null>(null);
  
  // Auditoría: Quién opera el escáner
  const [operadorNombre, setOperadorNombre] = useState('Presidente');

  const [tituloAsamblea, setTituloAsamblea] = useState('Cargando asamblea...');
  const [escaneando, setEscaneando] = useState(false);
  const [ultimoEscaneado, setUltimoEscaneado] = useState<string | null>(null);
  
  const [mensajeStatus, setMensajeStatus] = useState<{texto: string, subtexto?: string, tipo: 'success'|'error'|'info'|'exit'} | null>(null);

  useEffect(() => {
    setIsMounted(true);
    verificarRolYAsamblea();
  }, []);

  const verificarRolYAsamblea = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name, role, sindicato_id').eq('id', user.id).single();
      if (profile) {
        const rol = String(profile.role || '').toLowerCase();
        setIsAdmin(rol === 'admin' || rol === 'administrador' || rol === 'superadmin');
        setSindicatoId(profile.sindicato_id);
        setOperadorNombre(profile.full_name || 'Directiva');

        // 🚨 CONSULTA BLINDADA SIN .single() PARA EVITAR ERROR 406 🚨
        if (profile.sindicato_id) {
          const { data: asambleas, error } = await supabase
            .from('historial_asambleas')
            .select('titulo')
            .eq('sindicato_id', profile.sindicato_id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (error) {
             console.error("Error al buscar última asamblea:", error);
             setTituloAsamblea('Asamblea General Ordinaria (Default)');
          } else if (asambleas && asambleas.length > 0 && asambleas[0].titulo) {
            setTituloAsamblea(asambleas[0].titulo);
            console.log("Asamblea activa encontrada:", asambleas[0].titulo);
          } else {
            setTituloAsamblea('Asamblea General Ordinaria (Default)');
          }
        }
      }
    }
  };

  const procesarQR = async (textoQR: string) => {
    if (ultimoEscaneado === textoQR) return; 
    setUltimoEscaneado(textoQR);
    setMensajeStatus({ texto: 'Procesando validación...', subtexto: 'Consultando base de datos', tipo: 'info' });

    try {
      let qrData;
      try {
          qrData = JSON.parse(textoQR);
      } catch (e) {
          throw new Error("Formato de QR no reconocido o dañado.");
      }

      if (!qrData.rut) throw new Error("El QR no contiene un RUT válido.");

      if (Number(qrData.sindicato_id) !== Number(sindicatoId)) {
        throw new Error(`Esta credencial pertenece a otra organización (Sindicato #${qrData.sindicato_id}).`);
      }

      const supabase = createClient();

      // Consulta de perfil blindada sin .single()
      const { data: perfiles } = await supabase
        .from('profiles')
        .select('full_name, role, email')
        .eq('rut', qrData.rut)
        .limit(1);

      const perfilSocio = perfiles && perfiles.length > 0 ? perfiles[0] : null;

      const nombreSocio = perfilSocio?.full_name || 'Socio Registrado';
      const emailSocio = perfilSocio?.email || 'Sin correo';
      const rolSocio = String(perfilSocio?.role === 'admin' || perfilSocio?.role === 'administrador' ? 'Directiva' : 'Socio').toUpperCase();

      // Buscamos si ya existe asistencia PARA ESTA ASAMBLEA EXACTA (Usando .maybeSingle() que es seguro)
      const { data: registroPrevio, error: fetchError } = await supabase
        .from('asistencia_asambleas')
        .select('*')
        .eq('sindicato_id', sindicatoId)
        .eq('usuario_rut', qrData.rut)
        .eq('asamblea_titulo', tituloAsamblea.trim())
        .maybeSingle();

      if (fetchError) throw new Error(`Error buscando registro: ${fetchError.message}`);

      if (registroPrevio) {
        if (registroPrevio.hora_salida) {
          setMensajeStatus({ texto: `⚠️ Ya registró su salida hoy`, subtexto: `${nombreSocio} (${qrData.rut})`, tipo: 'error' });
        } else {
          // Marcar SALIDA
          const { error: updateError } = await supabase.from('asistencia_asambleas').update({ hora_salida: new Date().toISOString() }).eq('id', registroPrevio.id);
          if (updateError) throw new Error(`Fallo Update BD: ${updateError.message}`);
          
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);
          setMensajeStatus({ texto: `👋 Salida Registrada`, subtexto: nombreSocio, tipo: 'exit' });
        }
      } else {
        // Marcar ENTRADA con campos de auditoría
        const { error: insertError } = await supabase
          .from('asistencia_asambleas')
          .insert([{
            sindicato_id: sindicatoId,
            usuario_rut: qrData.rut,
            usuario_nombre: nombreSocio,
            usuario_email: emailSocio,
            usuario_rol: rolSocio,
            operador_nombre: operadorNombre, 
            asamblea_titulo: tituloAsamblea.trim(),
            hora_entrada: new Date().toISOString()
          }]);

        if (insertError) {
          console.error("Error BD Crudo:", insertError);
          throw new Error(`Error BD: ${insertError.message || JSON.stringify(insertError)}`);
        }

        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(200);
        setMensajeStatus({ texto: `✅ Entrada Autorizada`, subtexto: nombreSocio, tipo: 'success' });
      }

      setTimeout(() => setUltimoEscaneado(null), 3000);

    } catch (error: any) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setMensajeStatus({ texto: `❌ Falló el Registro`, subtexto: error.message, tipo: 'error' });
      setTimeout(() => setUltimoEscaneado(null), 4500); 
    }
  };

  if (!isMounted) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-6 text-white">
        <div className="bg-[#121216] p-10 rounded-[2.5rem] shadow-2xl border border-white/10 text-center max-w-sm">
          <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🪪</div>
          <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Tu Credencial</h2>
          <p className="text-slate-400 font-medium text-sm leading-relaxed mb-6">Para registrar tu <strong>entrada o salida</strong>, muestra tu credencial al Presidente del sindicato.</p>
          <Link href="/dashboard/credencial" className="w-full block bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all shadow-lg text-xs uppercase tracking-widest">
            Ir a mi Credencial
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#070709] font-sans text-white flex justify-center overflow-hidden" style={{ minHeight: 'calc(100vh - 76px)' }}>
      <div className="w-full max-w-md flex flex-col relative bg-[#070709] shadow-2xl" style={{ height: 'calc(100vh - 76px)' }}>
        
        <header className="px-6 pt-6 pb-4 shrink-0 z-10">
          <div className="inline-flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Modo Escáner
          </div>
          <h1 className="text-3xl font-black tracking-tight leading-none mb-4">Acceso</h1>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 ml-1 block">Registrando asistencia para:</label>
            <input 
              type="text" 
              value={tituloAsamblea} 
              onChange={(e) => setTituloAsamblea(e.target.value)} 
              className="w-full bg-transparent text-sm font-bold text-white outline-none px-1" 
              placeholder="Asamblea..." 
            />
          </div>
        </header>

        <div className="flex-1 relative bg-black w-full overflow-hidden flex flex-col border-y border-white/10">
          {escaneando ? (
            <div className="absolute inset-0">
              <Scanner
                onScan={(result) => { if (result && result.length > 0) procesarQR(result[0].rawValue); }}
                onError={(error) => console.error(error)}
                constraints={{ facingMode: 'environment' }}
                styles={{ container: { width: '100%', height: '100%' }, video: { objectFit: 'cover' } }}
                components={{ finder: false }}
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 bg-black/40 backdrop-blur-[2px]">
                <div className="w-64 h-64 border-2 border-white/20 rounded-[2rem] relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] overflow-hidden">
                  <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-blue-500 rounded-tl-[2rem]"></div>
                  <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-blue-500 rounded-tr-[2rem]"></div>
                  <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-blue-500 rounded-bl-[2rem]"></div>
                  <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-blue-500 rounded-br-[2rem]"></div>
                  <div className="w-full h-0.5 bg-blue-400 shadow-[0_0_20px_#3b82f6] absolute top-1/2 -translate-y-1/2 animate-scan"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#0a0a0c]">
              <div className="w-20 h-20 bg-white/5 text-slate-500 rounded-full flex items-center justify-center text-4xl mb-4">📷</div>
              <h3 className="text-lg font-bold text-white mb-2">Cámara Inactiva</h3>
              <p className="text-xs text-slate-400">Activa el escáner para comenzar a registrar la asistencia.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-6 shrink-0 z-10 bg-[#070709] pb-8">
          <div className="h-20 mb-4 flex items-center justify-center">
            {mensajeStatus && (
              <div className={`w-full py-3 px-4 rounded-2xl border animate-in zoom-in-95 flex flex-col items-center justify-center text-center shadow-lg ${
                mensajeStatus.tipo === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                mensajeStatus.tipo === 'exit' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                mensajeStatus.tipo === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              }`}>
                <span className="text-sm font-black tracking-tight">{mensajeStatus.texto}</span>
                {mensajeStatus.subtexto && <span className="text-[10px] font-bold opacity-80 mt-1 uppercase tracking-widest">{mensajeStatus.subtexto}</span>}
              </div>
            )}
          </div>

          <button onClick={() => setEscaneando(!escaneando)} className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${
            escaneando ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}>
            {escaneando ? '⏹ Detener Lectura' : '▶ Activar Escáner'}
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@keyframes scan { 0%, 100% { top: 15%; opacity: 0; } 10%, 90% { opacity: 1; } 50% { top: 85%; } } .animate-scan { animation: scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }`}} />
    </div>
  );
}