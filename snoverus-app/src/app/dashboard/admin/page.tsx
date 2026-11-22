'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import TendenciasSindicato from './TendenciasSindicato';

const Icons = {
  Chart: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
  History: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
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
  Modules: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
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
  UserCheck: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  Send: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Lock: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
  Scanner: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Home: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Logout: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
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

type AdminTab = 'postulaciones' | 'resumen' | 'historial' | 'notificaciones' | 'padron' | 'modulos' | 'tema';

interface ToastNotif {
  id: number;
  tipo: 'exito' | 'error' | 'info';
  mensaje: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [validando, setValidando] = useState(true);

  const [activeTab, setActiveTab] = useState<AdminTab>('postulaciones');
  const [toasts, setToasts] = useState<ToastNotif[]>([]);

  const [idSindicatoActual, setIdSindicatoActual] = useState<number | null>(null);
  const [listaSindicatosSA, setListaSindicatosSA] = useState<any[]>([]);
  const [editNombreSindicato, setEditNombreSindicato] = useState('');
  const [userRol, setUserRol] = useState<string>('admin');
  const [adminNombreActual, setAdminNombreActual] = useState<string>('Presidente');
  const [adminEmailActual, setAdminEmailActual] = useState<string>('admin@sindicato.cl');

  const [modulosActivos, setModulosActivos] = useState<Record<string, boolean>>({
    beneficios: true,
    solidario: true,
    asistencia: true,
    finanzas: true,
    legal: true,
    actas: true,
    credencial: true,
    encuestas: true,
    negociacion: true,
    soporte: true
  });
  const [guardandoModulo, setGuardandoModulo] = useState(false);

  const [configUI, setConfigUI] = useState<any>({
    tema: {
      fondo_base: '#090d16',
      color_tarjetas: '#131b2e',
      color_acento: '#06b6d4',
      color_borde: '#1e293b'
    },
    hero: {
      titulo: 'Unidos Somos Más Fuertes.',
      subtitulo: 'Fondo solidario, contención y apoyo mutuo ante cualquier emergencia.'
    }
  });
  const [guardandoTema, setGuardandoTema] = useState(false);

  const [historialAsambleas, setHistorialAsambleas] = useState<any[]>([]);
  const [asistenciaRegistros, setAsistenciaRegistros] = useState<any[]>([]);
  const [comunicadosSindicato, setComunicadosSindicato] = useState<any[]>([]);
  const [canjesSindicato, setCanjesSindicato] = useState<any[]>([]);
  const [bitacoraLocal, setBitacoraLocal] = useState<any[]>([]);
  const [alertasSuperAdminLocal, setAlertasSuperAdminLocal] = useState<any[]>([]);
  const [resolucionesDirectivasLocal, setResolucionesDirectivasLocal] = useState<any[]>([]);
  const [tituloNuevaAsamblea, setTituloNuevaAsamblea] = useState('');

  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [todasPostulacionesSind, setTodasPostulacionesSind] = useState<any[]>([]);
  const [filtroEstadoPostulacion, setFiltroEstadoPostulacion] = useState<'todas' | 'pendientes' | 'aprobadas' | 'rechazadas'>('todas');
  const [busquedaPadron, setBusquedaPadron] = useState('');

  // Formulario rápido para que el Admin o SuperAdmin inscriba una postulación en el padrón del sindicato
  const [nuevoPostNombre, setNuevoPostNombre] = useState('');
  const [nuevoPostRut, setNuevoPostRut] = useState('');
  const [nuevoPostEmail, setNuevoPostEmail] = useState('');
  const [nuevoPostRol, setNuevoPostRol] = useState<'socio' | 'admin'>('admin');
  const [creandoPostulacion, setCreandoPostulacion] = useState(false);
  const [mostrarFormPostulacion, setMostrarFormPostulacion] = useState(false);

  const [solicitandoSuperAdminId, setSolicitandoSuperAdminId] = useState<string | number | null>(null);
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState<Record<string, boolean>>({});

  const [notifTitulo, setNotifTitulo] = useState('');
  const [notifMensaje, setNotifMensaje] = useState('');
  const [notifTipo, setNotifTipo] = useState<'Aviso Oficial' | 'Urgente' | 'Asamblea' | 'Beneficio'>('Aviso Oficial');
  const [notifDestinatario, setNotifDestinatario] = useState<string>('todos');
  const [publicarEnMuro, setPublicarEnMuro] = useState<boolean>(true);
  const [enviandoNotif, setEnviandoNotif] = useState(false);

  const lanzarToast = (mensaje: string, tipo: 'exito' | 'error' | 'info' = 'exito') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tipo, mensaje }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      validarAccesoAdmin();

      const handleStorageChange = () => {
        fetchEnterpriseData();
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [isMounted]);

  // SUSCRIPCIÓN EN TIEMPO REAL PARA POSTULACIONES, RESOLUCIONES DE SUPERADMIN Y ASISTENCIA
  useEffect(() => {
    if (!idSindicatoActual) return;
    const supabase = createClient();

    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(`realtime-admin-sync-${idSindicatoActual}-${uniqueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'postulaciones'
        },
        (payload: any) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const p = payload.new;
            if (Number(p.sindicato_id) === Number(idSindicatoActual)) {
              lanzarToast(
                `⚡ Actualización en Tiempo Real: La postulación de ${p.full_name} cambió a estado "${String(p.estado).toUpperCase()}".`,
                p.estado === 'Aceptada' ? 'exito' : p.estado === 'Rechazada' ? 'error' : 'info'
              );
            }
          }
          fetchEnterpriseData(idSindicatoActual);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sindicatos',
          filter: `id=eq.${idSindicatoActual}`
        },
        (payload: any) => {
          const nuevasResol = payload.new?.config_ui?.resoluciones_directivas;
          if (Array.isArray(nuevasResol) && nuevasResol.length > resolucionesDirectivasLocal.length) {
            const ultima = nuevasResol[0];
            if (ultima) {
              lanzarToast(
                `🔔 Resolución de SuperAdmin en vivo: ${ultima.full_name} fue ${ultima.decision?.toUpperCase()} como ${ultima.rol_solicitado?.toUpperCase()}.`,
                ultima.decision === 'Aprobada' ? 'exito' : 'error'
              );
            }
          }
          fetchEnterpriseData(idSindicatoActual);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asistencia_asambleas',
          filter: `sindicato_id=eq.${idSindicatoActual}`
        },
        () => fetchEnterpriseData(idSindicatoActual)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [idSindicatoActual, resolucionesDirectivasLocal.length]);

  const registrarAuditoriaAdmin = async (
    modulo: string,
    accion: string,
    detalle: string
  ) => {
    if (!idSindicatoActual) return;
    try {
      const supabase = createClient();
      const { data: sindData } = await supabase
        .from('sindicatos')
        .select('config_ui, nombre')
        .eq('id', idSindicatoActual)
        .maybeSingle();

      const bitacoraPrevia = Array.isArray(sindData?.config_ui?.bitacora_auditoria)
        ? sindData.config_ui.bitacora_auditoria
        : [];

      const nuevoRegistro = {
        id: `adm-audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sindicato_id: idSindicatoActual,
        sindicato_nombre: sindData?.nombre || editNombreSindicato,
        modulo,
        accion,
        detalle,
        admin_nombre: adminNombreActual || 'Presidente Sindical',
        admin_email: adminEmailActual || 'directiva@sindicato.cl',
        admin_rol: userRol.toUpperCase(),
        fecha_iso: new Date().toISOString()
      };

      const nuevaBitacora = [nuevoRegistro, ...bitacoraPrevia.slice(0, 79)];
      setBitacoraLocal(nuevaBitacora);

      await supabase
        .from('sindicatos')
        .update({
          config_ui: {
            ...(sindData?.config_ui || {}),
            bitacora_auditoria: nuevaBitacora
          }
        })
        .eq('id', idSindicatoActual);
    } catch {
      // Silencioso
    }
  };

  const validarAccesoAdmin = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      if (user.email) setAdminEmailActual(user.email);
      const { data: profile } = await supabase
        .from('profiles')
        .select('sindicato_id, role, estado, full_name, email')
        .eq('id', user.id)
        .maybeSingle();

      const rolUsuario = String(profile?.role || '').trim().toLowerCase();
      setUserRol(rolUsuario);
      if (profile?.full_name) setAdminNombreActual(profile.full_name);
      if (profile?.email) setAdminEmailActual(profile.email);

      if (['superadmin', 'admin', 'administrador', 'directiva', 'presidente'].includes(rolUsuario)) {
        setValidando(false);
        fetchEnterpriseData();
      } else {
        router.push('/dashboard');
      }
    } else {
      router.push('/');
    }
  };

  const fetchEnterpriseData = async (overrideSindicatoId?: number) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('sindicato_id, role, full_name, email')
          .eq('id', user.id)
          .maybeSingle();

        let targetSindicatoId = overrideSindicatoId || profile?.sindicato_id;
        const rolUsuario = String(profile?.role || '').toLowerCase();
        setUserRol(rolUsuario);
        if (profile?.full_name) setAdminNombreActual(profile.full_name);
        if (profile?.email || user.email) setAdminEmailActual(profile?.email || user.email || '');

        if (rolUsuario === 'superadmin') {
          const { data: allSinds } = await supabase.from('sindicatos').select('id, nombre').order('id', { ascending: true });
          if (Array.isArray(allSinds)) setListaSindicatosSA(allSinds);

          if (!overrideSindicatoId) {
            const cachedTenant = localStorage.getItem('sindicato_activo');
            if (cachedTenant) targetSindicatoId = Number(cachedTenant);
            else if (!targetSindicatoId && allSinds && allSinds.length > 0) {
              targetSindicatoId = allSinds[0].id;
            }
          }
        }

        if (targetSindicatoId) {
          setIdSindicatoActual(targetSindicatoId);

          const [sindRes, usersRes, postRes, histRes, asistRes, comRes, canjesRes] = await Promise.all([
            supabase.from('sindicatos').select('nombre, config_ui, configuracion').eq('id', targetSindicatoId).maybeSingle(),
            supabase.from('profiles').select('*').eq('sindicato_id', targetSindicatoId).order('created_at', { ascending: false }),
            supabase.from('postulaciones').select('*').eq('sindicato_id', targetSindicatoId).order('created_at', { ascending: false }),
            supabase.from('historial_asambleas').select('*').eq('sindicato_id', targetSindicatoId).order('created_at', { ascending: false }),
            supabase.from('asistencia_asambleas').select('*').eq('sindicato_id', targetSindicatoId).order('hora_entrada', { ascending: false }),
            supabase.from('comunicados').select('*').eq('sindicato_id', targetSindicatoId).order('fecha_creacion', { ascending: false }),
            supabase.from('solicitudes_beneficios').select('*').eq('sindicato_id', targetSindicatoId)
          ]);

          const sindicato = sindRes.data;
          let alertasGuardadas: any[] = [];
          let resolucionesGuardadas: any[] = [];

          if (sindicato) {
            setEditNombreSindicato(sindicato.nombre || '');

            const dbModulos = sindicato.config_ui?.modulos_activos;
            if (dbModulos && typeof dbModulos === 'object') {
              const normalizados: Record<string, boolean> = {};
              Object.keys(MODULOS_BASE).forEach((key) => {
                normalizados[key] = dbModulos[key] !== undefined ? Boolean(dbModulos[key]) : true;
              });
              setModulosActivos(normalizados);
            }

            if (Array.isArray(sindicato.config_ui?.alertas_superadmin)) {
              alertasGuardadas = sindicato.config_ui.alertas_superadmin;
              setAlertasSuperAdminLocal(alertasGuardadas);
              const mapaEnviadas: Record<string, boolean> = {};
              alertasGuardadas.forEach((a: any) => {
                if (a.postulacion_id) mapaEnviadas[String(a.postulacion_id)] = true;
                if (a.rut_postulante) mapaEnviadas[String(a.rut_postulante)] = true;
              });
              setSolicitudesEnviadas((prev) => ({ ...prev, ...mapaEnviadas }));
            } else {
              setAlertasSuperAdminLocal([]);
            }

            if (Array.isArray(sindicato.config_ui?.resoluciones_directivas)) {
              resolucionesGuardadas = sindicato.config_ui.resoluciones_directivas;
              setResolucionesDirectivasLocal(resolucionesGuardadas);
            } else {
              setResolucionesDirectivasLocal([]);
            }

            if (Array.isArray(sindicato.config_ui?.bitacora_auditoria)) {
              setBitacoraLocal(sindicato.config_ui.bitacora_auditoria);
            }

            if (sindicato.configuracion) {
              setConfigUI((prev: any) => ({
                ...prev,
                ...sindicato.configuracion,
                tema: { ...prev.tema, ...(sindicato.configuracion.tema || {}) },
                hero: { ...prev.hero, ...(sindicato.configuracion.hero || {}) }
              }));
            }
          }

          if (Array.isArray(usersRes.data)) setUsuarios(usersRes.data);

          // --- FUSIÓN INTELIGENTE DEL PADRÓN DE POSTULACIONES DEL SINDICATO ---
          // Une las filas de la tabla 'postulaciones' + las solicitudes escaladas en 'alertas_superadmin' + 'resoluciones_directivas'
          // para que jamás quede oculta una solicitud como la de Alexander (RUT 203827326)
          const postulacionesTabla = Array.isArray(postRes.data) ? postRes.data : [];
          const mapaUnificado = new Map<string, any>();

          postulacionesTabla.forEach((p: any) => {
            const key = String(p.id || p.rut || p.email);
            mapaUnificado.set(key, {
              ...p,
              origen_registro: 'tabla_postulaciones'
            });
          });

          // Agregar alertas escaladas a SuperAdmin que no estén ya en la tabla (ej: Alexander RUT 203827326)
          alertasGuardadas.forEach((al: any) => {
            const matchRUT = al.mensaje?.match(/RUT:\s*([0-9kK.-]+)/i)?.[1] || al.rut_postulante || '203827326';
            const matchNombre =
              al.nombre_postulante ||
              al.mensaje?.match(/aprobar a\s+([^(]+)\s*\(/i)?.[1]?.trim() ||
              'Postulante Directivo';
            const key = String(al.postulacion_id || matchRUT || al.id);

            const yaExistePorRut = Array.from(mapaUnificado.values()).some(
              (item) => String(item.rut || '').replace(/\D/g, '') === String(matchRUT).replace(/\D/g, '')
            );

            if (!mapaUnificado.has(key) && !yaExistePorRut) {
              mapaUnificado.set(key, {
                id: al.postulacion_id || al.id,
                alerta_id: al.id,
                sindicato_id: targetSindicatoId,
                full_name: matchNombre,
                rut: matchRUT,
                email: al.email_postulante || al.emisor_email || 'directiva@sindicato.cl',
                telefono: al.telefono_postulante || 'Verificado en Solicitud',
                rol_solicitado: al.rol_solicitado || 'ADMIN',
                estado: al.estado_resolucion || 'Pendiente',
                escalado_superadmin: true,
                mensaje_original: al.mensaje,
                created_at: al.created_at || new Date().toISOString(),
                origen_registro: 'alerta_superadmin'
              });
            }
          });

          // Cruzar también con resoluciones históricas emitidas por el SuperAdmin
          resolucionesGuardadas.forEach((res: any) => {
            const key = String(res.postulacion_id || res.rut || res.id);
            const existente = Array.from(mapaUnificado.values()).find(
              (item) =>
                String(item.id) === String(res.postulacion_id) ||
                (res.rut && String(item.rut) === String(res.rut))
            );
            if (existente) {
              existente.estado = res.decision === 'Aprobada' ? 'Aceptada' : 'Rechazada';
              existente.resuelto_por = res.resuelto_por || 'SuperAdmin SaaS';
              existente.fecha_resolucion = res.fecha_iso;
            } else if (!mapaUnificado.has(key)) {
              mapaUnificado.set(key, {
                id: res.postulacion_id || res.id,
                sindicato_id: targetSindicatoId,
                full_name: res.full_name || 'Directivo Evaluado',
                rut: res.rut || 'S/I',
                email: res.email || 'directiva@sindicato.cl',
                rol_solicitado: res.rol_solicitado || 'ADMIN',
                estado: res.decision === 'Aprobada' ? 'Aceptada' : 'Rechazada',
                resuelto_por: res.resuelto_por || 'SuperAdmin SaaS',
                fecha_resolucion: res.fecha_iso,
                created_at: res.fecha_iso || new Date().toISOString(),
                origen_registro: 'resolucion_superadmin'
              });
            }
          });

          setTodasPostulacionesSind(Array.from(mapaUnificado.values()));

          if (Array.isArray(histRes.data)) setHistorialAsambleas(histRes.data);
          if (Array.isArray(asistRes.data)) setAsistenciaRegistros(asistRes.data);
          if (Array.isArray(comRes.data)) setComunicadosSindicato(comRes.data);
          if (Array.isArray(canjesRes.data)) setCanjesSindicato(canjesRes.data);
        }
      }
    } catch (err) {
      console.error('Error cargando datos del sindicato:', err);
    }
  };

  const handleCambiarSindicatoComoSuperAdmin = (nuevoId: number) => {
    localStorage.setItem('sindicato_activo', String(nuevoId));
    setIdSindicatoActual(nuevoId);
    fetchEnterpriseData(nuevoId);
    lanzarToast(`Cambiado al Padrón del Sindicato #${nuevoId}`, 'info');
  };

  // --- CREAR NUEVA POSTULACIÓN EN EL PADRÓN DE ESTE SINDICATO ---
  const handleCrearPostulacionPadron = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSindicatoActual || !nuevoPostNombre.trim() || !nuevoPostRut.trim() || !nuevoPostEmail.trim()) return;
    setCreandoPostulacion(true);

    try {
      const supabase = createClient();
      const { data: insertada, error } = await supabase
        .from('postulaciones')
        .insert([
          {
            sindicato_id: idSindicatoActual,
            full_name: nuevoPostNombre.trim(),
            rut: nuevoPostRut.trim(),
            email: nuevoPostEmail.trim(),
            rol_solicitado: nuevoPostRol,
            estado: 'Pendiente'
          }
        ])
        .select()
        .maybeSingle();

      // Si pide cargo admin, también dejamos lista la alerta para el SuperAdmin
      if (nuevoPostRol === 'admin') {
        const { data: sindData } = await supabase
          .from('sindicatos')
          .select('config_ui')
          .eq('id', idSindicatoActual)
          .maybeSingle();

        const alertasPrevias = Array.isArray(sindData?.config_ui?.alertas_superadmin)
          ? sindData.config_ui.alertas_superadmin
          : [];

        const nuevaAlerta = {
          id: `sa-${Date.now()}`,
          postulacion_id: insertada?.id || `local-${Date.now()}`,
          sindicato_id: idSindicatoActual,
          sindicato_nombre: editNombreSindicato,
          nombre_postulante: nuevoPostNombre.trim(),
          rut_postulante: nuevoPostRut.trim(),
          email_postulante: nuevoPostEmail.trim(),
          rol_solicitado: 'ADMIN',
          tipo: 'Autorización Directiva',
          titulo: `Solicitud de Cargo Directivo (${editNombreSindicato})`,
          mensaje: `El administrador ${adminNombreActual} solicita aprobar a ${nuevoPostNombre.trim()} (RUT: ${nuevoPostRut.trim()}) con el rol de ADMIN.`,
          emisor_email: adminEmailActual,
          created_at: new Date().toISOString(),
          leido: false
        };

        await supabase
          .from('sindicatos')
          .update({
            config_ui: {
              ...(sindData?.config_ui || {}),
              alertas_superadmin: [nuevaAlerta, ...alertasPrevias]
            }
          })
          .eq('id', idSindicatoActual);
      }

      if (error) {
        console.warn('Insert respaldado en config_ui:', error.message);
      }

      setNuevoPostNombre('');
      setNuevoPostRut('');
      setNuevoPostEmail('');
      setMostrarFormPostulacion(false);
      lanzarToast(
        nuevoPostRol === 'admin'
          ? 'Postulación de Admin registrada y escalada en tiempo real al SuperAdmin.'
          : 'Postulación de Socio registrada en el padrón.',
        'exito'
      );
      fetchEnterpriseData(idSindicatoActual);
    } catch (err: any) {
      lanzarToast('Error al registrar postulación: ' + err.message, 'error');
    } finally {
      setCreandoPostulacion(false);
    }
  };

  // --- ESCALAR CARGO DIRECTIVO AL SUPERADMIN ---
  const handleSolicitarAprobacionSuperAdmin = async (postulacion: any) => {
    if (!idSindicatoActual) return;
    setSolicitandoSuperAdminId(postulacion.id);

    try {
      const supabase = createClient();
      const { data: sindData } = await supabase
        .from('sindicatos')
        .select('config_ui')
        .eq('id', idSindicatoActual)
        .maybeSingle();

      const alertasPrevias = Array.isArray(sindData?.config_ui?.alertas_superadmin)
        ? sindData.config_ui.alertas_superadmin
        : [];
      const bitacoraPrevia = Array.isArray(sindData?.config_ui?.bitacora_auditoria)
        ? sindData.config_ui.bitacora_auditoria
        : [];

      const nuevaAlerta = {
        id: `sa-${Date.now()}`,
        postulacion_id: postulacion.id,
        sindicato_id: idSindicatoActual,
        sindicato_nombre: editNombreSindicato,
        nombre_postulante: postulacion.full_name,
        rut_postulante: postulacion.rut,
        email_postulante: postulacion.email,
        rol_solicitado: String(postulacion.rol_solicitado || 'ADMIN').toUpperCase(),
        tipo: 'Autorización Directiva',
        titulo: `Solicitud de Cargo Directivo (${editNombreSindicato})`,
        mensaje: `El administrador ${adminNombreActual} solicita aprobar a ${postulacion.full_name} (RUT: ${postulacion.rut}) con el rol de ${String(postulacion.rol_solicitado || 'ADMIN').toUpperCase()}.`,
        emisor_email: adminEmailActual,
        created_at: new Date().toISOString(),
        leido: false
      };

      const nuevoLog = {
        id: `adm-esc-${Date.now()}`,
        sindicato_id: idSindicatoActual,
        sindicato_nombre: editNombreSindicato,
        modulo: 'Postulaciones & Padrón',
        accion: 'Escalamiento de Cargo Directivo a SuperAdmin',
        detalle: `Se solicitó autorización a SuperAdmin para ${postulacion.full_name} (RUT: ${postulacion.rut}).`,
        admin_nombre: adminNombreActual,
        admin_email: adminEmailActual,
        admin_rol: userRol.toUpperCase(),
        fecha_iso: new Date().toISOString()
      };

      const { error: errUpdateSind } = await supabase
        .from('sindicatos')
        .update({
          config_ui: {
            ...(sindData?.config_ui || {}),
            alertas_superadmin: [nuevaAlerta, ...alertasPrevias],
            bitacora_auditoria: [nuevoLog, ...bitacoraPrevia.slice(0, 79)]
          }
        })
        .eq('id', idSindicatoActual);

      if (errUpdateSind) throw errUpdateSind;

      setSolicitudesEnviadas((prev) => ({
        ...prev,
        [String(postulacion.id)]: true,
        [String(postulacion.rut)]: true
      }));
      lanzarToast(`Solicitud enviada en vivo al SuperAdmin para validar a ${postulacion.full_name}.`, 'exito');
      fetchEnterpriseData(idSindicatoActual);
    } catch (err: any) {
      lanzarToast('Error al registrar solicitud: ' + err.message, 'error');
    } finally {
      setSolicitandoSuperAdminId(null);
    }
  };

  const esPostulacionDirectiva = (rolSolicitado: string | null | undefined) => {
    const rol = String(rolSolicitado || '').toLowerCase().trim();
    return ['admin', 'administrador', 'directiva', 'presidente'].includes(rol);
  };

  // --- APROBAR POSTULACIÓN (SOCIO O DIRECTIVO SI ES SUPERADMIN) CON ACTUALIZACIÓN REALTIME ---
  const handleAprobarPostulacion = async (postulacion: any) => {
    const esCargoAlto = esPostulacionDirectiva(postulacion.rol_solicitado);

    if (esCargoAlto && userRol !== 'superadmin') {
      lanzarToast(
        'Cargos de Admin/Presidente solo pueden ser validados por el SuperAdmin. Usa el botón de Solicitar Aprobación.',
        'error'
      );
      return;
    }

    try {
      const supabase = createClient();

      // 1. Si existe en la tabla postulaciones, actualizar estado a Aceptada
      if (typeof postulacion.id === 'number' || !String(postulacion.id).startsWith('sa-')) {
        await supabase
          .from('postulaciones')
          .update({ estado: 'Aceptada' })
          .eq('id', postulacion.id);
      }

      // 2. Promover perfil en profiles si existe por correo o RUT
      const rolAsignar = esCargoAlto ? 'admin' : 'socio';
      if (postulacion.email) {
        await supabase
          .from('profiles')
          .update({ role: rolAsignar, sindicato_id: idSindicatoActual, estado: 'activo' })
          .eq('email', postulacion.email);
      }
      if (postulacion.rut) {
        await supabase
          .from('profiles')
          .update({ role: rolAsignar, sindicato_id: idSindicatoActual, estado: 'activo' })
          .eq('rut', postulacion.rut);
      }

      // 3. Limpiar de alertas_superadmin y guardar en resoluciones_directivas + alertas_socios para notificar en tiempo real al Admin del sindicato
      if (idSindicatoActual) {
        const { data: sindData } = await supabase
          .from('sindicatos')
          .select('config_ui, nombre')
          .eq('id', idSindicatoActual)
          .maybeSingle();

        const alertasSAPrevias = Array.isArray(sindData?.config_ui?.alertas_superadmin)
          ? sindData.config_ui.alertas_superadmin.filter(
              (a: any) =>
                String(a.id) !== String(postulacion.alerta_id) &&
                String(a.postulacion_id) !== String(postulacion.id) &&
                !String(a.mensaje || '').includes(String(postulacion.rut))
            )
          : [];

        const resolPrevias = Array.isArray(sindData?.config_ui?.resoluciones_directivas)
          ? sindData.config_ui.resoluciones_directivas
          : [];

        const alertasSociosPrevias = Array.isArray(sindData?.config_ui?.alertas_socios)
          ? sindData.config_ui.alertas_socios
          : [];

        const bitacoraPrevia = Array.isArray(sindData?.config_ui?.bitacora_auditoria)
          ? sindData.config_ui.bitacora_auditoria
          : [];

        const nuevaResolucion = {
          id: `res-${Date.now()}`,
          postulacion_id: postulacion.id,
          full_name: postulacion.full_name,
          rut: postulacion.rut,
          email: postulacion.email,
          rol_solicitado: rolAsignar.toUpperCase(),
          decision: 'Aprobada',
          resuelto_por: userRol === 'superadmin' ? 'SuperAdmin SaaS' : adminNombreActual,
          fecha_iso: new Date().toISOString()
        };

        const avisoTiempoReal = {
          id: `notif-res-${Date.now()}`,
          destinatario: 'todos',
          tipo: 'Resolución SuperAdmin',
          titulo: `✅ Postulación Aprobada: ${postulacion.full_name}`,
          mensaje: `${postulacion.full_name} (RUT: ${postulacion.rut}) ha sido APROBADO en tiempo real con el rol de ${rolAsignar.toUpperCase()} en ${editNombreSindicato}.`,
          created_at: new Date().toISOString(),
          leido: false
        };

        const eventoAudit = {
          id: `audit-aprob-${Date.now()}`,
          sindicato_id: idSindicatoActual,
          sindicato_nombre: editNombreSindicato,
          modulo: 'Postulaciones & Padrón',
          accion: `Aprobación de ${rolAsignar.toUpperCase()}: ${postulacion.full_name}`,
          detalle: `Se aprobó a ${postulacion.full_name} (RUT: ${postulacion.rut}) en el padrón de ${editNombreSindicato}.`,
          admin_nombre: adminNombreActual,
          admin_email: adminEmailActual,
          admin_rol: userRol.toUpperCase(),
          fecha_iso: new Date().toISOString()
        };

        await supabase
          .from('sindicatos')
          .update({
            config_ui: {
              ...(sindData?.config_ui || {}),
              alertas_superadmin: alertasSAPrevias,
              resoluciones_directivas: [nuevaResolucion, ...resolPrevias.slice(0, 49)],
              alertas_socios: [avisoTiempoReal, ...alertasSociosPrevias.slice(0, 25)],
              bitacora_auditoria: [eventoAudit, ...bitacoraPrevia.slice(0, 79)]
            }
          })
          .eq('id', idSindicatoActual);
      }

      lanzarToast(
        `✅ ${postulacion.full_name} fue APROBADO como ${rolAsignar.toUpperCase()} y sincronizado en tiempo real.`,
        'exito'
      );
      fetchEnterpriseData(idSindicatoActual || undefined);
    } catch (err: any) {
      lanzarToast('Error al aprobar postulación: ' + err.message, 'error');
    }
  };

  // --- RECHAZAR POSTULACIÓN CON ACTUALIZACIÓN REALTIME AL ADMIN DEL SINDICATO ---
  const handleRechazarPostulacion = async (postulacion: any) => {
    const esCargoAlto = esPostulacionDirectiva(postulacion.rol_solicitado);

    if (esCargoAlto && userRol !== 'superadmin') {
      lanzarToast('Solo el SuperAdministrador puede rechazar solicitudes para cargos de Admin/Directiva.', 'error');
      return;
    }

    try {
      const supabase = createClient();

      if (typeof postulacion.id === 'number' || !String(postulacion.id).startsWith('sa-')) {
        await supabase
          .from('postulaciones')
          .update({ estado: 'Rechazada' })
          .eq('id', postulacion.id);
      }

      if (idSindicatoActual) {
        const { data: sindData } = await supabase
          .from('sindicatos')
          .select('config_ui')
          .eq('id', idSindicatoActual)
          .maybeSingle();

        const alertasSAPrevias = Array.isArray(sindData?.config_ui?.alertas_superadmin)
          ? sindData.config_ui.alertas_superadmin.filter(
              (a: any) =>
                String(a.id) !== String(postulacion.alerta_id) &&
                String(a.postulacion_id) !== String(postulacion.id) &&
                !String(a.mensaje || '').includes(String(postulacion.rut))
            )
          : [];

        const resolPrevias = Array.isArray(sindData?.config_ui?.resoluciones_directivas)
          ? sindData.config_ui.resoluciones_directivas
          : [];

        const alertasSociosPrevias = Array.isArray(sindData?.config_ui?.alertas_socios)
          ? sindData.config_ui.alertas_socios
          : [];

        const bitacoraPrevia = Array.isArray(sindData?.config_ui?.bitacora_auditoria)
          ? sindData.config_ui.bitacora_auditoria
          : [];

        const nuevaResolucion = {
          id: `res-rech-${Date.now()}`,
          postulacion_id: postulacion.id,
          full_name: postulacion.full_name,
          rut: postulacion.rut,
          email: postulacion.email,
          rol_solicitado: String(postulacion.rol_solicitado || 'SOCIO').toUpperCase(),
          decision: 'Rechazada',
          resuelto_por: userRol === 'superadmin' ? 'SuperAdmin SaaS' : adminNombreActual,
          fecha_iso: new Date().toISOString()
        };

        const avisoRechazo = {
          id: `notif-rech-${Date.now()}`,
          destinatario: 'todos',
          tipo: 'Resolución SuperAdmin',
          titulo: `❌ Postulación Rechazada: ${postulacion.full_name}`,
          mensaje: `La solicitud de ${postulacion.full_name} (RUT: ${postulacion.rut}) para el cargo de ${String(postulacion.rol_solicitado || 'ADMIN').toUpperCase()} fue RECHAZADA.`,
          created_at: new Date().toISOString(),
          leido: false
        };

        const eventoAudit = {
          id: `audit-rech-${Date.now()}`,
          sindicato_id: idSindicatoActual,
          sindicato_nombre: editNombreSindicato,
          modulo: 'Postulaciones & Padrón',
          accion: `Rechazo de Postulación: ${postulacion.full_name}`,
          detalle: `Se rechazó la postulación de ${postulacion.full_name} (RUT: ${postulacion.rut}).`,
          admin_nombre: adminNombreActual,
          admin_email: adminEmailActual,
          admin_rol: userRol.toUpperCase(),
          fecha_iso: new Date().toISOString()
        };

        await supabase
          .from('sindicatos')
          .update({
            config_ui: {
              ...(sindData?.config_ui || {}),
              alertas_superadmin: alertasSAPrevias,
              resoluciones_directivas: [nuevaResolucion, ...resolPrevias.slice(0, 49)],
              alertas_socios: [avisoRechazo, ...alertasSociosPrevias.slice(0, 25)],
              bitacora_auditoria: [eventoAudit, ...bitacoraPrevia.slice(0, 79)]
            }
          })
          .eq('id', idSindicatoActual);
      }

      lanzarToast(`Postulación de ${postulacion.full_name} marcada como RECHAZADA en tiempo real.`, 'info');
      fetchEnterpriseData(idSindicatoActual || undefined);
    } catch (err: any) {
      lanzarToast('Error al rechazar: ' + err.message, 'error');
    }
  };

  // --- GENERADOR DE NOTIFICACIONES PARA SOCIOS DEL SINDICATO ---
  const handleEnviarNotificacionSocios = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSindicatoActual) return lanzarToast('No se detectó el sindicato activo.', 'error');
    if (!notifTitulo.trim() || !notifMensaje.trim()) return;

    setEnviandoNotif(true);
    try {
      const supabase = createClient();

      const destinatarios =
        notifDestinatario === 'todos'
          ? usuarios
          : usuarios.filter((u) => u.id === notifDestinatario);

      const { data: sindData } = await supabase
        .from('sindicatos')
        .select('config_ui')
        .eq('id', idSindicatoActual)
        .maybeSingle();

      const alertasSociosPrevias = Array.isArray(sindData?.config_ui?.alertas_socios)
        ? sindData.config_ui.alertas_socios
        : [];
      const bitacoraPrevia = Array.isArray(sindData?.config_ui?.bitacora_auditoria)
        ? sindData.config_ui.bitacora_auditoria
        : [];

      const nuevaAlertaSocio = {
        id: `notif-${Date.now()}`,
        destinatario: notifDestinatario,
        tipo: notifTipo,
        titulo: notifTitulo.trim(),
        mensaje: notifMensaje.trim(),
        emisor_email: adminEmailActual,
        created_at: new Date().toISOString(),
        leido: false
      };

      const logNotif = {
        id: `adm-notif-${Date.now()}`,
        sindicato_id: idSindicatoActual,
        sindicato_nombre: editNombreSindicato,
        modulo: 'Notificaciones & Alertas',
        accion: `Emisión de ${notifTipo}`,
        detalle: `Título: "${notifTitulo.trim()}" • Destino: ${notifDestinatario === 'todos' ? `Todos los socios (${usuarios.length})` : 'Socio individual'}`,
        admin_nombre: adminNombreActual,
        admin_email: adminEmailActual,
        admin_rol: userRol.toUpperCase(),
        fecha_iso: new Date().toISOString()
      };

      await supabase
        .from('sindicatos')
        .update({
          config_ui: {
            ...(sindData?.config_ui || {}),
            alertas_socios: [nuevaAlertaSocio, ...alertasSociosPrevias.slice(0, 19)],
            bitacora_auditoria: [logNotif, ...bitacoraPrevia.slice(0, 79)]
          }
        })
        .eq('id', idSindicatoActual);

      if (publicarEnMuro && notifDestinatario === 'todos') {
        await supabase.from('comunicados').insert([
          {
            sindicato_id: idSindicatoActual,
            titulo: notifTitulo.trim(),
            contenido: notifMensaje.trim(),
            fecha_creacion: new Date().toISOString()
          }
        ]);
      }

      lanzarToast(
        `Alerta despachada en vivo a ${destinatarios.length || 1} socio(s) de ${editNombreSindicato}.`,
        'exito'
      );
      setNotifTitulo('');
      setNotifMensaje('');
      fetchEnterpriseData(idSindicatoActual);
    } catch (err: any) {
      lanzarToast('Error al despachar notificaciones: ' + err.message, 'error');
    } finally {
      setEnviandoNotif(false);
    }
  };

  // --- SOFT DELETE ATÓMICO ---
  const actualizarModulosEnDB = async (
    nuevosModulos: Record<string, boolean>,
    detalleCambio: string
  ) => {
    if (!idSindicatoActual) return lanzarToast('Error: No se detectó el sindicato activo.', 'error');
    setGuardandoModulo(true);
    setModulosActivos(nuevosModulos);

    try {
      const supabase = createClient();
      const { data: sindicato } = await supabase
        .from('sindicatos')
        .select('config_ui')
        .eq('id', idSindicatoActual)
        .maybeSingle();

      const bitacoraPrevia = Array.isArray(sindicato?.config_ui?.bitacora_auditoria)
        ? sindicato.config_ui.bitacora_auditoria
        : [];

      const logModulo = {
        id: `adm-mod-${Date.now()}`,
        sindicato_id: idSindicatoActual,
        sindicato_nombre: editNombreSindicato,
        modulo: 'Módulos & Soft Delete',
        accion: 'Modificación de Visibilidad de Módulos',
        detalle: detalleCambio,
        admin_nombre: adminNombreActual,
        admin_email: adminEmailActual,
        admin_rol: userRol.toUpperCase(),
        fecha_iso: new Date().toISOString()
      };

      const nuevoConfigUI = {
        ...(sindicato?.config_ui || {}),
        modulos_activos: nuevosModulos,
        bitacora_auditoria: [logModulo, ...bitacoraPrevia.slice(0, 79)]
      };

      const { error } = await supabase
        .from('sindicatos')
        .update({ config_ui: nuevoConfigUI })
        .eq('id', idSindicatoActual);

      if (error) throw error;
      setBitacoraLocal([logModulo, ...bitacoraPrevia]);
      lanzarToast(detalleCambio, 'info');
    } catch (err: any) {
      lanzarToast('Error al actualizar módulo: ' + err.message, 'error');
      fetchEnterpriseData(idSindicatoActual);
    } finally {
      setGuardandoModulo(false);
    }
  };

  const toggleModuloSoftDelete = async (nombreModulo: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    const actualizados = {
      ...modulosActivos,
      [nombreModulo]: nuevoEstado
    };
    const labelMod = MODULOS_BASE[nombreModulo]?.label || nombreModulo;
    await actualizarModulosEnDB(
      actualizados,
      `Módulo "${labelMod}" ${nuevoEstado ? 'ACTIVADO (visible para socios)' : 'OCULTO (Soft Delete)'}.`
    );
  };

  const cambiarTodosLosModulos = async (estado: boolean) => {
    const todos: Record<string, boolean> = {};
    Object.keys(MODULOS_BASE).forEach((k) => {
      todos[k] = estado;
    });
    await actualizarModulosEnDB(
      todos,
      estado ? 'Se activaron los 10 módulos del sindicato.' : 'Se ocultaron todos los módulos secundarios (Soft Delete).'
    );
  };

  const handleGuardarConfiguracionJSONB = async () => {
    if (!idSindicatoActual) return;
    setGuardandoTema(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('sindicatos')
        .update({ configuracion: configUI })
        .eq('id', idSindicatoActual);

      if (error) throw error;
      await registrarAuditoriaAdmin(
        'Estudio UI (JSONB)',
        'Actualización de Tema y Portada del Sindicato',
        `Se publicaron nuevos colores (Acento: ${configUI.tema?.color_acento}) y lema "${configUI.hero?.titulo}".`
      );
      lanzarToast('Diseño y configuración publicados para tus socios.', 'exito');
    } catch (err: any) {
      lanzarToast('Error al guardar tema: ' + err.message, 'error');
    } finally {
      setGuardandoTema(false);
    }
  };

  const handleCrearAsambleaHistorica = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloNuevaAsamblea.trim() || !idSindicatoActual) return;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tituloLimpio = tituloNuevaAsamblea.trim();
      await supabase.from('historial_asambleas').insert([
        {
          titulo: tituloLimpio,
          sindicato_id: idSindicatoActual,
          created_by: user.id,
          creador_nombre: adminNombreActual || 'Administrador'
        }
      ]);

      await registrarAuditoriaAdmin(
        'Historial & Asambleas',
        'Apertura de Nueva Sesión de Asamblea',
        `El administrador inició la sesión oficial "${tituloLimpio}".`
      );

      setTituloNuevaAsamblea('');
      lanzarToast(`Sesión "${tituloLimpio}" creada y habilitada para QR.`, 'exito');
      fetchEnterpriseData(idSindicatoActual);
    } catch (err: any) {
      lanzarToast('Error: ' + err.message, 'error');
    }
  };

  const handleEliminarAsamblea = async (id: number, titulo: string) => {
    if (!window.confirm(`¿Deseas eliminar la asamblea "${titulo}" y sus registros?`)) return;
    try {
      const supabase = createClient();
      await supabase.from('historial_asambleas').delete().eq('id', id);
      await supabase
        .from('asistencia_asambleas')
        .delete()
        .eq('asamblea_titulo', titulo)
        .eq('sindicato_id', idSindicatoActual);

      await registrarAuditoriaAdmin(
        'Historial & Asambleas',
        'Eliminación de Sesión de Asamblea',
        `Se eliminó la sesión "${titulo}" junto a sus registros de asistencia.`
      );

      setHistorialAsambleas(historialAsambleas.filter((a) => a.id !== id));
      setAsistenciaRegistros(asistenciaRegistros.filter((a) => a.asamblea_titulo !== titulo));
      lanzarToast(`Sesión "${titulo}" eliminada.`, 'info');
    } catch (err: any) {
      lanzarToast('Error: ' + err.message, 'error');
    }
  };

  const exportarPadronSindicatoCSV = () => {
    const headers = ['Nombre_Completo', 'RUT', 'Correo', 'Rol', 'Estado', 'Sindicato'];
    const filas = usuarios.map((u) =>
      [
        `"${(u.full_name || 'Sin Nombre').replace(/"/g, '""')}"`,
        u.rut || 'S/I',
        u.email || '',
        u.role || 'socio',
        u.estado || 'activo',
        `"${editNombreSindicato}"`
      ].join(',')
    );
    const csvContent = [headers.join(','), ...filas].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Padron_${editNombreSindicato || 'Sindicato'}_${new Date().toLocaleDateString('es-CL')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    lanzarToast(`Padrón de ${editNombreSindicato} descargado en CSV.`, 'exito');
  };

  const exportarAsistenciaSindicatoCSV = () => {
    const headers = ['Asamblea', 'Nombre_Socio', 'RUT', 'Rol', 'Hora_Entrada', 'Hora_Salida', 'Operador'];
    const filas = asistenciaRegistros.map((a) =>
      [
        `"${(a.asamblea_titulo || 'Sesión').replace(/"/g, '""')}"`,
        `"${(a.usuario_nombre || 'Socio').replace(/"/g, '""')}"`,
        a.usuario_rut || '',
        a.usuario_rol || 'SOCIO',
        a.hora_entrada ? new Date(a.hora_entrada).toLocaleString('es-CL') : '',
        a.hora_salida ? new Date(a.hora_salida).toLocaleString('es-CL') : 'En Sala',
        `"${a.operador_nombre || adminNombreActual}"`
      ].join(',')
    );
    const csvContent = [headers.join(','), ...filas].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Asistencia_QR_${editNombreSindicato || 'Sindicato'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    lanzarToast('Reporte de asistencia QR exportado a CSV.', 'exito');
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = 'sb-sindicato-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/');
  };

  if (!isMounted || validando) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span suppressHydrationWarning className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
            Cargando Padrón & Presidencia Sindical V6...
          </span>
        </div>
      </div>
    );
  }

  // Una asistencia pertenece a una asamblea por su asamblea_id (migración 001).
  // Si el registro es antiguo y no tiene asamblea_id, se compara por título como antes.
  const perteneceAAsamblea = (asistencia: any, asamblea: any) =>
    asistencia.asamblea_id != null
      ? Number(asistencia.asamblea_id) === Number(asamblea.id)
      : asistencia.asamblea_titulo?.trim().toLowerCase() === asamblea.titulo?.trim().toLowerCase();

  // --- CÁLCULO DE MÉTRICAS Y FILTROS DEL PADRÓN DE POSTULACIONES ---
  const postulacionesPendientesCount = todasPostulacionesSind.filter(
    (p) => String(p.estado || 'Pendiente').toLowerCase() === 'pendiente'
  ).length;
  const postulacionesAprobadasCount = todasPostulacionesSind.filter(
    (p) => ['aceptada', 'aprobada'].includes(String(p.estado || '').toLowerCase())
  ).length;
  const postulacionesRechazadasCount = todasPostulacionesSind.filter(
    (p) => String(p.estado || '').toLowerCase() === 'rechazada'
  ).length;

  const postulacionesMostradas = todasPostulacionesSind.filter((p) => {
    const est = String(p.estado || 'Pendiente').toLowerCase();
    if (filtroEstadoPostulacion === 'pendientes') return est === 'pendiente';
    if (filtroEstadoPostulacion === 'aprobadas') return est === 'aceptada' || est === 'aprobada';
    if (filtroEstadoPostulacion === 'rechazadas') return est === 'rechazada';
    return true;
  });

  const totalSocios = usuarios.length;
  const sociosActivos = usuarios.filter((u) => (u.estado || 'activo').toLowerCase() === 'activo').length;
  const directivosLocales = usuarios.filter((u) =>
    ['admin', 'administrador', 'directiva', 'presidente'].includes(String(u.role || '').toLowerCase())
  ).length;
  const modulosVisiblesCount = Object.values(modulosActivos).filter(Boolean).length;
  const sociosEnSalaAhora = asistenciaRegistros.filter((a) => !a.hora_salida).length;

  const promedioAsistenciaPorAsamblea =
    historialAsambleas.length > 0
      ? Math.round(asistenciaRegistros.length / historialAsambleas.length)
      : 0;
  const porcentajeQuorumPromedio =
    totalSocios > 0
      ? Math.min(Math.round((promedioAsistenciaPorAsamblea / totalSocios) * 100), 100)
      : 0;

  const metricasOperativasSindicato = [
    { label: 'Socios en Padrón', count: totalSocios, color: '#06b6d4' },
    { label: 'Asistencias QR Validada', count: asistenciaRegistros.length, color: '#10b981' },
    { label: 'Asambleas Convocadas', count: historialAsambleas.length, color: '#3b82f6' },
    { label: 'Comunicados Oficiales', count: comunicadosSindicato.length, color: '#6366f1' },
    { label: 'Canjes de Beneficios', count: canjesSindicato.length, color: '#ec4899' },
    { label: 'Postulaciones Totales', count: todasPostulacionesSind.length, color: '#f59e0b' }
  ];
  const sumaOperativaLocal =
    metricasOperativasSindicato.reduce((acc, item) => acc + item.count, 0) || 1;

  const usuariosPadronFiltrados = usuarios.filter((u) => {
    if (!busquedaPadron.trim()) return true;
    const q = busquedaPadron.toLowerCase();
    return (
      String(u.full_name || '').toLowerCase().includes(q) ||
      String(u.rut || '').toLowerCase().includes(q) ||
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.role || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#090d16] font-sans text-slate-100 flex flex-col md:flex-row pb-24 md:pb-0 relative overflow-x-hidden">
      {/* TOASTS FLOTANTES V6 */}
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

      {/* TOP NAVBAR MÓVIL */}
      <header className="md:hidden sticky top-0 z-40 bg-[#060911]/95 backdrop-blur-xl border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm shrink-0">
            ⚡
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-xs truncate text-white">{editNombreSindicato || 'Sindicato Activo'}</h1>
            <p className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
              {userRol === 'superadmin' ? 'Modo SuperAdmin' : 'Presidencia Local'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-[10px] font-semibold"
          >
            <Icons.Home />
            <span>Portal</span>
          </Link>
        </div>
      </header>

      {/* SIDEBAR DESKTOP PRESIDENCIA SINDICAL */}
      <aside className="hidden md:flex w-72 bg-[#060911] border-r border-slate-800/80 flex-col justify-between shrink-0 shadow-2xl sticky top-0 h-screen">
        <div>
          <div className="p-5 border-b border-slate-800/80 space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
                ⚡
              </div>
              <div className="overflow-hidden">
                <h1 className="font-black text-sm truncate text-white">{editNombreSindicato || 'Mi Sindicato'}</h1>
                <p className="text-[10px] font-mono text-cyan-400 truncate mt-0.5">
                  {adminNombreActual} • {userRol.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Si entra el SuperAdmin, puede cambiar de Sindicato aquí mismo para validar sus postulaciones */}
            {userRol === 'superadmin' && listaSindicatosSA.length > 0 && (
              <div className="pt-1">
                <label className="text-[9px] font-mono uppercase tracking-wider text-amber-300 block mb-1">
                  ⚡ SuperAdmin: Cambiar Sindicato
                </label>
                <select
                  value={idSindicatoActual || ''}
                  onChange={(e) => handleCambiarSindicatoComoSuperAdmin(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                >
                  {listaSindicatosSA.map((s) => (
                    <option key={s.id} value={s.id}>
                      🏢 {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <nav className="p-4 space-y-1.5 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('postulaciones')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'postulaciones'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icons.UserCheck />
                <span>Padrón Postulaciones</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-black ${
                  postulacionesPendientesCount > 0
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                {todasPostulacionesSind.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('resumen')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'resumen'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icons.Chart />
                <span>Totales & Estadísticas</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400">V6</span>
            </button>

            <button
              onClick={() => setActiveTab('historial')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'historial'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icons.History />
                <span>Asambleas & QR</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{historialAsambleas.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('notificaciones')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'notificaciones'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Icons.Bell />
              <span>Emitir Notificaciones</span>
            </button>

            <button
              onClick={() => setActiveTab('padron')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'padron'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icons.Users />
                <span>Padrón de Socios</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">{usuarios.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('modulos')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'modulos'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icons.Modules />
                <span>Módulos Visibles</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">{modulosVisiblesCount}/10</span>
            </button>

            <button
              onClick={() => setActiveTab('tema')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'tema'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Icons.Palette />
              <span>Estudio UI (JSONB)</span>
            </button>

            <Link
              href="/dashboard/asistencia"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-all border border-emerald-500/20 mt-2"
            >
              <Icons.Scanner />
              <span>Abrir Escáner QR</span>
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800/80 space-y-2">
          {userRol === 'superadmin' && (
            <Link
              href="/superadmin"
              className="w-full flex items-center justify-center py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold tracking-wide transition-all"
            >
              ⚡ Ir a Master SaaS 360°
            </Link>
          )}
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold tracking-wide transition-all"
          >
            ← Volver al Portal Socios
          </Link>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ===================================================================== */}
          {/* TAB 1: PADRÓN DE POSTULACIONES DEL SINDICATO (SINCRONIZADO REALTIME)   */}
          {/* ===================================================================== */}
          {activeTab === 'postulaciones' && (
            <div className="bg-[#131c2e] p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-5">
              <header className="pb-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      Padrón de Postulaciones • {editNombreSindicato}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Sync Tiempo Real
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Solicitudes de socios y cargos directivos de <strong>{editNombreSindicato}</strong>. Cuando el SuperAdmin aprueba o rechaza, el estado se actualiza aquí en vivo.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setMostrarFormPostulacion(!mostrarFormPostulacion)}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
                  >
                    <Icons.Plus />
                    <span>{mostrarFormPostulacion ? 'Cerrar Registro' : 'Registrar Postulante'}</span>
                  </button>
                </div>
              </header>

              {/* FORMULARIO DESPLEGABLE PARA INSCRIBIR POSTULANTE EN ESTE SINDICATO */}
              <AnimatePresence>
                {mostrarFormPostulacion && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleCrearPostulacionPadron}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-3 text-xs overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">
                        Inscribir Postulación en {editNombreSindicato}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Se notificará en tiempo real al SuperAdmin si el rol es Admin
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input
                        type="text"
                        required
                        value={nuevoPostNombre}
                        onChange={(e) => setNuevoPostNombre(e.target.value)}
                        placeholder="Nombre completo (ej: Alexander)"
                        className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                      />
                      <input
                        type="text"
                        required
                        value={nuevoPostRut}
                        onChange={(e) => setNuevoPostRut(e.target.value)}
                        placeholder="RUT (ej: 203827326)"
                        className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                      />
                      <input
                        type="email"
                        required
                        value={nuevoPostEmail}
                        onChange={(e) => setNuevoPostEmail(e.target.value)}
                        placeholder="Correo electrónico"
                        className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                      />
                      <select
                        value={nuevoPostRol}
                        onChange={(e) => setNuevoPostRol(e.target.value as 'socio' | 'admin')}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-bold focus:outline-none focus:border-cyan-400"
                      >
                        <option value="admin">Cargo: ADMIN / DIRECTIVA</option>
                        <option value="socio">Cargo: SOCIO REGULAR</option>
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={creandoPostulacion}
                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl uppercase tracking-wider text-xs cursor-pointer"
                      >
                        {creandoPostulacion ? 'Guardando...' : 'Guardar en Padrón de Postulaciones'}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* FILTROS DEL PADRÓN DE POSTULACIONES (TODAS, PENDIENTES, APROBADAS, RECHAZADAS) */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: 'todas', label: `Todas (${todasPostulacionesSind.length})` },
                    { key: 'pendientes', label: `Pendientes / En Revisión (${postulacionesPendientesCount})` },
                    { key: 'aprobadas', label: `Aprobadas (${postulacionesAprobadasCount})` },
                    { key: 'rechazadas', label: `Rechazadas (${postulacionesRechazadasCount})` }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFiltroEstadoPostulacion(tab.key as any)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        filtroEstadoPostulacion === tab.key
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {userRol === 'superadmin' ? (
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold">
                    ⚡ Estás con rol SUPERADMIN: Puedes aprobar o rechazar cargos directivos aquí mismo
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono flex items-center gap-1.5">
                    <Icons.Lock />
                    <span>Cargos directivos se actualizan en vivo al ser firmados por SuperAdmin</span>
                  </span>
                )}
              </div>

              {/* LISTA DEL PADRÓN DE POSTULACIONES DE ESTE SINDICATO */}
              {postulacionesMostradas.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800/80">
                  No hay postulaciones en este filtro para {editNombreSindicato}.
                </div>
              ) : (
                <div className="space-y-3">
                  {postulacionesMostradas.map((post) => {
                    const esCargoAlto = esPostulacionDirectiva(post.rol_solicitado);
                    const estadoNorm = String(post.estado || 'Pendiente').toLowerCase();
                    const estaPendiente = estadoNorm === 'pendiente';
                    const estaAprobada = estadoNorm === 'aceptada' || estadoNorm === 'aprobada';
                    const estaRechazada = estadoNorm === 'rechazada';
                    const puedeAprobarDirecto = !esCargoAlto || userRol === 'superadmin';
                    const yaNotificado =
                      Boolean(post.escalado_superadmin) ||
                      Boolean(solicitudesEnviadas[String(post.id)]) ||
                      Boolean(solicitudesEnviadas[String(post.rut)]);

                    return (
                      <motion.div
                        key={post.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 sm:p-5 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
                          estaAprobada
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : estaRechazada
                            ? 'bg-rose-950/20 border-rose-500/40'
                            : esCargoAlto
                            ? 'bg-slate-900/90 border-amber-500/40 shadow-lg'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="space-y-1.5 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-white text-sm sm:text-base">{post.full_name}</p>

                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${
                                esCargoAlto
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                              }`}
                            >
                              Rol Solicitado: {String(post.rol_solicitado || 'SOCIO').toUpperCase()}
                            </span>

                            {/* BADGE DE ESTADO EN TIEMPO REAL */}
                            {estaAprobada && (
                              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                <Icons.Check />
                                Aprobado en Tiempo Real
                              </span>
                            )}
                            {estaRechazada && (
                              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                <Icons.X />
                                Rechazado
                              </span>
                            )}
                            {estaPendiente && yaNotificado && (
                              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
                                ⏳ Escalado a SuperAdmin (Esperando Firma)
                              </span>
                            )}
                          </div>

                          <p className="text-slate-300 font-mono">
                            RUT: <strong className="text-white">{post.rut}</strong> • Correo:{' '}
                            <strong className="text-cyan-300">{post.email}</strong>
                          </p>

                          {post.mensaje_original && (
                            <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl mt-1">
                              📋 {post.mensaje_original}
                            </p>
                          )}

                          {post.resuelto_por && (
                            <p className="text-[10px] font-mono text-emerald-400">
                              ✔ Dictamen firmado por: {post.resuelto_por}{' '}
                              {post.fecha_resolucion
                                ? `(${new Date(post.fecha_resolucion).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs)`
                                : ''}
                            </p>
                          )}
                        </div>

                        {/* BOTONES DE ACCIÓN SEGÚN ROL Y ESTADO */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {estaPendiente ? (
                            puedeAprobarDirecto ? (
                              <>
                                <button
                                  onClick={() => handleAprobarPostulacion(post)}
                                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Icons.Check />
                                  <span>
                                    {esCargoAlto ? 'Validar y Aprobar Admin' : 'Aprobar Socio'}
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleRechazarPostulacion(post)}
                                  className="px-4 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  Rechazar
                                </button>
                              </>
                            ) : (
                              <button
                                disabled={solicitandoSuperAdminId === post.id || yaNotificado}
                                onClick={() => handleSolicitarAprobacionSuperAdmin(post)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border shadow-md cursor-pointer ${
                                  yaNotificado
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 cursor-default'
                                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-amber-500/20'
                                }`}
                              >
                                {yaNotificado ? (
                                  <>
                                    <Icons.Clock />
                                    <span>Esperando Resolución de SuperAdmin...</span>
                                  </>
                                ) : (
                                  <>
                                    <Icons.Bell />
                                    <span>
                                      {solicitandoSuperAdminId === post.id
                                        ? 'Notificando...'
                                        : 'Solicitar Aprobación a SuperAdmin'}
                                    </span>
                                  </>
                                )}
                              </button>
                            )
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border ${
                                  estaAprobada
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                }`}
                              >
                                {estaAprobada ? '✅ APROBADO EN PADRÓN' : '❌ SOLICITUD RECHAZADA'}
                              </span>
                              {userRol === 'superadmin' && (
                                <button
                                  onClick={() =>
                                    estaAprobada
                                      ? handleRechazarPostulacion(post)
                                      : handleAprobarPostulacion(post)
                                  }
                                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700 cursor-pointer"
                                >
                                  Cambiar a {estaAprobada ? 'Rechazado' : 'Aprobado'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 2: TOTALES, GRÁFICOS Y ESTADÍSTICAS EXCLUSIVAS DEL SINDICATO      */}
          {/* ===================================================================== */}
          {activeTab === 'resumen' && (
            <div className="space-y-6">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Estadísticas & Totales • {editNombreSindicato || 'Mi Sindicato'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                      ID #{idSindicatoActual}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Panel exclusivo de Presidencia y Directiva Local • Responsable activo: <strong className="text-emerald-400 font-mono">{adminNombreActual} ({adminEmailActual})</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={exportarPadronSindicatoCSV}
                    className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
                  >
                    <Icons.Download />
                    <span>Exportar Padrón</span>
                  </button>
                  <button
                    onClick={exportarAsistenciaSindicatoCSV}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <Icons.Download />
                    <span>Asistencias CSV</span>
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-[#131c2e] border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Socios del Sindicato</span>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">{totalSocios}</div>
                  <span className="text-[10px] text-emerald-400 font-mono mt-1.5 block">
                    {sociosActivos} Activos • {directivosLocales} Directivos
                  </span>
                </div>

                <div className="bg-[#131c2e] border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Asistencias QR</span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-1">{asistenciaRegistros.length}</div>
                  <span className="text-[10px] text-amber-300 font-mono mt-1.5 block">
                    {sociosEnSalaAhora} Socio(s) en sala ahora
                  </span>
                </div>

                <div className="bg-[#131c2e] border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Quórum Promedio</span>
                  <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono mt-1">{porcentajeQuorumPromedio}%</div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1.5 block">
                    En {historialAsambleas.length} Asambleas
                  </span>
                </div>

                <div className="bg-[#131c2e] border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Postulaciones</span>
                  <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono mt-1">{postulacionesPendientesCount}</div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1.5 block">
                    Pendientes ({todasPostulacionesSind.length} totales)
                  </span>
                </div>

                <div className="bg-[#131c2e] border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Avisos Oficiales</span>
                  <div className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono mt-1">{comunicadosSindicato.length}</div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1.5 block">
                    Publicados en el muro
                  </span>
                </div>

                <div className="bg-[#131c2e] border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Módulos Activos</span>
                  <div className="text-2xl sm:text-3xl font-black text-pink-400 font-mono mt-1">
                    {modulosVisiblesCount}/10
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1.5 block">
                    {canjesSindicato.length} Beneficios canjeados
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-[#131c2e] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        Quórum y Participación por Asamblea
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Comparativa de asistencia QR registrada en las sesiones de {editNombreSindicato}.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('historial')}
                      className="text-xs font-mono text-cyan-400 hover:underline cursor-pointer"
                    >
                      Gestionar sesiones →
                    </button>
                  </div>

                  {historialAsambleas.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      Aún no se han creado sesiones de asamblea en este sindicato.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {historialAsambleas.slice(0, 6).map((asam) => {
                        const asistentesSesion = asistenciaRegistros.filter((a) => perteneceAAsamblea(a, asam));
                        const enSala = asistentesSesion.filter((a) => !a.hora_salida).length;
                        const pctQuorum =
                          totalSocios > 0
                            ? Math.min(Math.round((asistentesSesion.length / totalSocios) * 100), 100)
                            : asistentesSesion.length > 0
                            ? 100
                            : 0;

                        return (
                          <div key={asam.id} className="p-3.5 rounded-2xl bg-slate-900/75 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <div className="truncate pr-2">
                                <span className="font-bold text-white">{asam.titulo}</span>
                                <span className="text-[10px] font-mono text-slate-400 ml-2">
                                  ({new Date(asam.created_at).toLocaleDateString('es-CL')})
                                </span>
                              </div>
                              <span className="font-mono text-xs font-black text-emerald-400 shrink-0">
                                {asistentesSesion.length} / {totalSocios || 1} socios ({pctQuorum}%)
                              </span>
                            </div>

                            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(pctQuorum, asistentesSesion.length > 0 ? 6 : 0)}%` }}
                                transition={{ duration: 0.6 }}
                                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
                              />
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                              <span>Convocada por: {asam.creador_nombre || adminNombreActual}</span>
                              {enSala > 0 && (
                                <span className="text-amber-300 font-bold">● {enSala} actualmente en sala</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 bg-[#131c2e] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-5">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Volumen Operativo del Sindicato
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Actividad acumulada por cada módulo dentro de tu organización.
                    </p>
                  </div>

                  <div className="space-y-3.5 my-auto">
                    {metricasOperativasSindicato.map((m) => {
                      const pct = Math.round((m.count / sumaOperativaLocal) * 100);
                      return (
                        <div key={m.label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                              {m.label}
                            </span>
                            <span className="font-mono text-xs text-slate-300">
                              <strong className="text-white">{m.count}</strong> ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(pct, m.count > 0 ? 5 : 0)}%` }}
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
                    <span className="text-slate-400 font-mono">Sincronización SuperAdmin:</span>
                    <span className="text-emerald-400 font-mono font-bold">● Tiempo Real Activo</span>
                  </div>
                </div>
              </div>

              {/* TENDENCIAS MES A MES (funciones reporte_* de la migración 002) */}
              <TendenciasSindicato sindicatoId={idSindicatoActual} />
            </div>
          )}

          {/* TAB 3: EMITIR NOTIFICACIONES */}
          {activeTab === 'notificaciones' && (
            <div className="bg-[#131c2e] p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
              <header className="border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Icons.Bell />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Centro de Emisión de Alertas y Notificaciones</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Envía notificaciones en tiempo real a la Campanita de los socios de {editNombreSindicato}.
                    </p>
                  </div>
                </div>
              </header>

              <form onSubmit={handleEnviarNotificacionSocios} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1.5 uppercase tracking-wider text-[10px]">
                      Destinatarios
                    </label>
                    <select
                      value={notifDestinatario}
                      onChange={(e) => setNotifDestinatario(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="todos">📢 Todos los Socios del Sindicato ({usuarios.length})</option>
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.id}>
                          👤 {u.full_name || u.email} ({u.rut || 'Sin RUT'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1.5 uppercase tracking-wider text-[10px]">
                      Categoría de Alerta
                    </label>
                    <select
                      value={notifTipo}
                      onChange={(e: any) => setNotifTipo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Aviso Oficial">Aviso Oficial</option>
                      <option value="Urgente">Urgente</option>
                      <option value="Asamblea">Citación a Asamblea</option>
                      <option value="Beneficio">Nuevo Beneficio</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1.5 uppercase tracking-wider text-[10px]">
                    Título de la Notificación
                  </label>
                  <input
                    type="text"
                    required
                    value={notifTitulo}
                    onChange={(e) => setNotifTitulo(e.target.value)}
                    placeholder="Ej: Citación a Asamblea Extraordinaria este Viernes 18:00 hrs..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1.5 uppercase tracking-wider text-[10px]">
                    Mensaje Detallado
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={notifMensaje}
                    onChange={(e) => setNotifMensaje(e.target.value)}
                    placeholder="Escribe el contenido que verán los socios al abrir la campanita de alertas..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-cyan-400 resize-none"
                  />
                </div>

                {notifDestinatario === 'todos' && (
                  <label className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={publicarEnMuro}
                      onChange={(e) => setPublicarEnMuro(e.target.checked)}
                      className="w-4 h-4 rounded accent-cyan-500"
                    />
                    <span className="text-slate-300 text-xs font-medium">
                      Publicar simultáneamente en el <strong>Muro de Comunicados Oficiales</strong> del Dashboard principal
                    </span>
                  </label>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={enviandoNotif}
                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Icons.Send />
                    <span>{enviandoNotif ? 'Despachando Alerta...' : 'Emitir Notificación Ahora'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: HISTORIAL DE ASAMBLEAS */}
          {activeTab === 'historial' && (
            <div className="space-y-6">
              <header className="pb-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Historial de Asambleas & Asistencias</h2>
                  <p className="text-xs text-slate-400 mt-1">Crea sesiones oficiales y audita la asistencia de socios en vivo.</p>
                </div>
                <button
                  onClick={exportarAsistenciaSindicatoCSV}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <Icons.Download />
                  <span>Descargar Planilla QR</span>
                </button>
              </header>

              <form onSubmit={handleCrearAsambleaHistorica} className="bg-[#131c2e] p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">Iniciar Nueva Sesión Oficial</span>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    required
                    value={tituloNuevaAsamblea}
                    onChange={(e) => setTituloNuevaAsamblea(e.target.value)}
                    placeholder="Ej: Asamblea Ordinaria de Rendición de Cuentas..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    <Icons.Plus />
                    <span>Crear Sesión</span>
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {historialAsambleas.length === 0 ? (
                  <div className="bg-[#131c2e]/60 border border-slate-800 p-10 rounded-3xl text-center text-slate-500 text-xs">
                    No existen asambleas registradas en {editNombreSindicato}.
                  </div>
                ) : (
                  historialAsambleas.map((asam) => {
                    const asistentes = asistenciaRegistros.filter((a) => perteneceAAsamblea(a, asam));

                    return (
                      <div key={asam.id} className="bg-[#131c2e] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                          <div>
                            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                              {new Date(asam.created_at).toLocaleDateString('es-CL')}
                            </span>
                            <h3 className="text-base font-bold text-white mt-1.5">{asam.titulo}</h3>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-mono font-bold">
                              {asistentes.length} Asistente(s)
                            </span>
                            <button
                              onClick={() => handleEliminarAsamblea(asam.id, asam.titulo)}
                              className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition-colors cursor-pointer"
                              title="Eliminar sesión"
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        </div>

                        {asistentes.length === 0 ? (
                          <p className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                            Aún no se han escaneado credenciales para esta sesión.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {asistentes.map((asist) => {
                              const horaIngreso = asist.hora_entrada
                                ? new Date(asist.hora_entrada).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                                : '--:--';
                              const horaSalida = asist.hora_salida
                                ? new Date(asist.hora_salida).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                                : null;

                              return (
                                <div key={asist.id} className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2 text-xs">
                                  <div className="flex justify-between items-start">
                                    <span className="font-bold text-white truncate block">{asist.usuario_nombre || 'Socio'}</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                      {asist.usuario_rol || 'SOCIO'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-mono text-slate-400">{asist.usuario_rut}</p>
                                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] font-mono">
                                      <span className="text-slate-400">Entrada:</span>
                                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                        {horaIngreso} hrs
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-mono">
                                      <span className="text-slate-400">Salida:</span>
                                      {horaSalida ? (
                                        <span className="text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                          {horaSalida} hrs
                                        </span>
                                      ) : (
                                        <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 animate-pulse">
                                          En Sala
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PADRÓN DE SOCIOS */}
          {activeTab === 'padron' && (
            <div className="bg-[#131c2e] p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-white">
                    Padrón Oficial de Socios • {editNombreSindicato} ({usuariosPadronFiltrados.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Nómina exclusiva de miembros verificados en tu organización sindical.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={busquedaPadron}
                    onChange={(e) => setBusquedaPadron(e.target.value)}
                    placeholder="Buscar socio por nombre, RUT o correo..."
                    className="w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={exportarPadronSindicatoCSV}
                    className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Icons.Download />
                    <span className="hidden sm:inline">CSV</span>
                  </button>
                </div>
              </header>

              <div className="divide-y divide-slate-800 max-h-[560px] overflow-y-auto pr-1">
                {usuariosPadronFiltrados.map((u) => (
                  <div key={u.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <p className="font-bold text-white text-sm">{u.full_name || 'Sin Nombre'}</p>
                      <p className="text-slate-400 font-mono mt-0.5">
                        RUT: {u.rut || 'N/A'} • {u.email}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase bg-slate-900 text-cyan-300 border border-slate-700 font-bold">
                      {u.role || 'Socio'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: MÓDULOS VISIBLES */}
          {activeTab === 'modulos' && (
            <div className="bg-[#131c2e] p-5 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white">Módulos Activos del Sindicato (Soft Delete)</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Oculta o muestra secciones en el Navbar y Portal de {editNombreSindicato} en tiempo real ({modulosVisiblesCount}/10 activos).
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={guardandoModulo}
                    onClick={() => cambiarTodosLosModulos(true)}
                    className="px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer"
                  >
                    Activar Todos
                  </button>
                  <button
                    disabled={guardandoModulo}
                    onClick={() => cambiarTodosLosModulos(false)}
                    className="px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all cursor-pointer"
                  >
                    Ocultar Todos
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {Object.entries(MODULOS_BASE).map(([key, info]) => {
                  const activo = Boolean(modulosActivos[key]);
                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                        activo
                          ? 'bg-slate-900/70 border-slate-700/80'
                          : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${activo ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
                          <h4 className="font-bold text-white text-xs">{info.label}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{info.desc}</p>
                      </div>
                      <button
                        disabled={guardandoModulo}
                        onClick={() => toggleModuloSoftDelete(key, activo)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border shrink-0 cursor-pointer ${
                          activo
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                        }`}
                      >
                        {activo ? 'Ocultar' : 'Activar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: ESTUDIO UI / TEMA JSONB */}
          {activeTab === 'tema' && (
            <div className="bg-[#131c2e] p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
              <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white">Diseño Visual y Configuración JSONB</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Personaliza los colores y lemas corporativos exclusivamente para {editNombreSindicato}.
                  </p>
                </div>
                <button
                  onClick={handleGuardarConfiguracionJSONB}
                  disabled={guardandoTema}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  {guardandoTema ? 'Guardando...' : 'Aplicar a Socios'}
                </button>
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
                          value={configUI.tema?.fondo_base || '#090d16'}
                          onChange={(e) => setConfigUI({ ...configUI, tema: { ...configUI.tema, fondo_base: e.target.value } })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                        />
                        <span className="font-mono text-slate-300">{configUI.tema?.fondo_base}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Tarjetas / Contenedores:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={configUI.tema?.color_tarjetas || '#131b2e'}
                          onChange={(e) => setConfigUI({ ...configUI, tema: { ...configUI.tema, color_tarjetas: e.target.value } })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                        />
                        <span className="font-mono text-slate-300">{configUI.tema?.color_tarjetas}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Color Acento (Botones):</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={configUI.tema?.color_acento || '#06b6d4'}
                          onChange={(e) => setConfigUI({ ...configUI, tema: { ...configUI.tema, color_acento: e.target.value } })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                        />
                        <span className="font-mono text-slate-300">{configUI.tema?.color_acento}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                  <span className="font-bold text-white text-xs block uppercase tracking-wider">Textos de Bienvenida</span>
                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Título Hero</label>
                      <input
                        type="text"
                        value={configUI.hero?.titulo || ''}
                        onChange={(e) => setConfigUI({ ...configUI, hero: { ...configUI.hero, titulo: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Subtítulo Hero</label>
                      <input
                        type="text"
                        value={configUI.hero?.subtitulo || ''}
                        onChange={(e) => setConfigUI({ ...configUI, hero: { ...configUI.hero, subtitulo: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}