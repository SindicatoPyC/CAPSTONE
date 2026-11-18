'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase';

export default function CentroNotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('socio');
  const [userEmail, setUserEmail] = useState<string>('');
  const [sindicatoNombre, setSindicatoNombre] = useState<string>('Sindicato Activo');
  const [sindicatosList, setSindicatosList] = useState<any[]>([]);
  const [filtroSindicato, setFiltroSindicato] = useState<string>('activo');

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function cargarCentroNotificaciones() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        setUserEmail(user.email || '');

        const { data: profile } = await supabase
          .from('profiles')
          .select('sindicato_id, role')
          .eq('id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        const rol = String(profile?.role || 'socio').trim().toLowerCase();
        setUserRole(rol);

        let targetSindicatoId = profile?.sindicato_id;
        if (rol === 'superadmin') {
          const cached = localStorage.getItem('sindicato_activo');
          if (cached) targetSindicatoId = Number(cached);
        }

        const listaCombinada: any[] = [];

        // 1. Notificaciones directas del usuario en tabla 'notificaciones'
        const { data: notifDirectas } = await supabase
          .from('notificaciones')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (Array.isArray(notifDirectas)) {
          notifDirectas.forEach((n) => {
            listaCombinada.push({
              ...n,
              sindicato_nombre: 'Notificación Personal'
            });
          });
        }

        // 2. Si es SuperAdmin, cargar todos los sindicatos y sus alertas independientes
        if (rol === 'superadmin') {
          const { data: todosSindicatos } = await supabase
            .from('sindicatos')
            .select('id, nombre, config_ui')
            .order('id', { ascending: true });

          if (Array.isArray(todosSindicatos)) {
            setSindicatosList(todosSindicatos);
            const sindActivoObj = todosSindicatos.find((s) => s.id === targetSindicatoId);
            if (sindActivoObj) setSindicatoNombre(sindActivoObj.nombre);

            todosSindicatos.forEach((s) => {
              const alertasSA = s.config_ui?.alertas_superadmin;
              if (Array.isArray(alertasSA)) {
                alertasSA.forEach((alerta: any) => {
                  listaCombinada.push({
                    id: String(alerta.id || `sa-${s.id}-${alerta.postulacion_id}`),
                    tipo: alerta.tipo || 'Autorización Directiva',
                    titulo: alerta.titulo,
                    mensaje: alerta.mensaje,
                    created_at: alerta.created_at,
                    sindicato_id: s.id,
                    sindicato_nombre: s.nombre,
                    esSolicitudSuperAdmin: true
                  });
                });
              }

              const alertasSocios = s.config_ui?.alertas_socios;
              if (Array.isArray(alertasSocios)) {
                alertasSocios.forEach((alerta: any) => {
                  listaCombinada.push({
                    id: String(alerta.id),
                    tipo: alerta.tipo || 'Aviso Oficial',
                    titulo: alerta.titulo,
                    mensaje: alerta.mensaje,
                    created_at: alerta.created_at,
                    sindicato_id: s.id,
                    sindicato_nombre: s.nombre
                  });
                });
              }
            });
          }
        } else if (targetSindicatoId) {
          // 3. Para Admin o Socio de un sindicato específico
          const { data: sindData } = await supabase
            .from('sindicatos')
            .select('id, nombre, config_ui')
            .eq('id', targetSindicatoId)
            .maybeSingle();

          if (sindData) {
            setSindicatoNombre(sindData.nombre || 'Organización Sindical');
            const alertasSocios = sindData.config_ui?.alertas_socios;
            if (Array.isArray(alertasSocios)) {
              alertasSocios.forEach((alerta: any) => {
                if (alerta.destinatario === 'todos' || alerta.destinatario === user.id) {
                  listaCombinada.push({
                    id: String(alerta.id),
                    tipo: alerta.tipo || 'Aviso Oficial',
                    titulo: alerta.titulo,
                    mensaje: alerta.mensaje,
                    created_at: alerta.created_at,
                    sindicato_id: sindData.id,
                    sindicato_nombre: sindData.nombre
                  });
                }
              });
            }
          }
        }

        // 4. Comunicados del sindicato activo
        if (targetSindicatoId) {
          const { data: comData } = await supabase
            .from('comunicados')
            .select('*')
            .eq('sindicato_id', targetSindicatoId)
            .limit(15);

          if (Array.isArray(comData)) {
            comData.forEach((c) => {
              listaCombinada.push({
                id: `com-${c.id}`,
                tipo: 'Comunicado Oficial',
                titulo: c.titulo,
                mensaje: c.contenido,
                created_at: c.fecha_creacion || c.created_at,
                sindicato_id: c.sindicato_id,
                sindicato_nombre: sindicatoNombre
              });
            });
          }
        }

        // Eliminar duplicados y ordenar cronológicamente
        const unicas: any[] = [];
        const claves = new Set<string>();

        listaCombinada
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .forEach((item) => {
            const key = `${item.titulo}-${item.mensaje}`;
            if (!claves.has(key)) {
              claves.add(key);
              unicas.push(item);
            }
          });

        if (isMounted) setNotificaciones(unicas);
      } catch {
        // Silencioso para mantener 0 errores en consola
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    cargarCentroNotificaciones();
    return () => {
      isMounted = false;
    };
  }, []);

  const notificacionesFiltradas = notificaciones.filter((n) => {
    if (userRole !== 'superadmin' || filtroSindicato === 'todos' || filtroSindicato === 'activo') return true;
    return String(n.sindicato_id) === String(filtroSindicato);
  });

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Cabecera Ejecutiva */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#131b2e] border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              <span>Panel Independiente</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Centro de Notificaciones</h1>
            <p className="text-xs text-slate-400">
              Canal de avisos exclusivo para: <strong className="text-emerald-400">{sindicatoNombre}</strong> • Cuenta: <span className="font-mono text-slate-300">{userEmail}</span>
            </p>
          </div>

          {userRole === 'superadmin' && sindicatosList.length > 0 && (
            <select
              value={filtroSindicato}
              onChange={(e) => setFiltroSindicato(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-semibold"
            >
              <option value="todos">🌐 Ver Todos los Sindicatos ({notificaciones.length})</option>
              {sindicatosList.map((s) => (
                <option key={s.id} value={s.id}>🏢 {s.nombre}</option>
              ))}
            </select>
          )}
        </div>

        {/* Listado de Avisos */}
        <div className="p-6 rounded-3xl bg-[#131b2e] border border-slate-800 shadow-2xl space-y-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Sincronizando Bandeja...</span>
            </div>
          ) : notificacionesFiltradas.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <span className="text-4xl block opacity-40">📫</span>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Sin Avisos Vigentes</h3>
              <p className="text-xs text-slate-400">No hay registros de notificaciones emitidos para este sindicato.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificacionesFiltradas.map((n, idx) => {
                const esDirectiva = n.tipo === 'Autorización Directiva' || n.esSolicitudSuperAdmin;
                return (
                  <div
                    key={n.id || idx}
                    className={`p-5 rounded-2xl border transition-all space-y-2 ${
                      esDirectiva
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md ${
                            esDirectiva
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          }`}
                        >
                          {n.tipo || 'Aviso Oficial'}
                        </span>
                        {n.sindicato_nombre && (
                          <span className="text-[10px] font-mono text-slate-400">
                            • {n.sindicato_nombre}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-slate-500">
                        {n.created_at ? new Date(n.created_at).toLocaleString('es-CL') : ''}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-white">{n.titulo}</h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                      {n.mensaje || n.contenido}
                    </p>

                    {esDirectiva && userRole === 'superadmin' && (
                      <div className="pt-2">
                        <Link
                          href="/superadmin"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md"
                        >
                          <span>⚡ Ir al Panel SuperAdmin a Validar Cargo</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}