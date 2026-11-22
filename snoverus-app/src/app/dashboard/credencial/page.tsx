'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { notificar } from '../../lib/notificar';

export default function CredencialPage() {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const [eliminando, setEliminando] = useState(false);

  // Datos del socio (¡Agregamos el sindicato_id aquí!)
  const [socio, setSocio] = useState({
    id: "", 
    sindicato_id: null as number | null, // <-- NUEVO
    nombres: "Cargando...",
    apellidos: "",
    rut: "",
    rol: "Socio Activo"
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    async function fetchSocioData() {
      try {
        const supabase = createClient();
        
        // 1. Obtener el usuario autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          throw new Error("No hay sesión activa");
        }

        // 2. Buscar el perfil en la base de datos (Supabase trae todos los campos con '*')
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setSocio({
            id: user.id, 
            sindicato_id: data.sindicato_id, // <-- ¡CAPTURAMOS EL SINDICATO ID!
            nombres: data.full_name || 'Socio',
            apellidos: '', 
            rut: data.rut || '---',
            rol: (data.role === 'admin' || data.role === 'administrador') ? 'Directiva' : 'Socio Activo'
          });
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
        setSocio(prev => ({ ...prev, nombres: "Error al cargar" }));
      }
    }

    fetchSocioData();
  }, [isMounted]);

  const eliminarCuenta = async () => {
    const confirmacion = window.confirm(
      "⚠️ ¿Estás totalmente seguro de que deseas eliminar tu cuenta del sindicato? Esta acción borrará tus datos y no se puede deshacer."
    );

    if (!confirmacion) return;

    setEliminando(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('profiles').delete().eq('id', user.id);

        const { error: rpcError } = await supabase.rpc('delete_my_account');
        if (rpcError) {
          console.error("Error al borrar cuenta auth:", rpcError);
          throw new Error("No se pudo eliminar la credencial de acceso.");
        }
      }

      await supabase.auth.signOut();
      document.cookie = "sb-sindicato-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      router.push("/");
    } catch (error) {
      console.error("Error al eliminar la cuenta:", error);
      notificar("Hubo un problema al procesar la solicitud de eliminación. Verifica haber creado la función RPC en Supabase.");
      setEliminando(false);
    }
  };

  // 🚨 AQUÍ ESTÁ EL TRUCO MULTI-TENANT 🚨
  // Inyectamos el sindicato_id en el payload del QR para que el escáner lo valide
  const qrData = JSON.stringify({
    socio_id: socio.id,
    rut: socio.rut,
    sindicato_id: socio.sindicato_id, // <-- EL SELLO DE SEGURIDAD
    timestamp: Date.now() 
  });

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 flex flex-col items-center">
      
      {/* Área de la Credencial Centrada */}
      <main className="w-full flex flex-col items-center justify-center p-4 mt-8 max-w-sm">
        
        <div className="w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 relative transform transition-transform hover:scale-[1.02] duration-300">
          
          {/* Header Credencial (Diseño Tarjeta de Identidad) */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-900 p-6 flex justify-between items-center relative overflow-hidden h-32">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>
            
            <div className="relative z-10 flex items-center gap-3 mt-[-20px]">
              <div className="bg-white text-blue-800 font-black text-xl p-2 rounded-xl shadow-md">SN</div>
              <div>
                <h2 className="text-white font-extrabold text-xl tracking-tight leading-tight">SNOVERUS</h2>
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Sindicato de Trabajadores</p>
              </div>
            </div>
          </div>

          {/* Cuerpo Credencial */}
          <div className="px-8 pb-8 text-center relative">
            
            {/* Foto de Perfil Dinámica */}
            <div className="w-28 h-28 mx-auto bg-slate-100 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center mb-4 -mt-14 relative z-20">
              <span className="text-5xl">{socio.rol === 'Directiva' ? '👔' : '👷🏽‍♂️'}</span>
            </div>

            {/* Nombres y Apellidos desde BD */}
            <h3 className="text-xl font-black text-slate-900 uppercase leading-none mb-5">{socio.nombres}</h3>

            {/* Datos Técnicos */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 mb-6">
              <div className="flex justify-between items-center text-left mb-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RUT</p>
                  <p className="text-sm font-extrabold text-slate-800">{socio.rut || '---'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vigencia</p>
                  <p className="text-sm font-extrabold text-slate-800">12/2026</p>
                </div>
              </div>
              <div className="text-left border-t border-slate-200 pt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoría</p>
                  <p className="text-sm font-extrabold text-blue-600">{socio.rol}</p>
              </div>
            </div>

            {/* Código QR Real de Validación */}
            <div className="bg-white p-3 rounded-2xl border-2 border-slate-100 w-fit mx-auto mb-4 shadow-inner">
              {socio.rut && socio.rut !== '---' && socio.sindicato_id ? (
                <QRCodeCanvas 
                  value={qrData} 
                  size={150} 
                  level={"H"} // Alto nivel de corrección de errores (ideal para escáneres)
                  includeMargin={true}
                />
              ) : (
                <div className="w-[150px] h-[150px] flex items-center justify-center bg-slate-100 text-slate-400 text-xs text-center px-4">
                  Cargando datos seguros...
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 font-medium max-w-xs mx-auto mb-5 leading-tight">
              Presenta este código al encargado para registrar tu asistencia a la asamblea.
            </p>

            {/* Sello de Vigencia Animado */}
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 py-2.5 rounded-xl flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              <span className="font-extrabold uppercase tracking-widest text-[11px]">Afiliación al Día</span>
            </div>
            
          </div>
        </div>

        {/* ZONA DE PELIGRO: Eliminar Cuenta */}
        <div className="mt-10 w-full">
          <div className="bg-red-50/80 border border-red-200 rounded-3xl p-6 text-center shadow-sm">
            <h4 className="text-sm font-black text-red-800 mb-2">Zona de Peligro</h4>
            <p className="text-xs text-red-600/80 font-medium mb-5 leading-relaxed">
              Al eliminar tu cuenta perderás el acceso al portal y a todos tus beneficios sindicales.
            </p>
            <button
              onClick={eliminarCuenta}
              disabled={eliminando}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {eliminando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Eliminando datos...
                </>
              ) : (
                "🗑️ Eliminar mi cuenta"
              )}
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}