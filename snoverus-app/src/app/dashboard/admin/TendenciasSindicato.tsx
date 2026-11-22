'use client';

/**
 * Tendencias del sindicato (panel del Presidente, pestaña "Totales & Estadísticas").
 *
 * Usa las funciones de la migración 002 (reporte_*). Cada función revisa en la base
 * quién la llama y solo devuelve datos de su sindicato; el superadmin puede pedir
 * otro sindicato con p_sindicato_id.
 *
 * Colores de los gráficos: azul / naranja / verde validados para modo oscuro sobre
 * el fondo #131c2e (distinguibles también con daltonismo).
 */

import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { createClient } from '../../lib/supabase';

// ---------------------------------------------------------------------------
// Tipos que devuelven las funciones de la base
// ---------------------------------------------------------------------------
interface Resumen {
  socios_activos: number;
  postulaciones_pendientes: number;
  asistencia_promedio: number | null;
  tickets_abiertos: number;
  horas_respuesta_promedio: number | null;
  participacion_encuestas: number | null;
}
interface SociosMes { mes: string; etiqueta: string; socios: number; nuevos: number }
interface AsistenciaAsamblea {
  asamblea_id: number; titulo: string; fecha: string;
  asistentes: number; padron: number; porcentaje: number;
}
interface PostulacionesMes { mes: string; etiqueta: string; aprobadas: number; rechazadas: number; pendientes: number }
interface ParticipacionEncuesta {
  encuesta_id: number; titulo: string; fecha: string;
  votantes: number; padron: number; porcentaje: number;
}
interface TicketsMes {
  mes: string; etiqueta: string; pendientes: number; en_revision: number;
  resueltos: number; horas_respuesta_promedio: number | null;
}

interface Props {
  sindicatoId: number | null;
}

// ---------------------------------------------------------------------------
// Estilos compartidos (mismo lenguaje visual del panel)
// ---------------------------------------------------------------------------
const COLORES = {
  serie1: '#3987e5', // azul
  serie2: '#d95926', // naranja
  serie3: '#199e70', // verde
  grilla: '#1e293b',
  eje: '#64748b',
  texto: '#cbd5e1',
};

const QUORUM_PORCENTAJE = 50; // cambiar si el estatuto del sindicato define otro quórum

const tarjeta = 'bg-[#131c2e] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4';
const tituloTarjeta = 'text-sm font-black text-white uppercase tracking-wider';
const subtituloTarjeta = 'text-[11px] text-slate-400';

const ejeProps = {
  stroke: COLORES.eje,
  tick: { fill: COLORES.eje, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: COLORES.grilla },
};

const tooltipProps = {
  contentStyle: {
    backgroundColor: '#0b1220',
    border: '1px solid #334155',
    borderRadius: 12,
    fontSize: 12,
    color: COLORES.texto,
  },
  labelStyle: { color: '#ffffff', fontWeight: 700 },
  cursor: { fill: 'rgba(148, 163, 184, 0.08)' },
};

const formatoFecha = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });

function SinDatos({ texto }: { texto: string }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/80">
      {texto}
    </div>
  );
}

function Indicador({ etiqueta, valor, nota, color }: { etiqueta: string; valor: string; nota: string; color: string }) {
  return (
    <div className="bg-[#131c2e] border border-slate-800 rounded-2xl p-4 shadow-xl">
      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">{etiqueta}</span>
      <div className={`text-2xl sm:text-3xl font-black font-mono mt-1 ${color}`}>{valor}</div>
      <span className="text-[10px] text-slate-400 font-mono mt-1.5 block">{nota}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function TendenciasSindicato({ sindicatoId }: Props) {
  const [meses, setMeses] = useState<3 | 6 | 12>(6);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [socios, setSocios] = useState<SociosMes[]>([]);
  const [asistencia, setAsistencia] = useState<AsistenciaAsamblea[]>([]);
  const [postulaciones, setPostulaciones] = useState<PostulacionesMes[]>([]);
  const [encuestas, setEncuestas] = useState<ParticipacionEncuesta[]>([]);
  const [tickets, setTickets] = useState<TicketsMes[]>([]);

  useEffect(() => {
    if (!sindicatoId) return;
    let cancelado = false;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      const supabase = createClient();
      // p_sindicato_id solo lo usa el superadmin; para la directiva la base usa su propio sindicato
      const sid = { p_sindicato_id: sindicatoId };

      const [rRes, rSoc, rAsi, rPos, rEnc, rTic] = await Promise.all([
        supabase.rpc('reporte_resumen', sid),
        supabase.rpc('reporte_socios_por_mes', { p_meses: meses, ...sid }),
        supabase.rpc('reporte_asistencia_por_asamblea', { p_limite: meses, ...sid }),
        supabase.rpc('reporte_postulaciones_por_mes', { p_meses: meses, ...sid }),
        supabase.rpc('reporte_participacion_encuestas', sid),
        supabase.rpc('reporte_tickets_por_mes', { p_meses: meses, ...sid }),
      ]);

      if (cancelado) return;

      const primerError = [rRes, rSoc, rAsi, rPos, rEnc, rTic].find((r) => r.error)?.error;
      if (primerError) {
        console.error('Error cargando tendencias:', primerError);
        setError(primerError.message);
      }

      setResumen(Array.isArray(rRes.data) ? (rRes.data[0] as Resumen) ?? null : null);
      setSocios((rSoc.data as SociosMes[]) ?? []);
      setAsistencia((rAsi.data as AsistenciaAsamblea[]) ?? []);
      setPostulaciones((rPos.data as PostulacionesMes[]) ?? []);
      // las más recientes primero; se muestran hasta 6
      setEncuestas(((rEnc.data as ParticipacionEncuesta[]) ?? []).slice(0, 6));
      setTickets((rTic.data as TicketsMes[]) ?? []);
      setCargando(false);
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, [sindicatoId, meses]);

  const asistenciaGrafico = asistencia.map((a) => ({ ...a, fechaCorta: formatoFecha(a.fecha) }));
  const hayPostulaciones = postulaciones.some((p) => p.aprobadas + p.rechazadas + p.pendientes > 0);
  const hayTickets = tickets.some((t) => t.pendientes + t.en_revision + t.resueltos > 0);

  return (
    <section className="space-y-6 pt-2">
      {/* Encabezado + filtro de período */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Tendencias del Sindicato</h2>
          <p className="text-xs text-slate-400 mt-1">
            Evolución mes a mes. Los porcentajes se calculan contra los socios que había en cada fecha.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/70 border border-slate-800 rounded-xl p-1">
          {([3, 6, 12] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMeses(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                meses === m ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              {m} meses
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs">
          No se pudieron cargar algunas tendencias: {error}
        </div>
      )}

      {cargando ? (
        <div className="py-16 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Indicadores nuevos (no repiten los de arriba) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Indicador
              etiqueta="Asistencia promedio real"
              valor={resumen?.asistencia_promedio != null ? `${resumen.asistencia_promedio}%` : '—'}
              nota="Últimas 6 asambleas"
              color="text-cyan-400"
            />
            <Indicador
              etiqueta="Participación encuestas"
              valor={resumen?.participacion_encuestas != null ? `${resumen.participacion_encuestas}%` : '—'}
              nota="Promedio últimas 5"
              color="text-emerald-400"
            />
            <Indicador
              etiqueta="Tickets abiertos"
              valor={String(resumen?.tickets_abiertos ?? 0)}
              nota="Pendientes o en revisión"
              color="text-amber-300"
            />
            <Indicador
              etiqueta="Tiempo de cierre"
              valor={resumen?.horas_respuesta_promedio != null ? `${resumen.horas_respuesta_promedio} h` : '—'}
              nota="Promedio hasta finalizar (90 días)"
              color="text-indigo-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Socios por mes */}
            <div className={tarjeta}>
              <div className="border-b border-slate-800 pb-3">
                <h3 className={tituloTarjeta}>Socios por mes</h3>
                <p className={subtituloTarjeta}>Total de socios al cierre de cada mes.</p>
              </div>
              {socios.length === 0 ? (
                <SinDatos texto="Sin datos de socios." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={socios} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={COLORES.grilla} vertical={false} />
                    <XAxis dataKey="etiqueta" {...ejeProps} />
                    <YAxis allowDecimals={false} {...ejeProps} />
                    <Tooltip
                      {...tooltipProps}
                      formatter={(valor: number, _n: string, item: any) => [
                        `${valor} socios (+${item?.payload?.nuevos ?? 0} nuevos)`,
                        'Total',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="socios"
                      stroke={COLORES.serie1}
                      strokeWidth={2}
                      dot={{ r: 4, fill: COLORES.serie1, stroke: '#131c2e', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 2. Asistencia por asamblea */}
            <div className={tarjeta}>
              <div className="border-b border-slate-800 pb-3">
                <h3 className={tituloTarjeta}>Asistencia por asamblea</h3>
                <p className={subtituloTarjeta}>
                  % de socios que registró asistencia. La línea marca el quórum ({QUORUM_PORCENTAJE}%).
                </p>
              </div>
              {asistenciaGrafico.length === 0 ? (
                <SinDatos texto="Aún no hay asambleas con asistencia registrada." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={asistenciaGrafico} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={COLORES.grilla} vertical={false} />
                    <XAxis dataKey="fechaCorta" {...ejeProps} />
                    <YAxis domain={[0, 100]} unit="%" {...ejeProps} />
                    <Tooltip
                      {...tooltipProps}
                      labelFormatter={(_l: string, payload: any[]) => payload?.[0]?.payload?.titulo ?? ''}
                      formatter={(valor: number, _n: string, item: any) => [
                        `${valor}% (${item?.payload?.asistentes} de ${item?.payload?.padron} socios)`,
                        'Asistencia',
                      ]}
                    />
                    <ReferenceLine
                      y={QUORUM_PORCENTAJE}
                      stroke="#94a3b8"
                      strokeDasharray="5 4"
                      label={{ value: 'Quórum', position: 'insideTopRight', fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Bar dataKey="porcentaje" fill={COLORES.serie1} radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 3. Postulaciones por mes */}
            <div className={tarjeta}>
              <div className="border-b border-slate-800 pb-3">
                <h3 className={tituloTarjeta}>Postulaciones por mes</h3>
                <p className={subtituloTarjeta}>Solicitudes de ingreso según su resultado.</p>
              </div>
              {!hayPostulaciones ? (
                <SinDatos texto="No hay postulaciones en este período." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={postulaciones} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={COLORES.grilla} vertical={false} />
                    <XAxis dataKey="etiqueta" {...ejeProps} />
                    <YAxis allowDecimals={false} {...ejeProps} />
                    <Tooltip {...tooltipProps} />
                    <Legend wrapperStyle={{ fontSize: 11, color: COLORES.texto }} />
                    <Bar dataKey="aprobadas" name="Aprobadas" stackId="p" fill={COLORES.serie1} maxBarSize={44} />
                    <Bar dataKey="rechazadas" name="Rechazadas" stackId="p" fill={COLORES.serie2} maxBarSize={44} />
                    <Bar dataKey="pendientes" name="Pendientes" stackId="p" fill={COLORES.serie3} radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 4. Tickets por mes */}
            <div className={tarjeta}>
              <div className="border-b border-slate-800 pb-3">
                <h3 className={tituloTarjeta}>Tickets de soporte por mes</h3>
                <p className={subtituloTarjeta}>Consultas de socios según su estado actual.</p>
              </div>
              {!hayTickets ? (
                <SinDatos texto="No hay tickets en este período." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={tickets} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={COLORES.grilla} vertical={false} />
                    <XAxis dataKey="etiqueta" {...ejeProps} />
                    <YAxis allowDecimals={false} {...ejeProps} />
                    <Tooltip
                      {...tooltipProps}
                      labelFormatter={(l: string, payload: any[]) => {
                        const h = payload?.[0]?.payload?.horas_respuesta_promedio;
                        return h != null ? `${l} · cierre promedio ${h} h` : l;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: COLORES.texto }} />
                    <Bar dataKey="resueltos" name="Finalizados" stackId="t" fill={COLORES.serie1} maxBarSize={44} />
                    <Bar dataKey="en_revision" name="En revisión" stackId="t" fill={COLORES.serie2} maxBarSize={44} />
                    <Bar dataKey="pendientes" name="Pendientes" stackId="t" fill={COLORES.serie3} radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* 5. Participación en encuestas (ancho completo) */}
          <div className={tarjeta}>
            <div className="border-b border-slate-800 pb-3">
              <h3 className={tituloTarjeta}>Participación en encuestas</h3>
              <p className={subtituloTarjeta}>% de socios que votó en cada encuesta (las 6 más recientes).</p>
            </div>
            {encuestas.length === 0 ? (
              <SinDatos texto="Aún no hay encuestas en este sindicato." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, encuestas.length * 48)}>
                <BarChart data={encuestas} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={COLORES.grilla} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" {...ejeProps} />
                  <YAxis
                    type="category"
                    dataKey="titulo"
                    width={220}
                    {...ejeProps}
                    tick={{ fill: COLORES.texto, fontSize: 11 }}
                    tickFormatter={(t: string) => (t.length > 34 ? `${t.slice(0, 33)}…` : t)}
                  />
                  <Tooltip
                    {...tooltipProps}
                    formatter={(valor: number, _n: string, item: any) => [
                      `${valor}% (${item?.payload?.votantes} de ${item?.payload?.padron} socios)`,
                      'Participación',
                    ]}
                  />
                  <Bar dataKey="porcentaje" fill={COLORES.serie3} radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </section>
  );
}
