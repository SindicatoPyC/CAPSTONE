'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { notificar } from '../../lib/notificar';

export default function FinanzasPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [perfilSocio, setPerfilSocio] = useState<any>(null);
  const [cuotas, setCuotas] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados Inteligentes del Socio
  const [estadoCuenta, setEstadoCuenta] = useState<'Al Día' | 'Pendiente' | 'En Revisión' | 'Atrasado'>('Pendiente');
  const [diasRestantes, setDiasRestantes] = useState(0);
  const [diasMesTotal, setDiasMesTotal] = useState(30);
  const [mesActualStr, setMesActualStr] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [proximoVencimiento, setProximoVencimiento] = useState('');

  // Estados Admin
  const [showModalPagoAdmin, setShowModalPagoAdmin] = useState(false);
  const [pagoRut, setPagoRut] = useState('');
  const [pagoMes, setPagoMes] = useState('');
  const [pagoAnio, setPagoAnio] = useState(new Date().getFullYear().toString());
  const [pagoMonto, setPagoMonto] = useState('15000');
  const [pagoEstado, setPagoEstado] = useState('Aprobado');
  const [guardandoPago, setGuardandoPago] = useState(false);

  // Estados Admin: Ajustar Gráfico
  const [showModalGrafico, setShowModalGrafico] = useState(false);
  const [editGastos, setEditGastos] = useState<any[]>([]);
  const [guardandoGrafico, setGuardandoGrafico] = useState(false);

  // Estados Socio
  const [showModalInstruccionesPago, setShowModalInstruccionesPago] = useState(false);
  const [reciboSeleccionado, setReciboSeleccionado] = useState<any>(null);
  const [socioPagoRut, setSocioPagoRut] = useState('');
  const [socioPagoMonto, setSocioPagoMonto] = useState('15000');
  const [socioPagoMes, setSocioPagoMes] = useState('');
  const [socioPagoAnio, setSocioPagoAnio] = useState(new Date().getFullYear().toString());
  const [socioPagoArchivo, setSocioPagoArchivo] = useState<File | null>(null);
  const [enviandoPagoSocio, setEnviandoPagoSocio] = useState(false);

  useEffect(() => {
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const hoy = new Date();
    const mesActual = meses[hoy.getMonth()];
    
    setMesActualStr(mesActual);
    setPagoMes(mesActual);
    setSocioPagoMes(mesActual);

    // Calcular fecha de vencimiento actual (fin de este mes)
    const ultimoDiaActual = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const restantes = Math.ceil((ultimoDiaActual.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calcular fecha de próximo vencimiento (fin del mes siguiente)
    const ultimoDiaProximo = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);
    const mesProximoStr = meses[ultimoDiaProximo.getMonth()];
    
    setDiasRestantes(restantes);
    setDiasMesTotal(ultimoDiaActual.getDate());
    setFechaVencimiento(`${ultimoDiaActual.getDate()} de ${mesActual}`);
    setProximoVencimiento(`${ultimoDiaProximo.getDate()} de ${mesProximoStr}`);

    fetchFinanzas(mesActual, hoy.getFullYear(), restantes);
  }, []);

  async function fetchFinanzas(mesActual: string, anioActual: number, restantes: number) {
    setLoading(true);
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (currentUser) {
      setUser(currentUser);
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
      
      if (profile) {
        setPerfilSocio(profile);
        setSocioPagoRut(profile.rut || ''); 
        
        const rolUsuario = String(profile.role || '').toLowerCase();
        const esAdministrador = rolUsuario === 'admin' || rolUsuario === 'administrador' || rolUsuario === 'directiva';
        setIsAdmin(esAdministrador);

        const { data: transData } = await supabase.from('cuotas_sindicales').select('*').order('id', { ascending: true });
        
        if (transData && transData.length > 0) {
          const mapeados = transData.map(t => ({ id: t.id, name: t.categoria, value: Number(t.porcentaje), color: t.color_hex }));
          setGastos(mapeados);
          setEditGastos(mapeados);
        } else {
          const defaultGastos = [
            { name: 'Fondo Solidario', value: 30, color: '#10b981' },
            { name: 'Asesoría Legal', value: 25, color: '#3b82f6' },
            { name: 'Eventos y Beneficios', value: 25, color: '#f59e0b' },
            { name: 'Gastos Administrativos', value: 20, color: '#6366f1' }
          ];
          setGastos(defaultGastos);
          setEditGastos(defaultGastos);
        }

        let misCuotasArray: any[] = [];
        if (esAdministrador) {
          const { data: allCuotas } = await supabase.from('cuotas_sindicales').select('*').order('id', { ascending: false });
          if (allCuotas) setCuotas(allCuotas);
        } else {
          const { data: misCuotas } = await supabase.from('cuotas_sindicales').select('*').eq('usuario_rut', profile.rut).order('id', { ascending: false });
          if (misCuotas) {
            setCuotas(misCuotas);
            misCuotasArray = misCuotas;
          }
        }

        // Lógica de Estado
        if (!esAdministrador) {
          const cuotaMesCorriente = misCuotasArray.find(c => c.mes === mesActual && c.anio === anioActual);
          
          if (cuotaMesCorriente) {
            if (cuotaMesCorriente.estado === 'Pagado' || cuotaMesCorriente.estado === 'Aprobado') setEstadoCuenta('Al Día');
            else if (cuotaMesCorriente.estado === 'En Revisión') setEstadoCuenta('En Revisión');
            else setEstadoCuenta('Pendiente');
          } else {
            setEstadoCuenta('Pendiente');
            if (restantes === 1) {
              verificarYNotificar(currentUser.id, mesActual);
            }
          }
        }
      }
    }
    setLoading(false);
  }

  const verificarYNotificar = async (uid: string, mes: string) => {
    const supabase = createClient();
    const { data } = await supabase.from('notificaciones').select('id').eq('user_id', uid).eq('tipo', 'alerta_vencimiento').like('titulo', `%${mes}%`).single();
    if (!data) {
      await supabase.from('notificaciones').insert({
        user_id: uid, titulo: `⚠️ Tu cuota de ${mes} vence mañana`, mensaje: `Recuerda realizar el pago de tu cuota sindical antes de que termine el mes.`, tipo: 'alerta_vencimiento', enlace: '/dashboard/finanzas', leido: false
      });
    }
  };

  const handleCambiarEstado = async (id: number, nuevoEstado: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('cuotas_sindicales').update({ 
        estado: nuevoEstado, 
        fecha_pago: (nuevoEstado === 'Aprobado' || nuevoEstado === 'Pagado') ? new Date().toISOString() : null 
      }).eq('id', id);
      if (error) throw error;
      fetchFinanzas(mesActualStr, new Date().getFullYear(), diasRestantes);
    } catch (err: any) { notificar('❌ Error al actualizar: ' + err.message); }
  };

  const handleEliminarCuota = async (id: number) => {
    const confirmar = window.confirm('¿Estás seguro de que deseas eliminar este registro permanentemente?');
    if (!confirmar) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from('cuotas_sindicales').delete().eq('id', id);
      if (error) throw error;
      fetchFinanzas(mesActualStr, new Date().getFullYear(), diasRestantes);
    } catch (err: any) { notificar('❌ Error al eliminar: ' + err.message); }
  };

  const handleRegistrarPagoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPago(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('cuotas_sindicales').insert([{
        usuario_rut: pagoRut, mes: pagoMes, anio: parseInt(pagoAnio), monto: parseInt(pagoMonto), estado: pagoEstado, fecha_pago: (pagoEstado === 'Aprobado' || pagoEstado === 'Pagado') ? new Date().toISOString() : null
      }]);
      if (error) throw error;
      setShowModalPagoAdmin(false);
      fetchFinanzas(mesActualStr, new Date().getFullYear(), diasRestantes);
      setPagoRut('');
    } catch (err: any) { notificar('❌ Error: ' + err.message); } finally { setGuardandoPago(false); }
  };

  const handleGuardarGrafico = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoGrafico(true);
    try {
      const supabase = createClient();
      const totalPorcentaje = editGastos.reduce((sum, item) => sum + Number(item.value), 0);
      if (totalPorcentaje !== 100) return notificar(`⚠️ Los porcentajes deben sumar exactamente 100%. Suman ${totalPorcentaje}%.`);

      for (const gasto of editGastos) {
        if (gasto.id) await supabase.from('cuotas_sindicales').update({ porcentaje: gasto.value }).eq('id', gasto.id);
        else await supabase.from('cuotas_sindicalesusuarios').insert({ categoria: gasto.name, porcentaje: gasto.value, color_hex: gasto.color });
      }
      setShowModalGrafico(false);
      fetchFinanzas(mesActualStr, new Date().getFullYear(), diasRestantes);
    } catch (err: any) { notificar('❌ Error: ' + err.message); } finally { setGuardandoGrafico(false); }
  };

  const handleNotificarPagoSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socioPagoArchivo) return notificar('⚠️ Adjunta la foto o PDF de tu transferencia.');
    setEnviandoPagoSocio(true);
    try {
      const supabase = createClient();
      const fileExt = socioPagoArchivo.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('comprobantes').upload(fileName, socioPagoArchivo);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('comprobantes').getPublicUrl(fileName);
      
      const { error: dbError } = await supabase.from('cuotas_sindicales').insert([{
        usuario_rut: socioPagoRut, mes: socioPagoMes, anio: parseInt(socioPagoAnio), monto: parseInt(socioPagoMonto), estado: 'En Revisión', comprobante_url: publicUrlData.publicUrl
      }]);
      if (dbError) throw dbError;
      
      notificar('✅ Comprobante enviado. En revisión.');
      setShowModalInstruccionesPago(false);
      fetchFinanzas(mesActualStr, new Date().getFullYear(), diasRestantes);
      setSocioPagoArchivo(null);
    } catch (err: any) { notificar('❌ Error al enviar: ' + err.message); } finally { setEnviandoPagoSocio(false); }
  };

  const handlePorcentajeChange = (index: number, nuevoValor: string) => {
    const actualizados = [...editGastos];
    actualizados[index].value = nuevoValor === '' ? 0 : Number(nuevoValor);
    setEditGastos(actualizados);
  };

  const totalPagado = cuotas.filter(c => c.estado === 'Pagado' || c.estado === 'Aprobado').reduce((sum, curr) => sum + Number(curr.monto), 0);
  const porcentajeMesTranscurrido = estadoCuenta === 'Al Día' ? 100 : Math.max(0, Math.min(100, ((diasMesTotal - diasRestantes) / diasMesTotal) * 100));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Estilos visuales 2.0 (Modernos, suaves y limpios)
  const getBannerStyles = () => {
    if (estadoCuenta === 'Al Día') return 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-900 shadow-emerald-500/10';
    if (estadoCuenta === 'En Revisión') return 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 text-blue-900 shadow-blue-500/10';
    if (estadoCuenta === 'Pendiente' && diasRestantes <= 3) return 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200 text-red-900 shadow-red-500/20';
    return 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 text-amber-900 shadow-amber-500/10';
  };

  const getBarColor = () => {
    if (estadoCuenta === 'Al Día') return 'bg-emerald-400';
    if (estadoCuenta === 'En Revisión') return 'bg-blue-400';
    if (diasRestantes <= 3) return 'bg-red-400';
    return 'bg-amber-400';
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20 relative overflow-hidden selection:bg-emerald-100">
      <style dangerouslySetInnerHTML={{__html: `
        @media print { body * { visibility: hidden; } #recibo-oficial, #recibo-oficial * { visibility: visible; } #recibo-oficial { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; } .no-print { display: none !important; } }
      `}} />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-10 space-y-8 relative z-10">
        
        {/* CABECERA 2.0 */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100/80 p-8 relative overflow-hidden">
           <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
             <div>
               <span className="bg-emerald-100/80 text-emerald-700 text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4 inline-block shadow-sm">Módulo Financiero</span>
               <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight mb-2">Tesorería y Finanzas</h2>
               <p className="text-slate-500 max-w-xl text-sm font-medium leading-relaxed">Audita los fondos, verifica tus aportes y mantén tu estado de cuenta actualizado de forma transparente.</p>
             </div>
             
             {/* BANNER INTELIGENTE SOCIO 2.0 */}
             {!isAdmin && (
               <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-[480px] shrink-0">
                 <div className={`px-7 py-6 rounded-3xl border flex flex-col gap-4 flex-1 shadow-sm transition-all duration-300 hover:shadow-md ${getBannerStyles()}`}>
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl filter drop-shadow-sm">
                          {estadoCuenta === 'Al Día' ? '✅' : estadoCuenta === 'En Revisión' ? '⏳' : diasRestantes <= 3 ? '🚨' : '⚠️'}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">
                            {estadoCuenta === 'Al Día' ? 'Estado: Al Día' : estadoCuenta === 'En Revisión' ? 'Validando Pago' : `Faltan ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}`}
                          </p>
                          <p className="text-xl font-black tracking-tight">
                            {estadoCuenta === 'Al Día' ? `Próxima cuota: ${proximoVencimiento}` : 
                             estadoCuenta === 'En Revisión' ? 'Cuota en Revisión' : 
                             estadoCuenta === 'Pendiente' && diasRestantes === 1 ? '¡Vence Mañana!' : `Vence el ${fechaVencimiento}`}
                          </p>
                        </div>
                      </div>
                      {(estadoCuenta === 'Pendiente' || estadoCuenta === 'Atrasado') && (
                        <button onClick={() => setShowModalInstruccionesPago(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-slate-900/20 transition-transform hover:-translate-y-1 text-xs uppercase tracking-widest ml-4">
                          Pagar
                        </button>
                      )}
                    </div>
                    {/* Barra de Progreso 2.0 */}
                    <div>
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2 opacity-60">
                        <span>{estadoCuenta === 'Al Día' ? 'Mes Actual Pagado' : 'Progreso del Mes'}</span>
                        <span>{estadoCuenta === 'Al Día' ? '100%' : `${mesActualStr}`}</span>
                      </div>
                      <div className="w-full bg-slate-900/5 rounded-full h-2 overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full transition-all duration-1000 ${getBarColor()}`} style={{ width: `${porcentajeMesTranscurrido}%` }}></div>
                      </div>
                    </div>
                 </div>
               </div>
             )}
           </div>
        </motion.div>

        {/* PANEL ADMIN 2.0 */}
        {isAdmin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900 rounded-3xl p-6 shadow-2xl shadow-slate-900/20 flex flex-col md:flex-row gap-6 items-center justify-between border border-slate-800">
            <div className="flex items-center gap-5">
              <div className="bg-white/10 p-4 rounded-2xl text-blue-400 text-2xl backdrop-blur-md">⚙️</div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Panel Directiva</h3>
                <p className="text-xs text-slate-400 font-medium">Audita pagos, edita registros y actualiza gráficos.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <button onClick={() => setShowModalPagoAdmin(true)} className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black uppercase tracking-widest px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 transition-all">+ Ingreso Manual</button>
              <button onClick={() => setShowModalGrafico(true)} className="bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest px-6 py-3.5 rounded-xl border border-white/10 transition-all">📊 Editar Gráfico</button>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* TABLA DE REGISTROS 2.0 */}
          <motion.section initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100/80 p-8 flex flex-col overflow-hidden">
            <div className="flex justify-between items-end mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 text-xl shadow-sm border border-emerald-100/50">💳</div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{isAdmin ? 'Registro General' : 'Mis Movimientos'}</h3>
              </div>
              {!isAdmin && <span className="text-xs text-slate-400 font-black uppercase tracking-widest">Aportado: <span className="text-emerald-500">${totalPagado.toLocaleString('es-CL')}</span></span>}
            </div>

            {cuotas.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <span className="text-5xl opacity-30 block mb-4">🧾</span>
                <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No hay registros almacenados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm flex-1 w-full bg-white">
                <table className="w-full text-left min-w-[650px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {isAdmin && <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">RUT</th>}
                      <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Período</th>
                      <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Monto</th>
                      <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                      <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">{isAdmin ? 'Acciones' : 'Recibo'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {cuotas.map((cuota) => (
                      <tr key={cuota.id} className="hover:bg-slate-50/80 transition-colors group">
                        {isAdmin && <td className="p-5 font-bold text-slate-600 text-xs">{cuota.usuario_rut}</td>}
                        <td className="p-5">
                            <span className="font-black text-slate-800 text-sm block">{cuota.mes}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{cuota.anio}</span>
                        </td>
                        <td className="p-5 font-black text-slate-700 text-sm">${Number(cuota.monto).toLocaleString('es-CL')}</td>
                        
                        {/* COLUMNA ESTADO 2.0 */}
                        <td className="p-5 text-center">
                          {isAdmin ? (
                            <div className="inline-block relative">
                              <select 
                                value={cuota.estado === 'Pagado' ? 'Aprobado' : cuota.estado}
                                onChange={(e) => handleCambiarEstado(cuota.id, e.target.value)}
                                className={`appearance-none text-[9px] font-black uppercase tracking-widest rounded-xl px-4 py-2 pr-8 outline-none shadow-sm cursor-pointer border text-center transition-all focus:ring-2 focus:ring-slate-200
                                  ${(cuota.estado === 'Aprobado' || cuota.estado === 'Pagado') ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 
                                    cuota.estado === 'Rechazado' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 
                                    'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
                              >
                                <option value="Aprobado">Aprobado</option>
                                <option value="Pendiente">Pendiente</option>
                                <option value="En Revisión">En Revisión</option>
                                <option value="Rechazado">Rechazado</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 opacity-50">
                                <svg className="fill-current h-3 w-3" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                              </div>
                            </div>
                          ) : (
                            <span className={`inline-flex px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${(cuota.estado === 'Pagado' || cuota.estado === 'Aprobado') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : cuota.estado === 'En Revisión' ? 'bg-blue-50 text-blue-700 border border-blue-100 animate-pulse' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                              {(cuota.estado === 'Pagado' || cuota.estado === 'Aprobado') && <span className="mr-1 text-emerald-500">✔</span>}
                              {cuota.estado === 'Pagado' ? 'Aprobado' : cuota.estado}
                            </span>
                          )}
                        </td>

                        {/* COLUMNA ACCIONES 2.0 */}
                        <td className="p-5 text-right">
                          {isAdmin ? (
                            <div className="flex justify-end gap-3 items-center opacity-70 group-hover:opacity-100 transition-opacity">
                              {cuota.comprobante_url ? (
                                <a href={cuota.comprobante_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 underline font-black hover:text-blue-800 transition-colors mr-2">Ver Doc</a>
                              ) : <span className="text-[10px] text-slate-300 font-bold italic mr-2">Sin doc</span>}
                              
                              <button onClick={() => handleEliminarCuota(cuota.id)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Eliminar Registro">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setReciboSeleccionado(cuota)} disabled={cuota.estado !== 'Pagado' && cuota.estado !== 'Aprobado'} className={`p-2 rounded-xl transition-all shadow-sm border ${(cuota.estado === 'Pagado' || cuota.estado === 'Aprobado') ? 'bg-white border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 hover:shadow-md' : 'bg-slate-50 border-transparent text-slate-300 cursor-not-allowed'}`}>
                               📄
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.section>

          {/* GRÁFICO TRANSPARENCIA 2.0 */}
          <motion.section initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100/80 p-8 flex flex-col w-full overflow-hidden">
            <div className="flex items-center gap-4 mb-8 shrink-0">
              <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 text-xl shadow-sm border border-blue-100/50">📊</div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Transparencia</h3>
                <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">{isAdmin ? 'Distribución de Fondos' : 'Destino de tus aportes sindicales'}</p>
              </div>
            </div>

            <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[320px]">
              <div className="w-full h-[240px] drop-shadow-md">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={gastos} cx="50%" cy="50%" innerRadius={75} outerRadius={95} paddingAngle={5} dataKey="value" stroke="none">
                      {gastos.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} className="transition-all duration-300 outline-none hover:opacity-80 cursor-pointer" />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} itemStyle={{ fontWeight: '900', color: '#1e293b' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full px-2">
                {gastos.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs font-bold text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 transition-colors hover:bg-white hover:shadow-sm">
                    <span className="w-3.5 h-3.5 rounded-full shadow-inner shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="truncate flex-1" title={item.name}>{item.name}</span>
                    <span className="font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg shadow-sm border border-slate-100">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

        </div>
      </main>

      <AnimatePresence>
        {/* MODALES MANTIENEN SU LÓGICA PERO CON BORDES REDONDEADOS */}
        {showModalGrafico && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] border border-slate-100">
               <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center shrink-0 rounded-t-[2rem]">
                 <div>
                   <h3 className="text-xl font-black text-slate-800">Actualizar Gráfico</h3>
                 </div>
                 <button onClick={() => setShowModalGrafico(false)} className="text-slate-400 hover:text-slate-800 text-xl font-bold bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center">✕</button>
               </div>
               <div className="overflow-y-auto p-6">
                 <form onSubmit={handleGuardarGrafico} className="space-y-4">
                   {editGastos.map((gasto, index) => (
                     <div key={gasto.id || index} className="flex items-center gap-4 bg-slate-50/80 border border-slate-100 p-3.5 rounded-2xl">
                       <span className="w-4 h-4 rounded-full shadow-inner shrink-0" style={{ backgroundColor: gasto.color }}></span>
                       <label className="flex-1 text-xs font-bold text-slate-700 truncate" title={gasto.name}>{gasto.name}</label>
                       <div className="relative w-24 shrink-0">
                         <input type="number" min="0" max="100" value={gasto.value} onChange={e => handlePorcentajeChange(index, e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 pr-8 text-right shadow-sm" />
                         <span className="absolute right-3 top-2 text-xs font-black text-slate-400">%</span>
                       </div>
                     </div>
                   ))}
                   <button type="submit" disabled={guardandoGrafico} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-lg transition-all text-sm uppercase tracking-widest mt-4">
                     {guardandoGrafico ? 'Actualizando BD...' : 'Guardar Cambios'}
                   </button>
                 </form>
               </div>
             </div>
          </motion.div>
        )}

        {showModalPagoAdmin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Registrar Pago</h3>
                  </div>
                  <button onClick={() => setShowModalPagoAdmin(false)} className="text-slate-400 hover:text-slate-800 text-xl font-bold bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center">✕</button>
                </div>
                <form onSubmit={handleRegistrarPagoAdmin} className="p-6 space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">RUT del Socio</label>
                    <input type="text" required value={pagoRut} onChange={e => setPagoRut(e.target.value)} placeholder="Ej: 12345678-9" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:bg-white shadow-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mes</label>
                      <select value={pagoMes} onChange={e => setPagoMes(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:bg-white shadow-sm">
                        {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monto</label>
                      <input type="number" required value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:bg-white shadow-sm" />
                    </div>
                  </div>
                  <button type="submit" disabled={guardandoPago} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl mt-2 transition-all shadow-lg shadow-emerald-500/20 text-sm uppercase tracking-widest">
                    {guardandoPago ? 'Guardando...' : 'Confirmar Ingreso'}
                  </button>
                </form>
              </div>
            </motion.div>
        )}

        {showModalInstruccionesPago && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] border border-slate-100">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100/50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-blue-200">🏦</div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800">Notificar Pago</h3>
                    </div>
                  </div>
                  <button onClick={() => setShowModalInstruccionesPago(false)} className="text-slate-400 hover:text-slate-800 bg-white shadow-sm rounded-full w-8 h-8 font-bold flex items-center justify-center">✕</button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 text-xs space-y-2.5 mb-6">
                        <p><span className="font-black text-blue-400/80 inline-block w-20 uppercase tracking-widest">Banco:</span> <span className="font-black text-blue-900">Estado</span></p>
                        <p><span className="font-black text-blue-400/80 inline-block w-20 uppercase tracking-widest">Cuenta:</span> <span className="font-black text-blue-900">Vista / 12345678-9</span></p>
                        <p><span className="font-black text-blue-400/80 inline-block w-20 uppercase tracking-widest">RUT:</span> <span className="font-black text-blue-900">65.000.000-0</span></p>
                    </div>

                    <form onSubmit={handleNotificarPagoSocio} className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tu RUT</label>
                            <input type="text" required value={socioPagoRut} onChange={(e) => setSocioPagoRut(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-700 shadow-sm" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mes</label>
                                <select value={socioPagoMes} onChange={(e) => setSocioPagoMes(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm">
                                    {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monto ($)</label>
                                <input type="number" required value={socioPagoMonto} onChange={(e) => setSocioPagoMonto(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Comprobante (Foto/PDF)</label>
                            <input type="file" required accept=".pdf, image/*" onChange={(e) => setSocioPagoArchivo(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm" />
                        </div>

                        <button type="submit" disabled={enviandoPagoSocio} className="w-full bg-slate-900 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl mt-4 shadow-lg hover:bg-slate-800 transition-colors">
                            {enviandoPagoSocio ? 'Subiendo Archivo...' : 'Enviar para Revisión'}
                        </button>
                    </form>
                </div>
              </div>
            </motion.div>
        )}

        {/* MODAL RECIBO */}
        {reciboSeleccionado && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
              <div id="recibo-oficial" className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative border border-slate-200">
                <div className="absolute top-0 left-0 w-full h-3 bg-blue-600 no-print"></div>
                <button onClick={() => setReciboSeleccionado(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center no-print font-bold">✕</button>
                
                <div className="p-8 text-center border-b border-slate-200 border-dashed mt-2">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner">
                       <span className="text-2xl">📜</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-1">SINDICATO PYC</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comprobante Oficial</p>
                </div>
                
                <div className="p-8 space-y-5 text-sm text-slate-600">
                    <div className="flex justify-between items-center"><span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">N° Transacción:</span> <span className="font-black text-slate-800 font-mono">#{reciboSeleccionado.id.toString().padStart(6, '0')}</span></div>
                    <div className="flex justify-between items-center"><span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Fecha Pago:</span> <span className="font-bold text-slate-800">{new Date(reciboSeleccionado.fecha_pago).toLocaleDateString()}</span></div>
                    <div className="flex justify-between items-center"><span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Período:</span> <span className="font-bold text-slate-800">{reciboSeleccionado.mes} {reciboSeleccionado.anio}</span></div>
                    <div className="flex justify-between items-center"><span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">RUT Socio:</span> <span className="font-bold text-slate-800">{reciboSeleccionado.usuario_rut}</span></div>
                    
                    <div className="flex justify-between items-center pt-5 border-t border-slate-200 border-dashed mt-4 bg-slate-50 -mx-8 px-8 pb-3">
                        <span className="font-black text-slate-800 text-[10px] uppercase tracking-widest mt-3">Total Pagado:</span> 
                        <span className="font-black text-emerald-600 text-2xl mt-3">${Number(reciboSeleccionado.monto).toLocaleString('es-CL')}</span>
                    </div>
                </div>
                
                <div className="bg-white p-5 text-center no-print border-t border-slate-100">
                    <button onClick={() => window.print()} className="w-full bg-blue-50 hover:bg-blue-100 text-[10px] font-black text-blue-600 uppercase tracking-widest py-3.5 rounded-xl transition-colors border border-blue-200 border-dashed">
                      📥 Imprimir / Guardar PDF
                    </button>
                </div>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}