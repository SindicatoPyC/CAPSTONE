'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase';
import Link from 'next/link';
import { notificar } from '../../lib/notificar';

export default function SoportePage() {
  const [rutUsuario, setRutUsuario] = useState<string>('');
  const [rutReal, setRutReal] = useState<string>('');
  const [nombreUsuario, setNombreUsuario] = useState<string>('');
  const [sindicatoNombre, setSindicatoNombre] = useState<string>('Sindicato PYC');
  const [email, setEmail] = useState('');
  const [tipo, setTipo] = useState('Consulta General');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Administrador
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketEditando, setTicketEditando] = useState<any>(null);
  const [nuevoEstado, setNuevoEstado] = useState('Pendiente');
  const [respuestaAdmin, setRespuestaAdmin] = useState('');
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    async function initializeData() {
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find((c) => c.trim().startsWith('sb-sindicato-session='));
      const rolCookie = cookies.find((c) => c.trim().startsWith('sb-sindicato-rol='));

      let identificador = sessionCookie ? decodeURIComponent(sessionCookie.split('=')[1]) : '';
      let adminFlag = false;

      if (rolCookie) {
        const rol = rolCookie.split('=')[1].trim().toLowerCase();
        if (['admin', 'administrador', 'directiva', 'presidente', 'superadmin'].includes(rol)) {
          adminFlag = true;
        }
      }

      // Enriquecer con datos reales desde Supabase (nombre, RUT, correo y sindicato)
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          if (!identificador && user.email) identificador = user.email;
          if (user.email) setEmail(user.email);

          const { data: perfil } = await supabase
            .from('profiles')
            .select('full_name, rut, email, role, sindicato_id')
            .eq('id', user.id)
            .maybeSingle();

          if (perfil) {
            if (perfil.full_name) setNombreUsuario(perfil.full_name);
            if (perfil.rut) setRutReal(perfil.rut);
            if (perfil.email) {
              setEmail(perfil.email);
              if (!identificador) identificador = perfil.email;
            }

            const rolPerfil = String(perfil.role || '').trim().toLowerCase();
            if (['admin', 'administrador', 'directiva', 'presidente', 'superadmin'].includes(rolPerfil)) {
              adminFlag = true;
            }

            let targetSindicatoId = perfil.sindicato_id;
            if (rolPerfil === 'superadmin') {
              const cached = localStorage.getItem('sindicato_activo');
              if (cached) targetSindicatoId = Number(cached);
            }

            if (targetSindicatoId) {
              const { data: sind } = await supabase
                .from('sindicatos')
                .select('nombre')
                .eq('id', targetSindicatoId)
                .maybeSingle();
              if (sind?.nombre) setSindicatoNombre(sind.nombre);
            }
          }
        }
      } catch (err) {
        console.warn('No se pudo enriquecer el perfil en soporte:', err);
      }

      const idFinal = identificador || '12345678-9';
      setRutUsuario(idFinal);
      setIsAdmin(adminFlag);
      fetchTickets(idFinal, adminFlag);
    }

    initializeData();
  }, []);

  const fetchTickets = async (rut: string, esAdmin: boolean) => {
    setLoading(true);
    const supabase = createClient();

    // Si es admin trae TODOS los tickets, si es socio trae solo los suyos
    let query = supabase.from('tickets_soporte').select('*').order('created_at', { ascending: false });

    if (!esAdmin) {
      query = query.eq('usuario_rut', rut);
    }

    const { data } = await query;
    if (data) setTickets(data);
    setLoading(false);
  };

  const handleEnviarTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const supabase = createClient();
    const correoDestino = email.trim().toLowerCase();

    // 1. Guardar en la base de datos
    const { data: ticketCreado, error } = await supabase
      .from('tickets_soporte')
      .insert([
        {
          usuario_rut: correoDestino,
          asunto: `[${tipo}] ${asunto}`,
          mensaje: mensaje,
          estado: 'Pendiente',
        },
      ])
      .select('id')
      .maybeSingle();

    if (error) {
      notificar('❌ Error al guardar el ticket en la base de datos: ' + error.message);
      setEnviando(false);
      return;
    }

    // 2. Enviar comprobante por Brevo vía /api/correos
    let correoEnviado = false;
    let errorCorreo = '';
    try {
      const resCorreo = await fetch('/api/correos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'ticket',
          to_email: correoDestino,
          to_name: nombreUsuario || correoDestino.split('@')[0],
          sindicato_nombre: sindicatoNombre,
          socio_rut: rutReal || rutUsuario,
          ticket_id: ticketCreado?.id,
          ticket_asunto: asunto,
          ticket_categoria: tipo,
          ticket_prioridad: 'Normal',
          ticket_mensaje: mensaje,
          ticket_estado: 'Pendiente',
        }),
      });
      const dataCorreo = await resCorreo.json().catch(() => ({}));
      if (resCorreo.ok && dataCorreo?.ok) {
        correoEnviado = true;
      } else {
        errorCorreo = dataCorreo?.error || 'Error desconocido al despachar el correo.';
        console.error('Error respuesta /api/correos (ticket):', dataCorreo);
      }
    } catch (err: any) {
      errorCorreo = err?.message || 'Fallo de red al contactar /api/correos.';
      console.error('Error enviando correo con Brevo:', err);
    }

    // 3. Notificación al usuario y reset del formulario
    if (correoEnviado) {
      notificar('✅ ¡Solicitud ingresada correctamente! Se ha enviado un comprobante a tu correo.');
    } else {
      notificar(`⚠️ Ticket guardado, pero no se pudo enviar el correo: ${errorCorreo}`);
    }

    setTipo('Consulta General');
    setAsunto('');
    setMensaje('');
    fetchTickets(rutUsuario, isAdmin);
    setEnviando(false);
  };

  // === FUNCIONES ADMIN ===
  const abrirModalEditar = (ticket: any) => {
    setTicketEditando(ticket);
    setNuevoEstado(ticket.estado || 'Pendiente');
    setRespuestaAdmin(ticket.respuesta_admin || '');
    setIsModalOpen(true);
  };

  const handleActualizarTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setActualizando(true);
    try {
      const supabase = createClient();

      // 1. Actualizar el ticket en la base de datos (Supabase)
      const { error } = await supabase
        .from('tickets_soporte')
        .update({ estado: nuevoEstado, respuesta_admin: respuestaAdmin })
        .eq('id', ticketEditando.id);

      if (error) throw error;

      // 2. Enviar respuesta al socio por Brevo vía /api/correos
      if (respuestaAdmin.trim() !== '') {
        const correoSocio = String(ticketEditando.usuario_rut || '').trim();

        if (!correoSocio.includes('@')) {
          notificar(
            '✅ Ticket actualizado en base de datos (no se envió correo porque el registro no tiene email válido).'
          );
        } else {
          try {
            const resCorreo = await fetch('/api/correos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tipo: 'ticket',
                to_email: correoSocio,
                to_name: correoSocio.split('@')[0],
                sindicato_nombre: sindicatoNombre,
                socio_rut: correoSocio,
                ticket_id: ticketEditando.id,
                ticket_asunto: `Resolución de tu Ticket #${ticketEditando.id} (${ticketEditando.asunto})`,
                ticket_categoria: 'Respuesta de Directiva',
                ticket_prioridad: 'Normal',
                ticket_estado: nuevoEstado,
                ticket_mensaje: `La directiva ha respondido a tu solicitud:\n\n"${respuestaAdmin}"\n\nEstado actual del ticket: ${nuevoEstado}`,
              }),
            });

            const dataCorreo = await resCorreo.json().catch(() => ({}));
            if (resCorreo.ok && dataCorreo?.ok) {
              notificar(
                `✅ Ticket actualizado en base de datos.\n📧 Notificación enviada exitosamente al correo: ${correoSocio}`
              );
            } else {
              throw new Error(dataCorreo?.error || 'Brevo rechazó el envío.');
            }
          } catch (emailError: any) {
            console.error('Fallo detallado de Brevo:', emailError);
            notificar(
              `⚠️ El ticket se guardó, pero falló el envío del correo.\nMotivo: ${emailError.message}`
            );
          }
        }
      } else {
        notificar('✅ Ticket actualizado correctamente (Sin enviar notificación por falta de respuesta escrita).');
      }

      setIsModalOpen(false);
      fetchTickets(rutUsuario, isAdmin);
    } catch (err: any) {
      notificar('❌ Error de Base de Datos (Supabase): ' + (err.message || err.details));
    } finally {
      setActualizando(false);
    }
  };

  const handleEliminarTicket = async (id: number) => {
    if (!window.confirm('⚠️ ¿Eliminar definitivamente este ticket de soporte?')) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from('tickets_soporte').delete().eq('id', id);
      if (error) throw error;
      notificar('🗑️ Ticket eliminado.');
      fetchTickets(rutUsuario, isAdmin);
    } catch (err: any) {
      notificar('❌ Error al eliminar: ' + err.message);
    }
  };

  const getBadgeStyle = (estado: string) => {
    switch (estado) {
      case 'Resuelto':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'En Revisión':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="bg-slate-950 font-sans text-slate-100 min-h-screen relative w-full pb-24 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-10 relative z-10">
        {/* ========================================================================= */}
        {/* ========================= VISTA SOCIO (DEFAULT) ========================= */}
        {/* ========================================================================= */}
        {!isAdmin && (
          <>
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full text-blue-400 text-[10px] font-black tracking-[0.2em] uppercase mb-4">
                🎧 Asistencia
              </div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                Centro de Soporte
              </h1>
              <p className="text-slate-400 mt-4 max-w-2xl">
                ¿Tienes alguna duda sobre tus beneficios o un problema en la plataforma? Envía un ticket a la directiva y te responderemos a la brevedad.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Formulario de Soporte */}
              <section className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 p-8 h-fit shadow-xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-xl">
                    📝
                  </div>
                  <h3 className="text-xl font-bold text-white">Abrir Nuevo Ticket</h3>
                </div>

                <form onSubmit={handleEnviarTicket} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Tipo de Solicitud
                    </label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="Consulta General">Consulta General</option>
                      <option value="Reclamo">Reclamo</option>
                      <option value="Beneficio">Solicitud de Beneficio Económico</option>
                      <option value="Asesoría Legal">Asesoría Legal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Tu Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@correo.cl"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Asunto de tu consulta
                    </label>
                    <input
                      type="text"
                      required
                      value={asunto}
                      onChange={(e) => setAsunto(e.target.value)}
                      placeholder="Ej: Problema con carga de documento..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Detalle del problema
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      placeholder="Explícanos tu situación con el mayor detalle posible..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none transition-all resize-none"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50 text-sm mt-2"
                  >
                    {enviando ? 'Guardando y Enviando...' : 'Enviar Solicitud'}
                  </button>
                </form>
              </section>

              {/* Historial de Tickets */}
              <section className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-6">
                  <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-xl">
                    📋
                  </div>
                  <h3 className="text-xl font-bold text-white">Mis Tickets Activos</h3>
                </div>

                {loading ? (
                  <p className="text-slate-400 text-sm text-center py-10 font-bold animate-pulse">
                    Cargando tu historial...
                  </p>
                ) : tickets.length === 0 ? (
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center">
                    <span className="text-4xl mb-3 opacity-50">📭</span>
                    <p className="text-slate-500 font-bold text-sm">
                      No tienes tickets de soporte en este momento.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 hide-scrollbar">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-5 border border-slate-800 bg-slate-950/50 rounded-2xl transition-all hover:border-blue-500/50 hover:bg-slate-900"
                      >
                        <div className="flex justify-between items-start mb-3 gap-4">
                          <h4 className="font-bold text-white leading-tight text-sm">{ticket.asunto}</h4>
                          <span
                            className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border whitespace-nowrap ${getBadgeStyle(
                              ticket.estado
                            )}`}
                          >
                            {ticket.estado || 'Pendiente'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-3">{ticket.mensaje}</p>

                        {/* Muestra respuesta del admin si existe */}
                        {ticket.respuesta_admin && (
                          <div className="mt-4 mb-4 bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                              Respuesta Directiva:
                            </p>
                            <p className="text-xs text-slate-300">{ticket.respuesta_admin}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            TICKET #{ticket.id}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {new Date(ticket.created_at).toLocaleDateString('es-CL')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* ========================== VISTA ADMINISTRADOR ========================== */}
        {/* ========================================================================= */}
        {isAdmin && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-indigo-900/30 pb-8">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <Link
                    href="/dashboard/admin"
                    className="text-slate-400 hover:text-white transition-colors font-bold text-sm bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700"
                  >
                    ← Volver al Admin
                  </Link>
                  <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black tracking-[0.2em] uppercase px-3 py-1 rounded-full flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span> Panel de Soporte
                  </span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">Gestión de Tickets</h1>
              </div>
            </div>

            {loading ? (
              <p className="text-slate-400 text-center py-10 font-bold animate-pulse">
                Cargando bandeja de entrada...
              </p>
            ) : (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead className="bg-slate-950/50 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="p-5 pl-8">ID / Fecha</th>
                      <th className="p-5">Socio (Correo)</th>
                      <th className="p-5">Asunto</th>
                      <th className="p-5 text-center">Estado</th>
                      <th className="p-5 pr-8 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-5 pl-8">
                          <p className="font-bold text-white text-sm">#{t.id}</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-1">
                            {new Date(t.created_at).toLocaleDateString('es-CL')}
                          </p>
                        </td>
                        <td className="p-5">
                          <span className="bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700">
                            {t.usuario_rut}
                          </span>
                        </td>
                        <td className="p-5">
                          <p className="text-sm font-bold text-slate-200 line-clamp-1 max-w-xs">{t.asunto}</p>
                          <p className="text-[10px] text-slate-500 mt-1 truncate max-w-xs">{t.mensaje}</p>
                        </td>
                        <td className="p-5 text-center">
                          <span
                            className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border ${getBadgeStyle(
                              t.estado || 'Pendiente'
                            )}`}
                          >
                            {t.estado || 'Pendiente'}
                          </span>
                        </td>
                        <td className="p-5 pr-8">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => abrirModalEditar(t)}
                              className="bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                              title="Gestionar Ticket"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleEliminarTicket(t.id)}
                              className="bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL GESTIONAR TICKET (SOLO ADMIN) */}
      {isAdmin && isModalOpen && ticketEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl border border-slate-700 my-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-black text-white">Gestionar Ticket #{ticketEditando.id}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <div className="p-6 bg-slate-950/50">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                RUT Socio / Correo:
              </p>
              <p className="text-sm text-white font-bold mb-4">{ticketEditando.usuario_rut}</p>

              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Asunto:</p>
              <p className="text-sm text-indigo-400 font-bold mb-4">{ticketEditando.asunto}</p>

              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Mensaje Original:
              </p>
              <p className="text-sm text-slate-300 mb-2 p-4 bg-slate-900 border border-slate-800 rounded-xl leading-relaxed">
                {ticketEditando.mensaje}
              </p>
            </div>

            <form onSubmit={handleActualizarTicket} className="p-6 space-y-5 border-t border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Estado del Ticket
                  </label>
                  <select
                    value={nuevoEstado}
                    onChange={(e) => setNuevoEstado(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Revisión">En Revisión</option>
                    <option value="Resuelto">Resuelto</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Respuesta (Visible para el socio)
                  </label>
                  <textarea
                    rows={4}
                    value={respuestaAdmin}
                    onChange={(e) => setRespuestaAdmin(e.target.value)}
                    placeholder="Escribe la solución o respuesta al socio..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 text-white font-bold py-3.5 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actualizando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-indigo-900/20 text-sm"
                >
                  {actualizando ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}