'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase';
import { notificar } from '../../lib/notificar';

export default function LegalPage() {
  // 🛡️ Estado de Rol y RUT del Socio Activo
  const [rutUsuario, setRutUsuario] = useState<string>('');

  // Estados para el formulario de reserva
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [agendando, setAgendando] = useState(false);

  // Estados para el historial
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initializeData() {
      // 1. Leer la sesión desde las cookies
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(c => c.trim().startsWith('sb-sindicato-session='));
      const rut = sessionCookie ? sessionCookie.split('=')[1] : '12345678-9';
      setRutUsuario(rut);

      // 2. Traer las reservas del usuario actual
      fetchReservas(rut);
    }
    
    initializeData();
  }, []);

  const fetchReservas = async (rut: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('agenda_legal')
      .select('*')
      .eq('usuario_rut', rut)
      .order('fecha_reserva', { ascending: true });

    if (data) setReservas(data);
    setLoading(false);
  };

  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgendando(true);
    const supabase = createClient();

    const { error } = await supabase.from('agenda_legal').insert([
      { usuario_rut: rutUsuario, motivo, fecha_reserva: fecha, hora_reserva: hora }
    ]);

    setAgendando(false);

    if (error) {
      notificar('Error al agendar: ' + error.message);
    } else {
      notificar('✅ ¡Tu hora ha sido solicitada! Espera la confirmación de la directiva.');
      setMotivo(''); setFecha(''); setHora('');
      fetchReservas(rutUsuario);
    }
  };

  const getBadgeStyle = (estado: string) => {
    switch (estado) {
      case 'Confirmada': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Rechazada': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200'; // Pendiente
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Cabecera */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-slate-200 opacity-50 rounded-full blur-2xl"></div>
           <div className="relative z-10">
             <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Asesoría Legal Sindical</h2>
             <p className="text-slate-500 max-w-2xl text-sm">
               Reserva una hora confidencial con nuestros abogados o dirigentes para revisar finiquitos, contratos, fueros o denuncias laborales.
             </p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Columna Izquierda: Formulario de Agenda (Ocupa 2/5 del espacio) */}
          <section className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-8 h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-slate-100 p-3 rounded-2xl text-slate-700 text-xl font-bold">⚖️</div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Agendar Consulta</h3>
              </div>
            </div>

            <form onSubmit={handleAgendar} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Motivo de la consulta</label>
                <select 
                  required
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                >
                  <option value="" disabled>Selecciona un motivo...</option>
                  <option value="Revisión de Finiquito">Revisión de Finiquito</option>
                  <option value="Acoso Laboral / Maltrato">Acoso Laboral / Maltrato</option>
                  <option value="Consulta sobre Contrato">Consulta sobre Contrato</option>
                  <option value="Licencias y Fueros">Licencias y Fueros</option>
                  <option value="Otro motivo legal">Otro motivo legal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Fecha sugerida</label>
                <input 
                  type="date" 
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Bloque horario</label>
                <select 
                  required
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                >
                  <option value="" disabled>Selecciona un horario...</option>
                  <option value="Mañana (09:00 - 12:00)">Mañana (09:00 - 12:00)</option>
                  <option value="Tarde (14:00 - 17:00)">Tarde (14:00 - 17:00)</option>
                </select>
              </div>
              
              <button 
                type="submit" 
                disabled={agendando}
                className="w-full bg-slate-900 hover:bg-blue-600 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 mt-4"
              >
                {agendando ? 'Procesando...' : 'Solicitar Reserva'}
              </button>
            </form>
          </section>

          {/* Columna Derecha: Historial de Citas (Ocupa 3/5 del espacio) */}
          <section className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-slate-100 p-3 rounded-2xl text-slate-600 text-xl font-bold">📅</div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Mis Citas Agendadas</h3>
              </div>
            </div>

            {loading ? (
              <p className="text-slate-400 text-sm text-center py-10">Cargando agenda...</p>
            ) : reservas.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-10 text-center flex flex-col items-center">
                <span className="text-4xl mb-3 opacity-50">📂</span>
                <p className="text-slate-500 font-medium">No tienes citas legales programadas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                {reservas.map((reserva) => (
                  <div key={reserva.id} className="p-5 border border-slate-200 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-md transition-all relative overflow-hidden group">
                    {/* Decoración lateral */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
                    
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border ${getBadgeStyle(reserva.estado)}`}>
                        {reserva.estado}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">ID #{reserva.id}</span>
                    </div>
                    
                    <h4 className="font-bold text-slate-800 text-lg leading-tight mb-4">{reserva.motivo}</h4>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <span>🗓️</span> {new Date(reserva.fecha_reserva).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <span>⏰</span> {reserva.hora_reserva}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}