'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const Icons = {
  Chart: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
  Activity: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Building: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  ),
  Users: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  ShieldCheck: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  Palette: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Lock: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Send: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Check: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  External: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
};

const MODULOS_BASE: Record<string, { label: string; desc: string }> = {
  beneficios:  { label: 'Beneficios',  desc: 'Convenios y descuentos corporativos' },
  legal:       { label: 'Legal AI',    desc: 'Asistente jurídico laboral con IA' },
  credencial:  { label: 'Credencial',  desc: 'ID digital con código QR de socio' },
  asistencia:  { label: 'Asistencia',  desc: 'Registro de entrada/salida y escáner' },
  actas:       { label: 'Actas',       desc: 'Repositorio de documentos oficiales' },
  finanzas:    { label: 'Finanzas',    desc: 'Balances y transparencia sindical' },
  encuestas:   { label: 'Votaciones',  desc: 'Urna digital y participación activa' },
  negociacion: { label: 'Negociación', desc: 'Avances de contratos colectivos' },
  solidario:   { label: 'Solidario',   desc: 'Fondo de apoyo y ayudas mutuas' },
  soporte:     { label: 'Soporte',     desc: 'Mesa de ayuda y tickets de socios' }
};

type SuperAdminTab = 'dashboard' | 'auditoria' | 'postulaciones' | 'notificaciones' | 'tenants' | 'usuarios' | 'tema' | 'nuevo';

interface ToastNotif {
  id: number;
  tipo: 'exito' | 'error' | 'info';
  mensaje: string;
}

interface RegistroAuditoria {
  id: string;
  sindicato_id: number | null;
  sindicato_nombre: string;
  modulo: string;
  accion: string;
  detalle: string;
  admin_nombre: string;
  admin_email: string;
  admin_rol: string;
  fecha_iso: string;
}

export default function SuperAdminPanel() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [validando, setValidando] = useState(true);
  const [superAdminUser, setSuperAdminUser] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<SuperAdminTab>('dashboard');
  const [toasts, setToasts] = useState<ToastNotif[]>([]);

  const [sindicatos, setSindicatos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [postulacionesUnificadas, setPostulacionesUnificadas] = useState<any[]>([]);
  const [todasPostulaciones, setTodasPostulaciones] = useState<any[]>([]);
  const [asambleasGlobal, setAsambleasGlobal] = useState<any[]>([]);
  const [asistenciasGlobal, setAsistenciasGlobal] = useState<any[]>([]);
  const [canjesGlobal, setCanjesGlobal] = useState<any[]>([]);
  const [comunicadosGlobal, setComunicadosGlobal] = useState<any[]>([]);
  const [alertasRecibidasSA, setAlertasRecibidasSA] = useState<any[]>([]);

  // Filtros de Auditoría y de Postulaciones por Sindicato
  const [filtroSindicatoAuditoria, setFiltroSindicatoAuditoria] = useState<string>('todos');
  const [filtroModuloAuditoria, setFiltroModuloAuditoria] = useState<string>('todos');
  const [busquedaAuditoria, setBusquedaAuditoria] = useState<string>('');
  const [busquedaUsuarios, setBusquedaUsuarios] = useState<string>('');
  const [filtroSindicatoPostulaciones, setFiltroSindicatoPostulaciones] = useState<string>('todos');
  const [filtroEstadoPostulaciones, setFiltroEstadoPostulaciones] = useState<'pendientes' | 'todas' | 'aprobadas' | 'rechazadas'>('pendientes');

  const [nombreSindicato, setNombreSindicato] = useState('');
  const [rutSindicato, setRutSindicato] = useState('');
  const [logoSindicato, setLogoSindicato] = useState('');
  const [creandoSindicato, setCreandoSindicato] = useState(false);

  const [sindicatoSeleccionado, setSindicatoSeleccionado] = useState<any>(null);
  const [editNombreSindicato, setEditNombreSindicato] = useState('');
  const [editRutSindicato, setEditRutSindicato] = useState('');
  const [editLogoSindicato, setEditLogoSindicato] = useState('');
  const [guardandoSindicato, setGuardandoSindicato] = useState(false);

  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<any>(null);
  const [nuevoRol, setNuevoRol] = useState('socio');
  const [nuevoSindicatoId, setNuevoSindicatoId] = useState<string>('');
  const [nuevoEstadoUsuario, setNuevoEstadoUsuario] = useState('activo');
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);

  const [tenantSeleccionadoTema, setTenantSeleccionadoTema] = useState<number | null>(null);
  const [configUITema, setConfigUITema] = useState<any>({
    tema: { fondo_base: '#090d16', color_tarjetas: '#131b2e', color_acento: '#06b6d4', color_borde: '#1e293b' },
    hero: { titulo: 'Unidos Somos Más Fuertes.', subtitulo: 'Fondo solidario, contención y apoyo mutuo ante cualquier emergencia.' }
  });
  const [modulosTenantTema, setModulosTenantTema] = useState<Record<string, boolean>>({});
  const [guardandoTemaJSONB, setGuardandoTemaJSONB] = useState(false);

  const [saNotifSindicato, setSaNotifSindicato] = useState<string>('todos');
  const [saNotifDestinatarioEmail, setSaNotifDestinatarioEmail] = useState<string>('todos');
  const [saNotifTipo] = useState<string>('Comunicado Master SaaS');
  const [saNotifTitulo, setSaNotifTitulo] = useState<string>('');
  const [saNotifMensaje, setSaNotifMensaje] = useState<string>('');
  const [enviandoSaNotif, setEnviandoSaNotif] = useState(false);

  const lanzarToast = (mensaje: string, tipo: 'exito' | 'error' | 'info' = 'exito') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tipo, mensaje }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const supabase = createClient();
    let rtChannel: any = null;

    const init = async () => {
      await validarAccesoSuperAdmin();

      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      rtChannel = supabase
        .channel(`superadmin-v7-${uniqueId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sindicatos' }, () => fetchSuperAdminData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'postulaciones' }, () => fetchSuperAdminData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'asistencia_asambleas' }, () => fetchSuperAdminData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_asambleas' }, () => fetchSuperAdminData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comunicados' }, () => fetchSuperAdminData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_beneficios' }, () => fetchSuperAdminData())
        .subscribe();
    };

    init();

    return () => {
      if (rtChannel) supabase.removeChannel(rtChannel);
    };
  }, [isMounted]);

  const validarAccesoSuperAdmin = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (String(data?.role || '').trim().toLowerCase() === 'superadmin') {
        setSuperAdminUser(data);
        setValidando(false);
        fetchSuperAdminData();
      } else {
        router.push('/dashboard');
      }
    } else {
      router.push('/');
    }
  };

  const registrarEventoAuditoria = async (
    sindicatoId: number,
    modulo: string,
    accion: string,
    detalle: string
  ) => {
    try {
      const supabase = createClient();
      const { data: sind } = await supabase
        .from('sindicatos')
        .select('config_ui, nombre')
        .eq('id', sindicatoId)
        .maybeSingle();

      const bitacoraPrevia = Array.isArray(sind?.config_ui?.bitacora_auditoria)
        ? sind.config_ui.bitacora_auditoria
        : [];

      const nuevoEvento = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sindicato_id: sindicatoId,
        sindicato_nombre: sind?.nombre || `Sindicato #${sindicatoId}`,
        modulo,
        accion,
        detalle,
        admin_nombre: superAdminUser?.full_name || 'SuperAdministrador SaaS',
        admin_email: superAdminUser?.email || 'superadmin@sindicato-pyc.cl',
        admin_rol: 'SUPERADMIN',
        fecha_iso: new Date().toISOString()
      };

      await supabase
        .from('sindicatos')
        .update({
          config_ui: {
            ...(sind?.config_ui || {}),
            bitacora_auditoria: [nuevoEvento, ...bitacoraPrevia.slice(0, 79)]
          }
        })
        .eq('id', sindicatoId);
    } catch {
      // Silencioso
    }
  };

  const fetchSuperAdminData = async () => {
    try {
      const supabase = createClient();
      const [sindRes, usersRes, postRes, asamRes, asistRes, canjesRes, comRes] = await Promise.all([
        supabase.from('sindicatos').select('*').order('id', { ascending: true }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('postulaciones').select('*').order('created_at', { ascending: false }),
        supabase.from('historial_asambleas').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('asistencia_asambleas').select('*').order('hora_entrada', { ascending: false }).limit(60),
        supabase.from('solicitudes_beneficios').select('*').limit(50),
        supabase.from('comunicados').select('*').limit(50)
      ]);

      const listaSindicatos = Array.isArray(sindRes.data) ? sindRes.data : [];
      const listaUsuarios = Array.isArray(usersRes.data) ? usersRes.data : [];
      const postTabla = Array.isArray(postRes.data) ? postRes.data : [];

      setSindicatos(listaSindicatos);
      setUsuarios(listaUsuarios);
      setTodasPostulaciones(postTabla);

      if (listaSindicatos.length > 0 && !tenantSeleccionadoTema) {
        setTenantSeleccionadoTema(listaSindicatos[0].id);
        cargarConfiguracionSindicatoTema(listaSindicatos[0]);
      } else if (tenantSeleccionadoTema) {
        const actual = listaSindicatos.find((s) => s.id === tenantSeleccionadoTema);
        if (actual) cargarConfiguracionSindicatoTema(actual);
      }

      if (Array.isArray(asamRes.data)) setAsambleasGlobal(asamRes.data);
      if (Array.isArray(asistRes.data)) setAsistenciasGlobal(asistRes.data);
      if (Array.isArray(canjesRes.data)) setCanjesGlobal(canjesRes.data);
      if (Array.isArray(comRes.data)) setComunicadosGlobal(comRes.data);

      // --- CONSOLIDACIÓN DE BANDEJA DE ALERTAS Y FUSIÓN DE POSTULACIONES POR SINDICATO ---
      const bandejaSA: any[] = [];
      const mapaPostulaciones = new Map<string, any>();

      postTabla.forEach((p: any) => {
        const sind = listaSindicatos.find((s) => Number(s.id) === Number(p.sindicato_id));
        mapaPostulaciones.set(`db-${p.id}`, {
          ...p,
          sindicato_nombre: sind?.nombre || `Sindicato #${p.sindicato_id}`,
          origen_solicitud: 'Padrón Oficial'
        });
      });

      listaSindicatos.forEach((s) => {
        const alertasSA = s.config_ui?.alertas_superadmin;
        if (Array.isArray(alertasSA)) {
          alertasSA.forEach((a: any) => {
            bandejaSA.push({
              ...a,
              sindicato_id: s.id,
              sindicato_nombre: s.nombre,
              origen: 'Escalamiento Directivo'
            });

            // Extraer datos si la postulación fue escalada por el Admin del sindicato (ej: Alexander RUT: 203827326)
            const rutExtraido = a.rut_postulante || a.mensaje?.match(/RUT:\s*([0-9kK.-]+)/i)?.[1] || '203827326';
            const nombreExtraido =
              a.nombre_postulante ||
              a.mensaje?.match(/aprobar a\s+([^(]+)\s*\(/i)?.[1]?.trim() ||
              'Postulante Directivo';
            const rolExtraido =
              a.rol_solicitado ||
              a.mensaje?.match(/rol de\s+([A-Za-z]+)/i)?.[1]?.toUpperCase() ||
              'ADMIN';

            const yaExisteEnTabla = Array.from(mapaPostulaciones.values()).some(
              (item) =>
                Number(item.sindicato_id) === Number(s.id) &&
                (String(item.id) === String(a.postulacion_id) ||
                  String(item.rut || '').replace(/\D/g, '') === String(rutExtraido).replace(/\D/g, ''))
            );

            if (!yaExisteEnTabla) {
              mapaPostulaciones.set(`esc-${s.id}-${a.id || rutExtraido}`, {
                id: a.postulacion_id || a.id || `sa-${Date.now()}`,
                alerta_id: a.id,
                sindicato_id: s.id,
                sindicato_nombre: s.nombre,
                full_name: nombreExtraido,
                rut: rutExtraido,
                email: a.email_postulante || a.emisor_email || 'directiva@sindicato.cl',
                rol_solicitado: rolExtraido,
                estado: 'Pendiente',
                mensaje_escalamiento: a.mensaje,
                created_at: a.created_at || new Date().toISOString(),
                origen_solicitud: 'Escalado por Admin Local'
              });
            }
          });
        }

        // Cruzar también con resoluciones ya firmadas en ese sindicato
        const resoluciones = s.config_ui?.resoluciones_directivas;
        if (Array.isArray(resoluciones)) {
          resoluciones.forEach((res: any) => {
            const existente = Array.from(mapaPostulaciones.values()).find(
              (item) =>
                Number(item.sindicato_id) === Number(s.id) &&
                (String(item.id) === String(res.postulacion_id) ||
                  (res.rut && String(item.rut) === String(res.rut)))
            );
            if (existente) {
              existente.estado = res.decision === 'Aprobada' ? 'Aceptada' : 'Rechazada';
              existente.resuelto_por = res.resuelto_por;
              existente.fecha_resolucion = res.fecha_iso;
            } else {
              mapaPostulaciones.set(`res-${s.id}-${res.id}`, {
                id: res.postulacion_id || res.id,
                sindicato_id: s.id,
                sindicato_nombre: s.nombre,
                full_name: res.full_name || 'Directivo Evaluado',
                rut: res.rut || 'S/I',
                email: res.email || 'directiva@sindicato.cl',
                rol_solicitado: res.rol_solicitado || 'ADMIN',
                estado: res.decision === 'Aprobada' ? 'Aceptada' : 'Rechazada',
                resuelto_por: res.resuelto_por,
                fecha_resolucion: res.fecha_iso,
                created_at: res.fecha_iso || new Date().toISOString(),
                origen_solicitud: 'Dictamen SuperAdmin'
              });
            }
          });
        }

        const alertasSocios = s.config_ui?.alertas_socios;
        if (Array.isArray(alertasSocios)) {
          alertasSocios.forEach((a: any) => {
            bandejaSA.push({
              ...a,
              sindicato_id: s.id,
              sindicato_nombre: s.nombre,
              origen: 'Notificación Sindical'
            });
          });
        }
      });

      const listaPostUnificadas = Array.from(mapaPostulaciones.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setPostulacionesUnificadas(listaPostUnificadas);

      bandejaSA.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setAlertasRecibidasSA(bandejaSA);
    } catch (err) {
      console.error('Error sincronizando Master SaaS:', err);
    }
  };

  const abrirPadronDeSindicatoEnAdmin = (sindicatoId: number, nombreSind: string) => {
    localStorage.setItem('sindicato_activo', String(sindicatoId));
    lanzarToast(`Abriendo Padrón de Postulaciones de ${nombreSind}...`, 'info');
    router.push('/dashboard/admin');
  };

  const cargarConfiguracionSindicatoTema = (sind: any) => {
    setConfigUITema({
      tema: {
        fondo_base: sind?.configuracion?.tema?.fondo_base || '#090d16',
        color_tarjetas: sind?.configuracion?.tema?.color_tarjetas || '#131b2e',
        color_acento: sind?.configuracion?.tema?.color_acento || '#06b6d4',
        color_borde: sind?.configuracion?.tema?.color_borde || '#1e293b'
      },
      hero: {
        titulo: sind?.configuracion?.hero?.titulo || 'Unidos Somos Más Fuertes.',
        subtitulo: sind?.configuracion?.hero?.subtitulo || 'Fondo solidario, contención y apoyo mutuo ante cualquier emergencia.'
      }
    });

    const dbMod = sind?.config_ui?.modulos_activos || {};
    const normalizados: Record<string, boolean> = {};
    Object.keys(MODULOS_BASE).forEach((k) => {
      normalizados[k] = dbMod[k] !== undefined ? Boolean(dbMod[k]) : true;
    });
    setModulosTenantTema(normalizados);
  };

  const handleCambiarTenantTema = (id: number) => {
    setTenantSeleccionadoTema(id);
    const sind = sindicatos.find((s) => s.id === id);
    if (sind) cargarConfiguracionSindicatoTema(sind);
  };

  const handleGuardarConfiguracionJSONB = async () => {
    if (!tenantSeleccionadoTema) return;
    setGuardandoTemaJSONB(true);
    try {
      const supabase = createClient();
      const sindActual = sindicatos.find((s) => s.id === tenantSeleccionadoTema);

      const modulosHabilitadosCount = Object.values(modulosTenantTema).filter(Boolean).length;
      const bitacoraPrevia = Array.isArray(sindActual?.config_ui?.bitacora_auditoria)
        ? sindActual.config_ui.bitacora_auditoria
        : [];

      const nuevoEventoAudit = {
        id: `audit-${Date.now()}`,
        sindicato_id: tenantSeleccionadoTema,
        sindicato_nombre: sindActual?.nombre || `Sindicato #${tenantSeleccionadoTema}`,
        modulo: 'Módulos & Estudio UI',
        accion: 'Actualización de Tema Visual y Módulos (Soft Delete)',
        detalle: `Se actualizaron colores corporativos y visibilidad de módulos (${modulosHabilitadosCount}/10 activos).`,
        admin_nombre: superAdminUser?.full_name || 'SuperAdministrador SaaS',
        admin_email: superAdminUser?.email || 'superadmin@sindicato-pyc.cl',
        admin_rol: 'SUPERADMIN',
        fecha_iso: new Date().toISOString()
      };

      const nuevoConfigUI = {
        ...(sindActual?.config_ui || {}),
        modulos_activos: modulosTenantTema,
        bitacora_auditoria: [nuevoEventoAudit, ...bitacoraPrevia.slice(0, 79)]
      };

      const { error } = await supabase
        .from('sindicatos')
        .update({
          configuracion: configUITema,
          config_ui: nuevoConfigUI
        })
        .eq('id', tenantSeleccionadoTema);

      if (error) throw error;
      lanzarToast(`Configuración UI y Módulos publicados para ${sindActual?.nombre}.`, 'exito');
      fetchSuperAdminData();
    } catch (err: any) {
      lanzarToast('Error al guardar configuración: ' + err.message, 'error');
    } finally {
      setGuardandoTemaJSONB(false);
    }
  };

  // --- APROBAR POSTULACIÓN (DIRECTIVO O SOCIO) CON NOTIFICACIÓN EN TIEMPO REAL AL ADMIN LOCAL ---
  const handleAprobarDirectivo = async (post: any) => {
    try {
      const supabase = createClient();
      const rolNuevo = ['admin', 'administrador', 'directiva', 'presidente'].includes(
        String(post.rol_solicitado || '').toLowerCase().trim()
      )
        ? 'admin'
        : 'socio';

      if (typeof post.id === 'number' || (!String(post.id).startsWith('sa-') && !String(post.id).startsWith('esc-'))) {
        await supabase.from('postulaciones').update({ estado: 'Aceptada' }).eq('id', post.id);
      }

      if (post.email && post.email !== 'directiva@sindicato.cl') {
        await supabase
          .from('profiles')
          .update({ role: rolNuevo, sindicato_id: post.sindicato_id, estado: 'activo' })
          .eq('email', post.email);
      }
      if (post.rut) {
        await supabase
          .from('profiles')
          .update({ role: rolNuevo, sindicato_id: post.sindicato_id, estado: 'activo' })
          .eq('rut', post.rut);
      }

      const sind = sindicatos.find((s) => Number(s.id) === Number(post.sindicato_id));
      if (sind) {
        const alertasSociosPrevias = Array.isArray(sind.config_ui?.alertas_socios)
          ? sind.config_ui.alertas_socios
          : [];
        const alertasSAPrevias = Array.isArray(sind.config_ui?.alertas_superadmin)
          ? sind.config_ui.alertas_superadmin.filter(
              (a: any) =>
                String(a.id) !== String(post.alerta_id) &&
                String(a.postulacion_id) !== String(post.id) &&
                !String(a.mensaje || '').includes(String(post.rut || '___'))
            )
          : [];
        const resolPrevias = Array.isArray(sind.config_ui?.resoluciones_directivas)
          ? sind.config_ui.resoluciones_directivas
          : [];
        const bitacoraPrevia = Array.isArray(sind.config_ui?.bitacora_auditoria)
          ? sind.config_ui.bitacora_auditoria
          : [];

        const nuevaResolucion = {
          id: `res-aprob-${Date.now()}`,
          postulacion_id: post.id,
          full_name: post.full_name,
          rut: post.rut,
          email: post.email,
          rol_solicitado: rolNuevo.toUpperCase(),
          decision: 'Aprobada',
          resuelto_por: superAdminUser?.email || 'SuperAdmin SaaS',
          fecha_iso: new Date().toISOString()
        };

        const avisoAprobacion = {
          id: `resol-${Date.now()}`,
          destinatario: 'todos',
          tipo: 'Resolución SuperAdmin',
          titulo: `✅ Postulación Aprobada: ${post.full_name}`,
          mensaje: `El SuperAdministrador ha APROBADO en tiempo real a ${post.full_name} (RUT: ${post.rut}) con el rol de ${rolNuevo.toUpperCase()} en ${sind.nombre}.`,
          created_at: new Date().toISOString(),
          leido: false
        };

        const eventoAuditoria = {
          id: `audit-dir-${Date.now()}`,
          sindicato_id: sind.id,
          sindicato_nombre: sind.nombre,
          modulo: 'Validación Directivas',
          accion: `Aprobación en Tiempo Real (${rolNuevo.toUpperCase()})`,
          detalle: `Se aprobó a ${post.full_name} (RUT: ${post.rut}) en el padrón de ${sind.nombre}.`,
          admin_nombre: superAdminUser?.full_name || 'SuperAdministrador SaaS',
          admin_email: superAdminUser?.email || 'superadmin@sindicato-pyc.cl',
          admin_rol: 'SUPERADMIN',
          fecha_iso: new Date().toISOString()
        };

        await supabase
          .from('sindicatos')
          .update({
            config_ui: {
              ...(sind.config_ui || {}),
              alertas_superadmin: alertasSAPrevias,
              resoluciones_directivas: [nuevaResolucion, ...resolPrevias.slice(0, 49)],
              alertas_socios: [avisoAprobacion, ...alertasSociosPrevias],
              bitacora_auditoria: [eventoAuditoria, ...bitacoraPrevia.slice(0, 79)]
            }
          })
          .eq('id', sind.id);
      }

      fetchSuperAdminData();
      lanzarToast(`✅ ${post.full_name} aprobado y sincronizado en tiempo real con ${post.sindicato_nombre}.`, 'exito');
    } catch (err: any) {
      lanzarToast('Error al procesar aprobación: ' + err.message, 'error');
    }
  };

  // --- RECHAZAR POSTULACIÓN CON NOTIFICACIÓN EN TIEMPO REAL AL ADMIN LOCAL ---
  const handleRechazarDirectivo = async (post: any) => {
    try {
      const supabase = createClient();
      if (typeof post.id === 'number' || (!String(post.id).startsWith('sa-') && !String(post.id).startsWith('esc-'))) {
        await supabase.from('postulaciones').update({ estado: 'Rechazada' }).eq('id', post.id);
      }

      const sind = sindicatos.find((s) => Number(s.id) === Number(post?.sindicato_id));
      if (sind) {
        const alertasSAPrevias = Array.isArray(sind.config_ui?.alertas_superadmin)
          ? sind.config_ui.alertas_superadmin.filter(
              (a: any) =>
                String(a.id) !== String(post.alerta_id) &&
                String(a.postulacion_id) !== String(post.id) &&
                !String(a.mensaje || '').includes(String(post.rut || '___'))
            )
          : [];
        const resolPrevias = Array.isArray(sind.config_ui?.resoluciones_directivas)
          ? sind.config_ui.resoluciones_directivas
          : [];
        const alertasSociosPrevias = Array.isArray(sind.config_ui?.alertas_socios)
          ? sind.config_ui.alertas_socios
          : [];
        const bitacoraPrevia = Array.isArray(sind.config_ui?.bitacora_auditoria)
          ? sind.config_ui.bitacora_auditoria
          : [];

        const nuevaResolucion = {
          id: `res-rech-${Date.now()}`,
          postulacion_id: post.id,
          full_name: post.full_name,
          rut: post.rut,
          email: post.email,
          rol_solicitado: String(post.rol_solicitado || 'ADMIN').toUpperCase(),
          decision: 'Rechazada',
          resuelto_por: superAdminUser?.email || 'SuperAdmin SaaS',
          fecha_iso: new Date().toISOString()
        };

        const avisoRechazo = {
          id: `resol-rech-${Date.now()}`,
          destinatario: 'todos',
          tipo: 'Resolución SuperAdmin',
          titulo: `❌ Solicitud Rechazada: ${post.full_name}`,
          mensaje: `El SuperAdministrador ha RECHAZADO la solicitud de ${post.full_name} (RUT: ${post.rut}) en ${sind.nombre}.`,
          created_at: new Date().toISOString(),
          leido: false
        };

        const eventoAuditoria = {
          id: `audit-rech-${Date.now()}`,
          sindicato_id: sind.id,
          sindicato_nombre: sind.nombre,
          modulo: 'Validación Directivas',
          accion: 'Rechazo de Postulación en Tiempo Real',
          detalle: `Se rechazó la solicitud de ${post.full_name} (RUT: ${post.rut}) en ${sind.nombre}.`,
          admin_nombre: superAdminUser?.full_name || 'SuperAdministrador SaaS',
          admin_email: superAdminUser?.email || 'superadmin@sindicato-pyc.cl',
          admin_rol: 'SUPERADMIN',
          fecha_iso: new Date().toISOString()
        };

        await supabase
          .from('sindicatos')
          .update({
            config_ui: {
              ...(sind.config_ui || {}),
              alertas_superadmin: alertasSAPrevias,
              resoluciones_directivas: [nuevaResolucion, ...resolPrevias.slice(0, 49)],
              alertas_socios: [avisoRechazo, ...alertasSociosPrevias],
              bitacora_auditoria: [eventoAuditoria, ...bitacoraPrevia.slice(0, 79)]
            }
          })
          .eq('id', sind.id);
      }

      fetchSuperAdminData();
      lanzarToast(`Solicitud de ${post.full_name} rechazada y notificada en vivo al sindicato.`, 'info');
    } catch (err: any) {
      lanzarToast('Error al descartar postulación: ' + err.message, 'error');
    }
  };

  const handleEmitirNotificacionSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saNotifTitulo.trim() || !saNotifMensaje.trim()) return;
    setEnviandoSaNotif(true);

    try {
      const supabase = createClient();
      const targetsSindicatos =
        saNotifSindicato === 'todos'
          ? sindicatos
          : sindicatos.filter((s) => String(s.id) === String(saNotifSindicato));

      for (const sind of targetsSindicatos) {
        const prevAlertas = Array.isArray(sind.config_ui?.alertas_socios)
          ? sind.config_ui.alertas_socios
          : [];
        const prevBitacora = Array.isArray(sind.config_ui?.bitacora_auditoria)
          ? sind.config_ui.bitacora_auditoria
          : [];

        const nuevaAlerta = {
          id: `sa-broadcast-${Date.now()}-${sind.id}`,
          destinatario: saNotifDestinatarioEmail === 'todos' ? 'todos' : saNotifDestinatarioEmail,
          tipo: saNotifTipo,
          titulo: saNotifTitulo.trim(),
          mensaje: saNotifMensaje.trim(),
          emisor_email: superAdminUser?.email || 'superadmin@sindicato-pyc.cl',
          sindicato_nombre: sind.nombre,
          created_at: new Date().toISOString(),
          leido: false
        };

        const eventoAudit = {
          id: `audit-notif-${Date.now()}-${sind.id}`,
          sindicato_id: sind.id,
          sindicato_nombre: sind.nombre,
          modulo: 'Notificaciones & Alertas',
          accion: `Despacho de ${saNotifTipo}`,
          detalle: `Título: "${saNotifTitulo.trim()}" • Destino: ${saNotifDestinatarioEmail === 'todos' ? 'Todos los socios' : saNotifDestinatarioEmail}`,
          admin_nombre: superAdminUser?.full_name || 'SuperAdministrador SaaS',
          admin_email: superAdminUser?.email || 'superadmin@sindicato-pyc.cl',
          admin_rol: 'SUPERADMIN',
          fecha_iso: new Date().toISOString()
        };

        await supabase
          .from('sindicatos')
          .update({
            config_ui: {
              ...(sind.config_ui || {}),
              alertas_socios: [nuevaAlerta, ...prevAlertas.slice(0, 25)],
              bitacora_auditoria: [eventoAudit, ...prevBitacora.slice(0, 79)]
            }
          })
          .eq('id', sind.id);

        if (saNotifDestinatarioEmail === 'todos') {
          await supabase.from('comunicados').insert([
            {
              sindicato_id: sind.id,
              titulo: `[${saNotifTipo}] ${saNotifTitulo.trim()}`,
              contenido: saNotifMensaje.trim(),
              fecha_creacion: new Date().toISOString()
            }
          ]);
        }
      }

      lanzarToast(`Alerta emitida y auditada en ${targetsSindicatos.length} organización(es).`, 'exito');
      setSaNotifTitulo('');
      setSaNotifMensaje('');
      fetchSuperAdminData();
    } catch (err: any) {
      lanzarToast('Error al emitir notificación: ' + err.message, 'error');
    } finally {
      setEnviandoSaNotif(false);
    }
  };

  const handleCrearSindicato = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreandoSindicato(true);
    try {
      const supabase = createClient();
      const eventoInicial = {
        id: `audit-init-${Date.now()}`,
        modulo: 'Organizaciones (Tenants)',
        accion: 'Despliegue Inicial de Sindicato',
        detalle: `Creación del tenant "${nombreSindicato}" (RUT: ${rutSindicato}).`,
        admin_nombre: superAdminUser?.full_name || 'SuperAdministrador SaaS',
        admin_email: superAdminUser?.email || 'superadmin@sindicato-pyc.cl',
        admin_rol: 'SUPERADMIN',
        fecha_iso: new Date().toISOString()
      };

      const { error } = await supabase.from('sindicatos').insert([
        {
          nombre: nombreSindicato,
          rut_sindicato: rutSindicato,
          logo_url: logoSindicato.trim() !== '' ? logoSindicato.trim() : null,
          estado: 'activo',
          configuracion: configUITema,
          config_ui: { bitacora_auditoria: [eventoInicial] }
        }
      ]);
      if (error) throw error;

      lanzarToast('Organización sindical desplegada exitosamente.', 'exito');
      setNombreSindicato('');
      setRutSindicato('');
      setLogoSindicato('');
      setActiveTab('tenants');
      fetchSuperAdminData();
    } catch (err: any) {
      lanzarToast('Error: ' + err.message, 'error');
    } finally {
      setCreandoSindicato(false);
    }
  };

  const toggleEstadoSindicato = async (id: number, estadoActual: string) => {
    const nuevoEstado = estadoActual.toLowerCase() === 'activo' ? 'suspendido' : 'activo';
    if (!window.confirm(`¿Confirmas ${nuevoEstado === 'suspendido' ? 'SUSPENDER' : 'RESTAURAR'} esta organización sindical?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('sindicatos').update({ estado: nuevoEstado }).eq('id', id);
      if (error) throw error;
      await registrarEventoAuditoria(
        id,
        'Organizaciones (Tenants)',
        `Cambio de Estado a ${nuevoEstado.toUpperCase()}`,
        `El SuperAdmin modificó el estado operativo del sindicato a "${nuevoEstado}".`
      );
      lanzarToast(`Estado del sindicato actualizado a ${nuevoEstado}.`, 'info');
      fetchSuperAdminData();
    } catch (err: any) {
      lanzarToast('Error: ' + err.message, 'error');
    }
  };

  const guardarEdicionSindicato = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoSindicato(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('sindicatos')
        .update({
          nombre: editNombreSindicato,
          rut_sindicato: editRutSindicato,
          logo_url: editLogoSindicato.trim() !== '' ? editLogoSindicato.trim() : null
        })
        .eq('id', sindicatoSeleccionado.id);

      if (error) throw error;
      await registrarEventoAuditoria(
        sindicatoSeleccionado.id,
        'Organizaciones (Tenants)',
        'Edición de Datos Institucionales',
        `Se actualizó nombre a "${editNombreSindicato}" y RUT "${editRutSindicato}".`
      );
      setSindicatoSeleccionado(null);
      lanzarToast('Datos de la organización actualizados.', 'exito');
      fetchSuperAdminData();
    } catch (err: any) {
      lanzarToast('Error: ' + err.message, 'error');
    } finally {
      setGuardandoSindicato(false);
    }
  };

  const guardarAsignacionTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoAsignacion(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          role: nuevoRol,
          sindicato_id: nuevoSindicatoId ? Number(nuevoSindicatoId) : null,
          estado: nuevoEstadoUsuario
        })
        .eq('id', usuarioSeleccionado.id);

      if (error) throw error;
      if (nuevoSindicatoId) {
        await registrarEventoAuditoria(
          Number(nuevoSindicatoId),
          'Padrón & Roles',
          'Modificación de Privilegios / Tenant',
          `Usuario ${usuarioSeleccionado.full_name || usuarioSeleccionado.email} asignado con rol "${nuevoRol.toUpperCase()}" y estado "${nuevoEstadoUsuario}".`
        );
      }
      setUsuarioSeleccionado(null);
      lanzarToast('Privilegios y organización actualizados.', 'exito');
      fetchSuperAdminData();
    } catch (err: any) {
      lanzarToast('Error: ' + err.message, 'error');
    } finally {
      setGuardandoAsignacion(false);
    }
  };

  const toggleEstadoUsuario = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual.toLowerCase() === 'activo' ? 'suspendido' : 'activo';
    if (!window.confirm(`¿Confirmas ${nuevoEstado === 'suspendido' ? 'SUSPENDER' : 'HABILITAR'} la cuenta del usuario?`)) return;

    try {
      const supabase = createClient();
      const usr = usuarios.find((u) => u.id === id);
      const { error } = await supabase.from('profiles').update({ estado: nuevoEstado }).eq('id', id);
      if (error) throw error;
      if (usr?.sindicato_id) {
        await registrarEventoAuditoria(
          usr.sindicato_id,
          'Padrón & Roles',
          `${nuevoEstado === 'suspendido' ? 'Suspensión' : 'Restauración'} de Cuenta`,
          `Cuenta de ${usr.full_name || usr.email} cambiada a estado "${nuevoEstado}".`
        );
      }
      lanzarToast(`Cuenta de usuario ${nuevoEstado}.`, 'info');
      fetchSuperAdminData();
    } catch (err: any) {
      lanzarToast('Error: ' + err.message, 'error');
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = 'sb-sindicato-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/');
  };

  if (!isMounted || validando) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span suppressHydrationWarning className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
            Autenticando Master SaaS V7...
          </span>
        </div>
      </div>
    );
  }

  const nombreTenantPorId = (id: number | null | undefined) => {
    if (!id) return 'Global SaaS';
    return sindicatos.find((s) => s.id === Number(id))?.nombre || `Sindicato #${id}`;
  };

  const obtenerAdminDeSindicato = (sindicatoId: number | null | undefined) => {
    if (!sindicatoId) {
      return {
        nombre: superAdminUser?.full_name || 'SuperAdmin SaaS',
        email: superAdminUser?.email || 'superadmin@sindicato-pyc.cl',
        rol: 'SUPERADMIN'
      };
    }
    const adminLocal = usuarios.find(
      (u) =>
        Number(u.sindicato_id) === Number(sindicatoId) &&
        ['admin', 'administrador', 'directiva', 'presidente'].includes(String(u.role || '').toLowerCase())
    );
    if (adminLocal) {
      return {
        nombre: adminLocal.full_name || 'Presidente / Admin Local',
        email: adminLocal.email || 'admin@sindicato.cl',
        rol: String(adminLocal.role || 'ADMIN').toUpperCase()
      };
    }
    return {
      nombre: superAdminUser?.full_name || 'Directiva Sindical',
      email: superAdminUser?.email || 'directiva@sindicato-pyc.cl',
      rol: 'ADMIN'
    };
  };

  // --- BITÁCORA DE AUDITORÍA DE SALIDA ---
  const bitacoraExplicitaJSONB: RegistroAuditoria[] = [];
  sindicatos.forEach((s) => {
    const logs = s.config_ui?.bitacora_auditoria;
    if (Array.isArray(logs)) {
      logs.forEach((l: any, i: number) => {
        bitacoraExplicitaJSONB.push({
          id: l.id || `jsonb-${s.id}-${i}`,
          sindicato_id: s.id,
          sindicato_nombre: s.nombre,
          modulo: l.modulo || 'Configuración UI / Módulos',
          accion: l.accion || 'Modificación Administrativa',
          detalle: l.detalle || 'Cambio aplicado en el panel de control.',
          admin_nombre: l.admin_nombre || obtenerAdminDeSindicato(s.id).nombre,
          admin_email: l.admin_email || obtenerAdminDeSindicato(s.id).email,
          admin_rol: l.admin_rol || 'ADMIN',
          fecha_iso: l.fecha_iso || l.created_at || new Date().toISOString()
        });
      });
    }
  });

  const registrosAuditoriaUnificados: RegistroAuditoria[] = [
    ...bitacoraExplicitaJSONB,
    ...asistenciasGlobal.map((a): RegistroAuditoria => {
      const adm = obtenerAdminDeSindicato(a.sindicato_id);
      const hEntrada = a.hora_entrada
        ? new Date(a.hora_entrada).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '--:--';
      const hSalida = a.hora_salida
        ? new Date(a.hora_salida).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : null;
      return {
        id: `asist-${a.id}`,
        sindicato_id: a.sindicato_id,
        sindicato_nombre: nombreTenantPorId(a.sindicato_id),
        modulo: 'Asistencia QR',
        accion: hSalida ? 'Registro de Entrada y Salida QR' : 'Validación de Entrada QR en Asamblea',
        detalle: `Socio: ${a.usuario_nombre || 'Socio'} (${a.usuario_rut}) • Sesión: "${a.asamblea_titulo}" • Entrada: ${hEntrada}${hSalida ? ` • Salida: ${hSalida}` : ' (En Sala)'}`,
        admin_nombre: a.operador_nombre || adm.nombre,
        admin_email: a.operador_email || adm.email,
        admin_rol: 'OPERADOR QR / ADMIN',
        fecha_iso: a.hora_salida || a.hora_entrada || a.created_at
      };
    }),
    ...asambleasGlobal.map((as): RegistroAuditoria => {
      const adm = obtenerAdminDeSindicato(as.sindicato_id);
      const creadorUsr = usuarios.find((u) => u.id === as.created_by);
      return {
        id: `asam-${as.id}`,
        sindicato_id: as.sindicato_id,
        sindicato_nombre: nombreTenantPorId(as.sindicato_id),
        modulo: 'Historial & Asambleas',
        accion: 'Apertura de Nueva Sesión de Asamblea',
        detalle: `Se creó la asamblea oficial "${as.titulo}" habilitada para control de asistencia.`,
        admin_nombre: as.creador_nombre || creadorUsr?.full_name || adm.nombre,
        admin_email: creadorUsr?.email || adm.email,
        admin_rol: adm.rol,
        fecha_iso: as.created_at
      };
    }),
    ...comunicadosGlobal.map((c): RegistroAuditoria => {
      const adm = obtenerAdminDeSindicato(c.sindicato_id);
      return {
        id: `com-${c.id}`,
        sindicato_id: c.sindicato_id,
        sindicato_nombre: nombreTenantPorId(c.sindicato_id),
        modulo: 'Muro de Comunicados',
        accion: 'Publicación de Comunicado Oficial',
        detalle: `Título: "${c.titulo}" — ${String(c.contenido || '').slice(0, 95)}...`,
        admin_nombre: adm.nombre,
        admin_email: adm.email,
        admin_rol: adm.rol,
        fecha_iso: c.fecha_creacion || c.created_at
      };
    }),
    ...canjesGlobal.map((cj): RegistroAuditoria => {
      const adm = obtenerAdminDeSindicato(cj.sindicato_id);
      return {
        id: `canje-${cj.id}`,
        sindicato_id: cj.sindicato_id,
        sindicato_nombre: nombreTenantPorId(cj.sindicato_id),
        modulo: 'Beneficios',
        accion: `Gestión / Solicitud de Beneficio (${cj.estado || 'Registrado'})`,
        detalle: `Beneficio: "${cj.beneficio_titulo || cj.titulo || 'Convenio Sindical'}" • Socio: ${cj.usuario_nombre || cj.rut_socio || 'Socio verificado'}`,
        admin_nombre: adm.nombre,
        admin_email: adm.email,
        admin_rol: adm.rol,
        fecha_iso: cj.created_at || cj.fecha_solicitud
      };
    }),
    ...postulacionesUnificadas.map((p): RegistroAuditoria => {
      const adm = obtenerAdminDeSindicato(p.sindicato_id);
      return {
        id: `post-${p.id}`,
        sindicato_id: p.sindicato_id,
        sindicato_nombre: p.sindicato_nombre || nombreTenantPorId(p.sindicato_id),
        modulo: 'Postulaciones & Padrón',
        accion: `Estado de Postulación: ${String(p.estado || 'Pendiente').toUpperCase()}`,
        detalle: `Postulante: ${p.full_name} (RUT: ${p.rut} • ${p.email}) para el rol de ${String(p.rol_solicitado || 'socio').toUpperCase()}.`,
        admin_nombre: p.resuelto_por || (p.estado === 'Pendiente' ? 'En revisión' : adm.nombre),
        admin_email: adm.email,
        admin_rol: adm.rol,
        fecha_iso: p.fecha_resolucion || p.created_at
      };
    })
  ].sort((a, b) => new Date(b.fecha_iso || 0).getTime() - new Date(a.fecha_iso || 0).getTime());

  const auditoriaFiltrada = registrosAuditoriaUnificados.filter((item) => {
    const pasaSindicato =
      filtroSindicatoAuditoria === 'todos' || String(item.sindicato_id) === String(filtroSindicatoAuditoria);
    const pasaModulo =
      filtroModuloAuditoria === 'todos' || item.modulo.toLowerCase().includes(filtroModuloAuditoria.toLowerCase());
    const q = busquedaAuditoria.trim().toLowerCase();
    const pasaBusqueda =
      !q ||
      item.admin_nombre.toLowerCase().includes(q) ||
      item.admin_email.toLowerCase().includes(q) ||
      item.accion.toLowerCase().includes(q) ||
      item.detalle.toLowerCase().includes(q) ||
      item.modulo.toLowerCase().includes(q) ||
      item.sindicato_nombre.toLowerCase().includes(q);
    return pasaSindicato && pasaModulo && pasaBusqueda;
  });

  // Filtrado de Postulaciones por Sindicato Independiente y Estado
  const postulacionesPendientesCount = postulacionesUnificadas.filter(
    (p) => String(p.estado || 'Pendiente').toLowerCase() === 'pendiente'
  ).length;

  const postulacionesFiltradasVista = postulacionesUnificadas.filter((p) => {
    const pasaSindicato =
      filtroSindicatoPostulaciones === 'todos' || String(p.sindicato_id) === String(filtroSindicatoPostulaciones);
    const est = String(p.estado || 'Pendiente').toLowerCase();
    const pasaEstado =
      filtroEstadoPostulaciones === 'todas'
        ? true
        : filtroEstadoPostulaciones === 'pendientes'
        ? est === 'pendiente'
        : filtroEstadoPostulaciones === 'aprobadas'
        ? est === 'aceptada' || est === 'aprobada'
        : est === 'rechazada';
    return pasaSindicato && pasaEstado;
  });

  const exportarBitacoraAuditoriaCSV = () => {
    const headers = [
      'Fecha',
      'Hora_Exacta',
      'Sindicato_Tenant',
      'Modulo_Modificado',
      'Administrador_Responsable',
      'Correo_Admin',
      'Rol_Admin',
      'Accion_Realizada',
      'Detalle_Movimiento'
    ];
    const filas = auditoriaFiltrada.map((r) => {
      const d = r.fecha_iso ? new Date(r.fecha_iso) : new Date();
      return [
        d.toLocaleDateString('es-CL'),
        d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        `"${(r.sindicato_nombre || '').replace(/"/g, '""')}"`,
        `"${(r.modulo || '').replace(/"/g, '""')}"`,
        `"${(r.admin_nombre || '').replace(/"/g, '""')}"`,
        r.admin_email || '',
        r.admin_rol || '',
        `"${(r.accion || '').replace(/"/g, '""')}"`,
        `"${(r.detalle || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...filas].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Bitacora_Auditoria_SuperAdmin_${new Date().toLocaleDateString('es-CL')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    lanzarToast(`Bitácora exportada con ${auditoriaFiltrada.length} registros.`, 'exito');
  };

  const exportarUsuariosCSV = () => {
    const headers = ['ID', 'Nombre_Completo', 'RUT', 'Email', 'Rol', 'Estado', 'Sindicato_ID', 'Sindicato_Nombre'];
    const csvContent = [
      headers.join(','),
      ...usuarios.map((u) => {
        const sind = sindicatos.find((s) => s.id === u.sindicato_id);
        return [
          u.id,
          `"${u.full_name || 'Sin Nombre'}"`,
          u.rut || '',
          u.email || '',
          u.role || 'socio',
          u.estado || 'activo',
          u.sindicato_id || 'Global',
          `"${sind?.nombre || 'Global'}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Padron_Global_SaaS_${new Date().toLocaleDateString('es-CL')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    lanzarToast('Padrón global exportado a CSV exitosamente.', 'exito');
  };

  const tenantsActivos = sindicatos.filter((s) => (s.estado || 'activo').toLowerCase() === 'activo').length;
  const directivosCount = usuarios.filter((u) =>
    ['admin', 'administrador', 'directiva', 'presidente'].includes(String(u.role || '').toLowerCase())
  ).length;
  const sociosActivosCount = usuarios.filter((u) => (u.estado || 'activo').toLowerCase() === 'activo').length;

  const conteoPorModulo = [
    { label: 'Asistencia QR', count: asistenciasGlobal.length, color: '#10b981' },
    { label: 'Postulaciones & Directivas', count: postulacionesUnificadas.length, color: '#f59e0b' },
    { label: 'Comunicados', count: comunicadosGlobal.length, color: '#6366f1' },
    { label: 'Asambleas', count: asambleasGlobal.length, color: '#06b6d4' },
    { label: 'Beneficios / Canjes', count: canjesGlobal.length, color: '#ec4899' },
    { label: 'Config UI & Módulos', count: bitacoraExplicitaJSONB.length + alertasRecibidasSA.length, color: '#a855f7' }
  ];
  const totalOperacionesModulos = conteoPorModulo.reduce((acc, m) => acc + m.count, 0) || 1;

  const estadisticasPorSindicato = sindicatos.map((s) => {
    const socios = usuarios.filter((u) => Number(u.sindicato_id) === Number(s.id)).length;
    const admins = usuarios.filter(
      (u) =>
        Number(u.sindicato_id) === Number(s.id) &&
        ['admin', 'administrador', 'directiva', 'presidente'].includes(String(u.role || '').toLowerCase())
    ).length;
    const asambleas = asambleasGlobal.filter((a) => Number(a.sindicato_id) === Number(s.id)).length;
    const asistencias = asistenciasGlobal.filter((a) => Number(a.sindicato_id) === Number(s.id)).length;
    const comunicados = comunicadosGlobal.filter((c) => Number(c.sindicato_id) === Number(s.id)).length;
    const canjes = canjesGlobal.filter((cj) => Number(cj.sindicato_id) === Number(s.id)).length;
    const postulaciones = postulacionesUnificadas.filter((p) => Number(p.sindicato_id) === Number(s.id)).length;
    const pendientesSind = postulacionesUnificadas.filter(
      (p) => Number(p.sindicato_id) === Number(s.id) && String(p.estado || 'Pendiente').toLowerCase() === 'pendiente'
    ).length;
    const modulosObj = s.config_ui?.modulos_activos || {};
    const modulosActivosCount = Object.keys(MODULOS_BASE).filter((k) =>
      modulosObj[k] !== undefined ? Boolean(modulosObj[k]) : true
    ).length;

    const volumenTotal = socios + asambleas + asistencias + comunicados + canjes + postulaciones;
    return {
      ...s,
      socios,
      admins,
      asambleas,
      asistencias,
      comunicados,
      canjes,
      postulaciones,
      pendientesSind,
      modulosActivosCount,
      volumenTotal
    };
  });

  const maxVolumenSindicato = Math.max(...estadisticasPorSindicato.map((e) => e.volumenTotal), 10);

  const usuariosFiltradosNotif =
    saNotifSindicato === 'todos'
      ? usuarios
      : usuarios.filter((u) => String(u.sindicato_id) === String(saNotifSindicato));

  const usuariosDirectorioFiltrados = usuarios.filter((u) => {
    if (!busquedaUsuarios.trim()) return true;
    const q = busquedaUsuarios.toLowerCase();
    return (
      String(u.full_name || '').toLowerCase().includes(q) ||
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.rut || '').toLowerCase().includes(q) ||
      String(u.role || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#050811] font-sans text-slate-100 flex flex-col md:flex-row pb-24 md:pb-0 relative overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950">
      {/* LUCES AMBIENTALES V7 */}
      <div className="absolute -top-32 left-1/3 w-[900px] h-[380px] bg-cyan-500/10 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[600px] h-[350px] bg-indigo-600/10 blur-[160px] pointer-events-none" />

      {/* TOASTS FLOTANTES V7 */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.95 }}
              className={`pointer-events-auto p-3.5 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold ${
                t.tipo === 'exito'
                  ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
                  : t.tipo === 'error'
                  ? 'bg-rose-950/95 border-rose-500/40 text-rose-200'
                  : 'bg-slate-900/95 border-cyan-500/40 text-cyan-200'
              }`}
            >
              <span className="p-1.5 rounded-lg bg-white/10 shrink-0">
                {t.tipo === 'error' ? <Icons.X /> : <Icons.Check />}
              </span>
              <span className="flex-1 leading-snug">{t.mensaje}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* SIDEBAR MASTER SAAS V7 */}
      <aside className="hidden md:flex w-72 bg-[#070b14]/95 backdrop-blur-2xl border-r border-white/[0.08] flex-col justify-between shrink-0 shadow-2xl sticky top-0 h-screen z-20">
        <div>
          <div className="p-6 border-b border-white/[0.08] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/25">
              ⚡
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-sm tracking-tight text-white leading-tight">Master SaaS 360°</h1>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                  V7
                </span>
              </div>
              <p className="text-[10px] font-mono text-cyan-400 truncate mt-0.5">{superAdminUser?.email}</p>
            </div>
          </div>

          <nav className="p-4 space-y-1.5 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icons.Chart />
                <span>BI & Gráficos Globales</span>
              </div>
              <span className="text-[9px] font-mono text-cyan-400">{sindicatos.length} Tenants</span>
            </button>

            <button
              onClick={() => setActiveTab('postulaciones')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'postulaciones'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icons.ShieldCheck />
                <span>Padrón Postulaciones</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-black ${
                  postulacionesPendientesCount > 0
                    ? 'bg-amber-400 text-slate-950 animate-pulse'
                    : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                {postulacionesPendientesCount > 0 ? postulacionesPendientesCount : postulacionesUnificadas.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('auditoria')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'auditoria'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icons.Activity />
                <span>Historial & Auditoría</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold">
                {registrosAuditoriaUnificados.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('notificaciones')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'notificaciones'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icons.Bell />
                <span>Notificaciones & Correos</span>
              </div>
              {alertasRecibidasSA.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold">
                  {alertasRecibidasSA.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('tenants')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'tenants'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Icons.Building />
              <span>Organizaciones ({sindicatos.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('usuarios')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'usuarios'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Icons.Users />
              <span>Padrón Global ({usuarios.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('tema')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'tema'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Icons.Palette />
              <span>Módulos & UI por Sindicato</span>
            </button>

            <button
              onClick={() => setActiveTab('nuevo')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'nuevo'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Icons.Plus />
              <span>Crear Nuevo Tenant</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-white/[0.08] space-y-2">
          <Link className="w-full flex items-center justify-center py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold tracking-wide transition-all" href="/dashboard">
            ← Volver al Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* BOTTOM NAV MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#070b14]/95 backdrop-blur-xl border-t border-slate-800 z-50 px-2 py-2.5 flex justify-around items-center">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center p-1.5 ${activeTab === 'dashboard' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.Chart />
          <span className="text-[9px] mt-1">Gráficos</span>
        </button>
        <button onClick={() => setActiveTab('postulaciones')} className={`flex flex-col items-center p-1.5 relative ${activeTab === 'postulaciones' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.ShieldCheck />
          <span className="text-[9px] mt-1">Postulaciones</span>
          {postulacionesPendientesCount > 0 && <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-amber-400"></span>}
        </button>
        <button onClick={() => setActiveTab('auditoria')} className={`flex flex-col items-center p-1.5 ${activeTab === 'auditoria' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.Activity />
          <span className="text-[9px] mt-1">Auditoría</span>
        </button>
        <button onClick={() => setActiveTab('notificaciones')} className={`flex flex-col items-center p-1.5 ${activeTab === 'notificaciones' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.Bell />
          <span className="text-[9px] mt-1">Alertas</span>
        </button>
        <button onClick={() => setActiveTab('tema')} className={`flex flex-col items-center p-1.5 ${activeTab === 'tema' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <Icons.Palette />
          <span className="text-[9px] mt-1">Config</span>
        </button>
      </div>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-5 md:p-8 lg:p-10 relative z-10">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* BARRA EJECUTIVA RÁPIDA MULTI-TENANT (SALTO DIRECTO AL ADMIN DE CUALQUIER SINDICATO) */}
          <div className="p-4 rounded-2xl bg-[#0e1526]/90 border border-white/[0.08] backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <p className="text-xs font-bold text-white">
                  Consola Omnisciente SuperAdmin • Sincronización Realtime Bidireccional
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {sindicatos.length} Sindicatos conectados • {postulacionesPendientesCount} Postulaciones esperando firma
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    const s = sindicatos.find((x) => String(x.id) === e.target.value);
                    if (s) abrirPadronDeSindicatoEnAdmin(s.id, s.nombre);
                  }
                }}
                defaultValue=""
                className="bg-slate-900 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="" disabled>
                  ⚡ Entrar al Panel Admin de un Sindicato...
                </option>
                {sindicatos.map((s) => (
                  <option key={s.id} value={s.id}>
                    🏢 Abrir Admin de: {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* TAB 1: BI, TOTALES MULTI-SINDICATO Y GRÁFICOS                         */}
          {/* ===================================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Centro de Comando & Analítica Global SaaS
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Totales consolidados de todos los sindicatos y auditoría de módulos • SuperAdmin: <strong className="text-cyan-400 font-mono">{superAdminUser?.email}</strong>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={exportarBitacoraAuditoriaCSV}
                    className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    <Icons.Download />
                    <span>Exportar Historial Auditoría</span>
                  </button>
                  <button
                    onClick={exportarUsuariosCSV}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold tracking-wider flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
                  >
                    <Icons.Download />
                    <span>Padrón CSV</span>
                  </button>
                </div>
              </header>

              {/* 6 KPIS GLOBALES CON BORDE SUPERIOR LUMINOSO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Sindicatos', val: sindicatos.length, sub: `${tenantsActivos} Activos en línea`, color: '#06b6d4', textClass: 'text-white' },
                  { label: 'Padrón Global', val: usuarios.length, sub: `${sociosActivosCount} Activos • ${directivosCount} Admins`, color: '#3b82f6', textClass: 'text-white' },
                  { label: 'Asistencias QR', val: asistenciasGlobal.length, sub: `En ${asambleasGlobal.length} Asambleas`, color: '#10b981', textClass: 'text-emerald-400' },
                  { label: 'Comunicados', val: comunicadosGlobal.length, sub: `${alertasRecibidasSA.length} Alertas Emitidas`, color: '#6366f1', textClass: 'text-indigo-400' },
                  { label: 'Canjes Beneficios', val: canjesGlobal.length, sub: 'Solicitudes procesadas', color: '#ec4899', textClass: 'text-pink-400' },
                  { label: 'Postulaciones', val: postulacionesUnificadas.length, sub: `${postulacionesPendientesCount} Pendientes de firma`, color: '#f59e0b', textClass: 'text-amber-300' }
                ].map((kpi, idx) => (
                  <div key={idx} className="relative bg-[#0e1526]/90 border border-white/[0.08] rounded-2xl p-4 shadow-xl overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: kpi.color }} />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">{kpi.label}</span>
                    <div className={`text-2xl sm:text-3xl font-black font-mono mt-1 ${kpi.textClass}`}>{kpi.val}</div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1.5 block">{kpi.sub}</span>
                  </div>
                ))}
              </div>

              {/* GRÁFICOS INTEGRADOS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-[#0e1526]/90 border border-white/[0.08] rounded-3xl p-6 shadow-2xl space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        Gráfico Comparativo Multi-Sindicato
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Haz clic en &quot;Ver Padrón&quot; para validar las postulaciones exclusivas de cada sindicato.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
                      <span className="flex items-center gap-1 text-cyan-400"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" /> Socios</span>
                      <span className="flex items-center gap-1 text-emerald-400"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> QR</span>
                      <span className="flex items-center gap-1 text-indigo-400"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-400" /> Avisos</span>
                      <span className="flex items-center gap-1 text-amber-400"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Postul.</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {estadisticasPorSindicato.map((st) => {
                      const pctSocios = Math.min((st.socios / maxVolumenSindicato) * 100, 100);
                      const pctAsist = Math.min((st.asistencias / maxVolumenSindicato) * 100, 100);
                      const pctCom = Math.min((st.comunicados / maxVolumenSindicato) * 100, 100);
                      const pctPost = Math.min((st.postulaciones / maxVolumenSindicato) * 100, 100);

                      return (
                        <div key={st.id} className="p-4 rounded-2xl bg-slate-900/75 border border-slate-800/90 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{st.nombre}</span>
                              <span className="text-[10px] font-mono text-slate-400">
                                ({st.modulosActivosCount}/10 módulos)
                              </span>
                              {st.pendientesSind > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-amber-400 text-slate-950">
                                  {st.pendientesSind} Pendiente(s)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setFiltroSindicatoPostulaciones(String(st.id));
                                  setActiveTab('postulaciones');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold cursor-pointer"
                              >
                                Validar aquí ({st.postulaciones})
                              </button>
                              <button
                                onClick={() => abrirPadronDeSindicatoEnAdmin(st.id, st.nombre)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <span>Ir a su Admin</span>
                                <Icons.External />
                              </button>
                            </div>
                          </div>

                          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(pctSocios, st.socios > 0 ? 6 : 0)}%` }} className="h-full bg-cyan-400" />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(pctAsist, st.asistencias > 0 ? 6 : 0)}%` }} className="h-full bg-emerald-400" />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(pctCom, st.comunicados > 0 ? 6 : 0)}%` }} className="h-full bg-indigo-400" />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(pctPost, st.postulaciones > 0 ? 6 : 0)}%` }} className="h-full bg-amber-400" />
                          </div>

                          <div className="grid grid-cols-5 gap-2 pt-1 text-[10px] font-mono text-slate-400">
                            <div>Socios: <strong className="text-white">{st.socios}</strong></div>
                            <div>Admins: <strong className="text-cyan-300">{st.admins}</strong></div>
                            <div>QR: <strong className="text-emerald-300">{st.asistencias}</strong></div>
                            <div>Asamb.: <strong className="text-indigo-300">{st.asambleas}</strong></div>
                            <div>Postul.: <strong className="text-amber-300">{st.postulaciones}</strong></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-[#0e1526]/90 border border-white/[0.08] rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-5">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Actividad Global por Módulo
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Proporción de movimientos registrados en cada módulo de la plataforma.
                    </p>
                  </div>

                  <div className="space-y-3.5 my-auto">
                    {conteoPorModulo.map((m) => {
                      const porcentaje = Math.round((m.count / totalOperacionesModulos) * 100);
                      return (
                        <div key={m.label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                              {m.label}
                            </span>
                            <span className="font-mono text-xs text-slate-300">
                              <strong className="text-white">{m.count}</strong> mov. ({porcentaje}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(porcentaje, m.count > 0 ? 4 : 0)}%` }}
                              transition={{ duration: 0.6 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: m.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">Total Movimientos Auditados:</span>
                    <button
                      onClick={() => setActiveTab('auditoria')}
                      className="text-cyan-400 font-bold hover:underline font-mono cursor-pointer"
                    >
                      Ver los {registrosAuditoriaUnificados.length} registros →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 2: PADRÓN DE POSTULACIONES Y DIRECTIVAS POR SINDICATO             */}
          {/* ===================================================================== */}
          {activeTab === 'postulaciones' && (
            <div className="bg-[#0e1526]/90 p-6 rounded-3xl border border-white/[0.08] shadow-2xl space-y-5">
              <header className="pb-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Icons.Lock />
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      Padrón de Postulaciones y Validación de Admins por Sindicato
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                      ● Sync Realtime
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Selecciona cualquier sindicato (ej: <strong>Sindicato de juanito</strong>) para aprobar o rechazar sus postulaciones en tiempo real o abrir su propio panel Admin.
                  </p>
                </div>

                {filtroSindicatoPostulaciones !== 'todos' && (
                  <button
                    onClick={() => {
                      const sind = sindicatos.find((s) => String(s.id) === String(filtroSindicatoPostulaciones));
                      if (sind) abrirPadronDeSindicatoEnAdmin(sind.id, sind.nombre);
                    }}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 shrink-0 cursor-pointer"
                  >
                    <span>⚡ Abrir Padrón Admin de este Sindicato</span>
                    <Icons.External />
                  </button>
                )}
              </header>

              {/* CONTROLES DE FILTRO POR SINDICATO INDEPENDIENTE Y ESTADO */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filtroSindicatoPostulaciones}
                    onChange={(e) => setFiltroSindicatoPostulaciones(e.target.value)}
                    className="bg-slate-900 border border-cyan-500/40 rounded-xl px-3.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="todos">🌐 Todos los Sindicatos ({postulacionesUnificadas.length} solicitudes)</option>
                    {sindicatos.map((s) => {
                      const countSind = postulacionesUnificadas.filter((p) => Number(p.sindicato_id) === Number(s.id)).length;
                      return (
                        <option key={s.id} value={s.id}>
                          🏢 {s.nombre} ({countSind} postulación/es)
                        </option>
                      );
                    })}
                  </select>

                  {(['pendientes', 'todas', 'aprobadas', 'rechazadas'] as const).map((est) => (
                    <button
                      key={est}
                      onClick={() => setFiltroEstadoPostulaciones(est)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                        filtroEstadoPostulaciones === est
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {est}
                    </button>
                  ))}
                </div>
              </div>

              {/* LISTA DE POSTULACIONES DEL SINDICATO SELECCIONADO */}
              {postulacionesFiltradasVista.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                  No hay solicitudes en este filtro. Cambia a &quot;TODAS&quot; para ver el historial completo de resoluciones.
                </div>
              ) : (
                <div className="space-y-3">
                  {postulacionesFiltradasVista.map((post) => {
                    const estadoNorm = String(post.estado || 'Pendiente').toLowerCase();
                    const esPendiente = estadoNorm === 'pendiente';
                    const esAprobada = estadoNorm === 'aceptada' || estadoNorm === 'aprobada';

                    return (
                      <div
                        key={`${post.sindicato_id}-${post.id}-${post.rut}`}
                        className={`p-4 sm:p-5 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
                          esPendiente
                            ? 'bg-slate-900/90 border-amber-500/40 shadow-lg'
                            : esAprobada
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-rose-950/20 border-rose-500/40'
                        }`}
                      >
                        <div className="space-y-1.5 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              🏢 {post.sindicato_nombre}
                            </span>
                            <span className="font-black text-white text-sm sm:text-base">{post.full_name}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Rol Solicitado: {String(post.rol_solicitado || 'ADMIN').toUpperCase()}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-800 text-slate-300">
                              {post.origen_solicitud}
                            </span>
                          </div>

                          <p className="text-slate-300 font-mono">
                            RUT: <strong className="text-white">{post.rut}</strong> • Correo:{' '}
                            <strong className="text-cyan-300">{post.email}</strong>
                          </p>

                          {post.mensaje_escalamiento && (
                            <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                              📋 {post.mensaje_escalamiento}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            onClick={() => abrirPadronDeSindicatoEnAdmin(post.sindicato_id, post.sindicato_nombre)}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                            title="Ver dentro del Padrón del Admin del Sindicato"
                          >
                            <span>Padrón Sindicato</span>
                            <Icons.External />
                          </button>

                          {esPendiente ? (
                            <>
                              <button
                                onClick={() => handleAprobarDirectivo(post)}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Icons.Check />
                                <span>Aprobar en Vivo</span>
                              </button>
                              <button
                                onClick={() => handleRechazarDirectivo(post)}
                                className="px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Rechazar
                              </button>
                            </>
                          ) : (
                            <span
                              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-black uppercase border ${
                                esAprobada
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              }`}
                            >
                              {esAprobada ? '✅ APROBADO' : '❌ RECHAZADO'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 3: BITÁCORA DE AUDITORÍA DETALLADA                                */}
          {/* ===================================================================== */}
          {activeTab === 'auditoria' && (
            <div className="bg-[#0e1526]/90 p-6 rounded-3xl border border-white/[0.08] shadow-2xl space-y-5">
              <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-white">
                    Bitácora Maestra de Auditoría y Datos de Salida ({auditoriaFiltrada.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Historial detallado de qué administrador modificó cada módulo, qué acción realizó y a qué hora exacta.
                  </p>
                </div>

                <button
                  onClick={exportarBitacoraAuditoriaCSV}
                  className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20 shrink-0 cursor-pointer"
                >
                  <Icons.Download />
                  <span>Descargar Bitácora CSV</span>
                </button>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Filtrar por Sindicato</label>
                  <select
                    value={filtroSindicatoAuditoria}
                    onChange={(e) => setFiltroSindicatoAuditoria(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="todos">🌐 Todos los Sindicatos ({registrosAuditoriaUnificados.length})</option>
                    {sindicatos.map((s) => (
                      <option key={s.id} value={s.id}>🏢 Solo {s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Filtrar por Módulo</label>
                  <select
                    value={filtroModuloAuditoria}
                    onChange={(e) => setFiltroModuloAuditoria(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="todos">🧩 Todos los Módulos</option>
                    <option value="Módulos">Módulos & Estudio UI</option>
                    <option value="Asistencia">Asistencia QR</option>
                    <option value="Asambleas">Historial & Asambleas</option>
                    <option value="Comunicados">Muro de Comunicados</option>
                    <option value="Beneficios">Beneficios & Canjes</option>
                    <option value="Postulaciones">Postulaciones & Padrón</option>
                    <option value="Directivas">Validación de Directivas</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Buscar por Admin o Acción</label>
                  <input
                    type="text"
                    value={busquedaAuditoria}
                    onChange={(e) => setBusquedaAuditoria(e.target.value)}
                    placeholder="Ej: nombre de admin, correo, RUT..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {auditoriaFiltrada.map((mov) => {
                  const fechaObj = mov.fecha_iso ? new Date(mov.fecha_iso) : new Date();
                  const fechaStr = fechaObj.toLocaleDateString('es-CL');
                  const horaExacta = fechaObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                  return (
                    <div
                      key={mov.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            🏢 {mov.sindicato_nombre}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            🧩 {mov.modulo}
                          </span>
                        </div>
                        <p className="font-bold text-white text-sm pt-0.5">{mov.accion}</p>
                        <p className="text-slate-300 text-xs leading-relaxed">{mov.detalle}</p>
                      </div>

                      <div className="flex sm:items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800 shrink-0 font-mono">
                        <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl text-left lg:text-right">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Responsable / Admin</span>
                          <span className="text-xs font-bold text-emerald-400 block">{mov.admin_nombre}</span>
                          <span className="text-[10px] text-slate-400 block">{mov.admin_email} • {mov.admin_rol}</span>
                        </div>

                        <div className="bg-slate-950/80 border border-cyan-500/25 px-3.5 py-2 rounded-xl text-right min-w-[115px]">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Hora Exacta</span>
                          <span className="text-xs font-black text-cyan-300 flex items-center justify-end gap-1">
                            <Icons.Clock />
                            {horaExacta}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{fechaStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICACIONES Y CORREOS */}
          {activeTab === 'notificaciones' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-[#0e1526]/90 p-6 rounded-3xl border border-white/[0.08] shadow-2xl space-y-4">
                <header className="border-b border-slate-800 pb-3">
                  <h3 className="text-base font-black text-white">Emitir Alerta desde SuperAdmin</h3>
                  <p className="text-xs text-slate-400">
                    Emisor activo: <span className="text-cyan-400 font-mono">{superAdminUser?.email}</span>
                  </p>
                </header>

                <form onSubmit={handleEmitirNotificacionSuperAdmin} className="space-y-3.5 text-xs">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      1. Seleccionar Sindicato (Independiente o Global)
                    </label>
                    <select
                      value={saNotifSindicato}
                      onChange={(e) => {
                        setSaNotifSindicato(e.target.value);
                        setSaNotifDestinatarioEmail('todos');
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="todos">🌐 Todos los Sindicatos Registrados ({sindicatos.length})</option>
                      {sindicatos.map((s) => (
                        <option key={s.id} value={s.id}>🏢 {s.nombre} (ID #{s.id})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      2. Correo / Usuario Destinatario ({usuariosFiltradosNotif.length} disponibles)
                    </label>
                    <select
                      value={saNotifDestinatarioEmail}
                      onChange={(e) => setSaNotifDestinatarioEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="todos">📢 Todos los miembros de la selección ({usuariosFiltradosNotif.length})</option>
                      {usuariosFiltradosNotif.map((u) => (
                        <option key={u.id} value={u.id}>
                          ✉️ {u.email} — {u.full_name || 'Sin nombre'} ({u.role || 'socio'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Título del Comunicado / Alerta
                    </label>
                    <input
                      type="text"
                      required
                      value={saNotifTitulo}
                      onChange={(e) => setSaNotifTitulo(e.target.value)}
                      placeholder="Ej: Mantenimiento Programado o Resolución de Directiva..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Mensaje Oficial
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={saNotifMensaje}
                      onChange={(e) => setSaNotifMensaje(e.target.value)}
                      placeholder="Escribe el mensaje que recibirán los socios y administradores en su Campanita..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-cyan-400 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={enviandoSaNotif}
                    className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Icons.Send />
                    <span>{enviandoSaNotif ? 'Despachando...' : 'Despachar Notificación'}</span>
                  </button>
                </form>
              </div>

              <div className="lg:col-span-6 bg-[#0e1526]/90 p-6 rounded-3xl border border-white/[0.08] shadow-2xl space-y-4">
                <header className="border-b border-slate-800 pb-3">
                  <h3 className="text-base font-black text-white">Bandeja Global de Alertas ({alertasRecibidasSA.length})</h3>
                  <p className="text-xs text-slate-400">Solicitudes de directivas y avisos emitidos en cada sindicato.</p>
                </header>

                <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                  {alertasRecibidasSA.map((al, idx) => (
                    <div key={al.id || idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-cyan-500/15 text-cyan-300">
                          {al.sindicato_nombre}
                        </span>
                        <span className="text-[9px] font-mono text-amber-300 uppercase">
                          {al.tipo || al.origen}
                        </span>
                      </div>
                      <h4 className="font-bold text-white">{al.titulo}</h4>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{al.mensaje}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TENANTS */}
          {activeTab === 'tenants' && (
            <div className="bg-[#0e1526]/90 p-6 rounded-3xl border border-white/[0.08] shadow-2xl space-y-4">
              <header className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-white">Directorio de Organizaciones ({sindicatos.length})</h3>
                  <p className="text-xs text-slate-400">Control de activación, suspensión, padrón y edición de tenants.</p>
                </div>
                <button
                  onClick={() => setActiveTab('nuevo')}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  + Desplegar Tenant
                </button>
              </header>

              <div className="divide-y divide-slate-800">
                {sindicatos.map((s) => {
                  const isActivo = (s.estado || 'activo').toLowerCase() === 'activo';
                  return (
                    <div key={s.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{s.nombre}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${isActivo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
                            {s.estado || 'activo'}
                          </span>
                        </div>
                        <p className="text-slate-400 font-mono mt-0.5">RUT: {s.rut_sindicato} • ID #{s.id}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => abrirPadronDeSindicatoEnAdmin(s.id, s.nombre)}
                          className="px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg font-bold border border-amber-500/30 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Abrir su Panel Admin</span>
                          <Icons.External />
                        </button>
                        <button
                          onClick={() => {
                            handleCambiarTenantTema(s.id);
                            setActiveTab('tema');
                          }}
                          className="px-3.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 rounded-lg font-bold border border-cyan-500/30 transition-colors cursor-pointer"
                        >
                          Configurar UI / Módulos
                        </button>
                        <button
                          onClick={() => {
                            setSindicatoSeleccionado(s);
                            setEditNombreSindicato(s.nombre);
                            setEditRutSindicato(s.rut_sindicato);
                            setEditLogoSindicato(s.logo_url || '');
                          }}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold border border-slate-700 transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleEstadoSindicato(s.id, s.estado || 'activo')}
                          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${isActivo ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}
                        >
                          {isActivo ? 'Suspender' : 'Reactivar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: PADRÓN GLOBAL */}
          {activeTab === 'usuarios' && (
            <div className="bg-[#0e1526]/90 p-6 rounded-3xl border border-white/[0.08] shadow-2xl space-y-4">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-white">Padrón Global Multi-Tenant ({usuariosDirectorioFiltrados.length})</h3>
                  <p className="text-xs text-slate-400">Directorio completo con correos verificados, RUT y organización asignada.</p>
                </div>
                <input
                  type="text"
                  value={busquedaUsuarios}
                  onChange={(e) => setBusquedaUsuarios(e.target.value)}
                  placeholder="Buscar por nombre, correo, RUT o rol..."
                  className="w-full sm:w-72 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </header>

              <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto pr-1">
                {usuariosDirectorioFiltrados.map((u) => {
                  const sindicatoAsociado = sindicatos.find((s) => s.id === u.sindicato_id);
                  const isActivo = (u.estado || 'activo').toLowerCase() === 'activo';

                  return (
                    <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-sm">{u.full_name || 'Sin Nombre'}</p>
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-900 text-cyan-300 border border-slate-700">
                            {u.role || 'socio'}
                          </span>
                          {!isActivo && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Suspendido
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 font-mono mt-0.5">
                          ✉️ {u.email} • RUT: {u.rut || 'N/A'}
                        </p>
                        <p className="text-[11px] text-cyan-400/90 font-medium mt-0.5">
                          Organización: {sindicatoAsociado?.nombre || 'Global SaaS / Sin Asignar'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setUsuarioSeleccionado(u);
                            setNuevoRol(u.role || 'socio');
                            setNuevoSindicatoId(u.sindicato_id ? String(u.sindicato_id) : '');
                            setNuevoEstadoUsuario(u.estado || 'activo');
                          }}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold border border-slate-700 transition-colors cursor-pointer"
                        >
                          Asignar Rol/Tenant
                        </button>
                        <button
                          onClick={() => toggleEstadoUsuario(u.id, u.estado || 'activo')}
                          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${isActivo ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}
                        >
                          {isActivo ? 'Bloquear' : 'Restaurar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: ESTUDIO UI Y SOFT DELETE DE MÓDULOS */}
          {activeTab === 'tema' && (
            <div className="bg-[#0e1526]/90 p-6 md:p-8 rounded-3xl border border-white/[0.08] shadow-2xl space-y-6">
              <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white">Control Independiente de UI y Módulos por Sindicato</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Personaliza colores, lemas y módulos activos (Soft Delete) con registro automático en la bitácora.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={tenantSeleccionadoTema || ''}
                    onChange={(e) => handleCambiarTenantTema(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-bold"
                  >
                    {sindicatos.map((s) => (
                      <option key={s.id} value={s.id}>🏢 {s.nombre}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleGuardarConfiguracionJSONB}
                    disabled={guardandoTemaJSONB}
                    className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    {guardandoTemaJSONB ? 'Guardando...' : 'Publicar Cambios'}
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div className="space-y-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                  <span className="font-bold text-white text-xs block uppercase tracking-wider">Paleta de Colores</span>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Fondo General:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={configUITema.tema?.fondo_base || '#090d16'}
                          onChange={(e) => setConfigUITema({ ...configUITema, tema: { ...configUITema.tema, fondo_base: e.target.value } })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                        />
                        <span className="font-mono text-slate-300">{configUITema.tema?.fondo_base}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Color de Tarjetas:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={configUITema.tema?.color_tarjetas || '#131b2e'}
                          onChange={(e) => setConfigUITema({ ...configUITema, tema: { ...configUITema.tema, color_tarjetas: e.target.value } })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                        />
                        <span className="font-mono text-slate-300">{configUITema.tema?.color_tarjetas}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Color Acento:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={configUITema.tema?.color_acento || '#06b6d4'}
                          onChange={(e) => setConfigUITema({ ...configUITema, tema: { ...configUITema.tema, color_acento: e.target.value } })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                        />
                        <span className="font-mono text-slate-300">{configUITema.tema?.color_acento}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                  <span className="font-bold text-white text-xs block uppercase tracking-wider">Lema y Portada del Dashboard</span>
                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Título Hero</label>
                      <input
                        type="text"
                        value={configUITema.hero?.titulo || ''}
                        onChange={(e) => setConfigUITema({ ...configUITema, hero: { ...configUITema.hero, titulo: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Subtítulo Hero</label>
                      <input
                        type="text"
                        value={configUITema.hero?.subtitulo || ''}
                        onChange={(e) => setConfigUITema({ ...configUITema, hero: { ...configUITema.hero, subtitulo: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-3">
                <span className="font-bold text-white text-xs block uppercase tracking-wider">
                  Módulos Habilitados para esta Organización
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {Object.entries(MODULOS_BASE).map(([key, info]) => {
                    const activo = Boolean(modulosTenantTema[key]);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setModulosTenantTema({ ...modulosTenantTema, [key]: !activo })}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          activo
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                            : 'bg-slate-900/50 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{info.label}</span>
                          <span className={`w-2 h-2 rounded-full ${activo ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                        </div>
                        <span className="text-[9px] font-mono block mt-1">
                          {activo ? 'Activo' : 'Oculto'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: CREAR NUEVO TENANT */}
          {activeTab === 'nuevo' && (
            <div className="bg-[#0e1526]/90 p-6 md:p-8 rounded-3xl border border-white/[0.08] shadow-2xl space-y-6 max-w-2xl mx-auto">
              <header className="text-center pb-4 border-b border-slate-800">
                <h3 className="text-xl font-black text-white">Despliegue de Nueva Organización</h3>
                <p className="text-xs text-slate-400 mt-1">Crea un espacio independiente con aislamiento en la base de datos.</p>
              </header>

              <form onSubmit={handleCrearSindicato} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nombre Oficial</label>
                  <input
                    type="text"
                    required
                    value={nombreSindicato}
                    onChange={(e) => setNombreSindicato(e.target.value)}
                    placeholder="Ej: Sindicato Nacional de Trabajadores..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">RUT Tributario</label>
                  <input
                    type="text"
                    required
                    value={rutSindicato}
                    onChange={(e) => setRutSindicato(e.target.value)}
                    placeholder="Ej: 76.543.210-K"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Logo URL (Opcional)</label>
                  <input
                    type="url"
                    value={logoSindicato}
                    onChange={(e) => setLogoSindicato(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creandoSindicato}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 mt-4 cursor-pointer"
                >
                  {creandoSindicato ? 'Desplegando en Supabase...' : 'Confirmar y Desplegar Sindicato'}
                </button>
              </form>
            </div>
          )}

        </div>
      </main>

      {/* MODAL EDITAR SINDICATO */}
      {sindicatoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSindicatoSeleccionado(null)}>
          <div className="bg-[#0e1526] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Editar Organización #{sindicatoSeleccionado.id}</h3>
              <button onClick={() => setSindicatoSeleccionado(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={guardarEdicionSindicato} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nombre</label>
                <input type="text" required value={editNombreSindicato} onChange={(e) => setEditNombreSindicato(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">RUT</label>
                <input type="text" required value={editRutSindicato} onChange={(e) => setEditRutSindicato(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Logo URL</label>
                <input type="url" value={editLogoSindicato} onChange={(e) => setEditLogoSindicato(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400" />
              </div>
              <button type="submit" disabled={guardandoSindicato} className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl uppercase tracking-wider transition-all mt-2 cursor-pointer">
                {guardandoSindicato ? 'Guardando...' : 'Aplicar Cambios'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ASIGNAR USUARIO */}
      {usuarioSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setUsuarioSeleccionado(null)}>
          <div className="bg-[#0e1526] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">Gestionar Usuario</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{usuarioSeleccionado.email}</p>
              </div>
              <button onClick={() => setUsuarioSeleccionado(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={guardarAsignacionTenant} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nivel de Privilegios</label>
                <select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400">
                  <option value="socio">Socio Regular</option>
                  <option value="admin">Administrador Local (Presidente)</option>
                  <option value="superadmin">SuperAdministrador Global</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Organización Asignada</label>
                <select value={nuevoSindicatoId} onChange={(e) => setNuevoSindicatoId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400">
                  <option value="">-- Sin Organización (Global) --</option>
                  {sindicatos.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Estado de Acceso</label>
                <select value={nuevoEstadoUsuario} onChange={(e) => setNuevoEstadoUsuario(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400">
                  <option value="activo">Activo</option>
                  <option value="suspendido">Suspendido (Acceso Bloqueado)</option>
                </select>
              </div>
              <button type="submit" disabled={guardandoAsignacion} className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl uppercase tracking-wider transition-all mt-2 cursor-pointer">
                {guardandoAsignacion ? 'Actualizando...' : 'Confirmar Asignación'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}