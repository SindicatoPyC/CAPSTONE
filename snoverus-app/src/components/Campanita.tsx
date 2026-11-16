"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "../app/lib/supabase";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function Campanita() {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("socio");
  const [sindicatoId, setSindicatoId] = useState<number | null>(null);
  const [sindicatoUsuario, setSindicatoUsuario] = useState<string>("");
  const [vistasLocales, setVistasLocales] = useState<Record<string, boolean>>({});

  // Paginación interna del menú flotante
  const [paginaActual, setPaginaActual] = useState(1);
  const porPagina = 3;

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    let canalNotif: any = null;
    let canalSindicato: any = null;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMostrarMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const initCampanita = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        setUserId(user.id);

        // Cargar registro local de alertas ya vistas por este usuario
        try {
          const guardadas = localStorage.getItem(`alertas_vistas_${user.id}`);
          if (guardadas) setVistasLocales(JSON.parse(guardadas));
        } catch {
          // Silencioso
        }

        // 1. Obtener perfil y rol del usuario actual
        const { data: profile } = await supabase
          .from("profiles")
          .select("sindicato_id, role")
          .eq("id", user.id)
          .maybeSingle();

        if (!isMounted) return;

        const rolActual = String(profile?.role || "socio").trim().toLowerCase();
        setUserRole(rolActual);

        let targetSindicatoId = profile?.sindicato_id;
        if (rolActual === "superadmin") {
          const cached = localStorage.getItem("sindicato_activo");
          if (cached) targetSindicatoId = Number(cached);
        }

        setSindicatoId(targetSindicatoId || null);

        let nombreSindicato = rolActual === "superadmin" ? "Red Global SaaS" : "Sindicato General";
        if (targetSindicatoId) {
          const { data: sindData } = await supabase
            .from("sindicatos")
            .select("nombre")
            .eq("id", targetSindicatoId)
            .maybeSingle();

          if (sindData?.nombre) {
            nombreSindicato = sindData.nombre;
          }
        }
        if (isMounted) setSindicatoUsuario(nombreSindicato);

        // 2. Cargar todas las fuentes de notificaciones (Tabla + JSONB + Comunicados)
        await cargarNotificaciones(user.id, rolActual, targetSindicatoId);

        // 3. Suscripción en Tiempo Real a tabla 'notificaciones'
        const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        canalNotif = supabase
          .channel(`rt_notif_${user.id}_${uniqueSuffix}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notificaciones",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              if (!isMounted) return;
              setNotificaciones((prev) => {
                if (prev.some((n) => String(n.id) === String(payload.new.id))) return prev;
                return [payload.new, ...prev];
              });
            }
          )
          .subscribe();

        // 4. Suscripción en Tiempo Real a 'sindicatos' (para recibir alertas de socios y solicitudes a SuperAdmin al instante)
        canalSindicato = supabase
          .channel(`rt_sind_alertas_${user.id}_${uniqueSuffix}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "sindicatos",
            },
            () => {
              if (!isMounted) return;
              cargarNotificaciones(user.id, rolActual, targetSindicatoId);
            }
          )
          .subscribe();
      } catch {
        // Silencioso para mantener consola en 0 errores
      }
    };

    initCampanita();

    return () => {
      isMounted = false;
      document.removeEventListener("mousedown", handleClickOutside);
      if (canalNotif) supabase.removeChannel(canalNotif);
      if (canalSindicato) supabase.removeChannel(canalSindicato);
    };
  }, []);

  const cargarNotificaciones = async (
    uid: string,
    rol: string,
    sindId?: number | null
  ) => {
    try {
      const supabase = createClient();
      const listaCombinada: any[] = [];

      // Mapear alertas vistas localmente
      let mapaVistas: Record<string, boolean> = {};
      try {
        const raw = localStorage.getItem(`alertas_vistas_${uid}`);
        if (raw) mapaVistas = JSON.parse(raw);
      } catch {
        // Silencioso
      }

      // FUENTE 1: Tabla 'notificaciones' directa para este user_id
      const { data: notifDirectas, error: errNotif } = await supabase
        .from("notificaciones")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (!errNotif && Array.isArray(notifDirectas)) {
        notifDirectas.forEach((n) => {
          listaCombinada.push({
            ...n,
            leido: Boolean(n.leido || mapaVistas[String(n.id)]),
          });
        });
      }

      // FUENTE 2: Si es SUPERADMIN, leer 'alertas_superadmin' de TODOS los sindicatos
      if (rol === "superadmin") {
        const { data: todosSindicatos } = await supabase
          .from("sindicatos")
          .select("id, nombre, config_ui");

        if (Array.isArray(todosSindicatos)) {
          todosSindicatos.forEach((s) => {
            const alertasSA = s.config_ui?.alertas_superadmin;
            if (Array.isArray(alertasSA)) {
              alertasSA.forEach((alerta: any) => {
                const alertaId = String(alerta.id || `sa-${s.id}-${alerta.postulacion_id}`);
                listaCombinada.push({
                  id: alertaId,
                  tipo: alerta.tipo || "Autorización Directiva",
                  titulo: alerta.titulo || `Solicitud Directiva (${s.nombre})`,
                  mensaje: alerta.mensaje,
                  created_at: alerta.created_at || new Date().toISOString(),
                  leido: Boolean(alerta.leido || mapaVistas[alertaId]),
                  esSolicitudSuperAdmin: true,
                  sindicato_id: s.id,
                });
              });
            }
          });
        }
      }

      // FUENTE 3: Alertas emitidas por el Admin a los socios ('alertas_socios') y Comunicados del sindicato activo
      if (sindId) {
        const [sindRes, comRes] = await Promise.all([
          supabase.from("sindicatos").select("config_ui").eq("id", sindId).maybeSingle(),
          supabase.from("comunicados").select("*").eq("sindicato_id", sindId).limit(8),
        ]);

        const alertasSocios = sindRes.data?.config_ui?.alertas_socios;
        if (Array.isArray(alertasSocios)) {
          alertasSocios.forEach((alerta: any) => {
            // Verificar si es para 'todos' o específicamente para este socio
            if (alerta.destinatario === "todos" || alerta.destinatario === uid) {
              const alertaId = String(alerta.id);
              listaCombinada.push({
                id: alertaId,
                tipo: alerta.tipo || "Aviso Oficial",
                titulo: alerta.titulo,
                mensaje: alerta.mensaje,
                created_at: alerta.created_at || new Date().toISOString(),
                leido: Boolean(alerta.leido || mapaVistas[alertaId]),
              });
            }
          });
        }

        if (Array.isArray(comRes.data)) {
          comRes.data.forEach((c: any) => {
            const comId = `com-${c.id}`;
            listaCombinada.push({
              id: comId,
              tipo: "Comunicado",
              titulo: c.titulo,
              mensaje: c.contenido,
              created_at: c.fecha_creacion || c.created_at || new Date().toISOString(),
              leido: Boolean(mapaVistas[comId]),
            });
          });
        }
      }

      // Eliminar duplicados por título + mensaje y ordenar de más reciente a más antigua
      const unicas: any[] = [];
      const clavesVistas = new Set<string>();

      listaCombinada
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .forEach((item) => {
          const clave = `${item.titulo}-${item.mensaje}`;
          if (!clavesVistas.has(clave)) {
            clavesVistas.add(clave);
            unicas.push(item);
          }
        });

      setNotificaciones(unicas);
    } catch {
      // Silencioso para no ensuciar consola
    }
  };

  const toggleMenu = async () => {
    const nuevoEstado = !mostrarMenu;
    setMostrarMenu(nuevoEstado);

    if (nuevoEstado && userId && notificaciones.some((n) => !n.leido)) {
      // Marcar todas como leídas en estado y en localStorage (inmune a RLS)
      const nuevoMapa: Record<string, boolean> = { ...vistasLocales };
      notificaciones.forEach((n) => {
        nuevoMapa[String(n.id)] = true;
      });
      setVistasLocales(nuevoMapa);
      try {
        localStorage.setItem(`alertas_vistas_${userId}`, JSON.stringify(nuevoMapa));
      } catch {
        // Silencioso
      }

      setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })));

      // Intentar actualizar también en BD si aplica
      try {
        const supabase = createClient();
        await supabase
          .from("notificaciones")
          .update({ leido: true })
          .eq("user_id", userId)
          .eq("leido", false);
      } catch {
        // Silencioso
      }
    }
  };

  // Lógica de Paginación para el menú flotante
  const totalPaginas = Math.ceil(notificaciones.length / porPagina) || 1;
  const indiceUltimo = paginaActual * porPagina;
  const indicePrimero = indiceUltimo - porPagina;
  const notificacionesPaginadas = notificaciones.slice(indicePrimero, indiceUltimo);

  const noLeidasCount = notificaciones.filter((n) => !n.leido).length;

  return (
    <div className="relative" ref={menuRef}>
      {/* Botón de la Campanita */}
      <button 
        onClick={toggleMenu}
        className="relative p-2.5 text-slate-300 hover:text-white transition-all rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 focus:outline-none cursor-pointer shadow-sm group flex items-center justify-center"
        title="Centro de Alertas y Notificaciones"
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
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">{sindicatoUsuario || 'Sindicato General'}</span>
              </div>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-black px-2.5 py-1 rounded-full">
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
                notificacionesPaginadas.map((n) => {
                  const esDirectiva = n.tipo === "Autorización Directiva" || n.esSolicitudSuperAdmin;
                  const esUrgente = n.tipo === "Urgente";

                  return (
                    <div
                      key={n.id}
                      className={`p-3.5 rounded-2xl border transition-all space-y-1.5 ${
                        esDirectiva
                          ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15"
                          : esUrgente
                          ? "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15"
                          : "bg-slate-800/40 border-slate-800/80 hover:bg-slate-800/70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                            esDirectiva
                              ? "text-amber-300 bg-amber-500/20"
                              : esUrgente
                              ? "text-rose-300 bg-rose-500/20"
                              : "text-cyan-400 bg-cyan-500/10"
                          }`}
                        >
                          {n.tipo || "Aviso"}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {n.created_at
                            ? new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-white tracking-tight">{n.titulo}</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium line-clamp-3">
                        {n.mensaje || n.contenido}
                      </p>

                      {esDirectiva && userRole === "superadmin" && (
                        <div className="pt-1.5">
                          <Link
                            href="/superadmin"
                            onClick={() => setMostrarMenu(false)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] uppercase tracking-wider transition-all shadow-sm"
                          >
                            <span>⚡ Ir a Validar Cargo</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })
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
                className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-colors block py-2 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-xl border border-cyan-500/20 shadow-sm"
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