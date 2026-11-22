'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import emailjs from '@emailjs/browser';
import { createClient } from '../../lib/supabase';

// --- CONFIGURACIÓN EMAILJS EXCLUSIVA PARA INCORPORACIÓN DE SOCIOS ---
const EMAILJS_SERVICE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_thw7gfn';
const EMAILJS_TEMPLATE_SOCIO_ID =
  process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_SOCIO_ID || '';
const EMAILJS_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';

function obtenerBaseUrlPublica(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

type AdminTab =
  | 'postulaciones'
  | 'estadisticas'
  | 'asambleas'
  | 'notificaciones'
  | 'socios'
  | 'modulos'
  | 'tema';

const MODULOS_BASE: Record<string, { label: string; desc: string }> = {
  beneficios: { label: 'Beneficios', desc: 'Convenios y descuentos para socios' },
  legal: { label: 'Asesoría Legal', desc: 'Orientación jurídica laboral con IA' },
  credencial: { label: 'Credencial Digital', desc: 'Carnet de socio con código QR' },
  asistencia: { label: 'Asistencia', desc: 'Registro de entrada y salida en asambleas' },
  actas: { label: 'Actas y Documentos', desc: 'Archivo oficial del sindicato' },
  finanzas: { label: 'Finanzas', desc: 'Balances y transparencia de fondos' },
  encuestas: { label: 'Votaciones', desc: 'Consultas y votaciones internas' },
  negociacion: { label: 'Negociación', desc: 'Avances de contratos colectivos' },
  solidario: { label: 'Fondo Solidario', desc: 'Apoyo mutuo y ayudas de emergencia' },
  soporte: { label: 'Mesa de Ayuda', desc: 'Consultas y tickets de socios' },
};

const PALETAS_PRESET = [
  {
    nombre: 'Clásico PYC (Dorado)',
    fondo_base: '#0b0e14',
    color_tarjetas: '#121722',
    color_acento: '#e5b32a',
    color_borde: '#252e42',
  },
  {
    nombre: 'Océano Institucional',
    fondo_base: '#090f1d',
    color_tarjetas: '#131d31',
    color_acento: '#38bdf8',
    color_borde: '#22304a',
  },
  {
    nombre: 'Esmeralda Sindical',
    fondo_base: '#091311',
    color_tarjetas: '#11201d',
    color_acento: '#34d399',
    color_borde: '#1e3832',
  },
  {
    nombre: 'Azul Ejecutivo',
    fondo_base: '#0b0d17',
    color_tarjetas: '#15192b',
    color_acento: '#818cf8',
    color_borde: '#282f4d',
  },
];

function esCargoDirectivo(rol?: string | null): boolean {
  return ['admin', 'administrador', 'directiva', 'presidente'].includes(
    String(rol || '').trim().toLowerCase()
  );
}

function formatRutLegible(raw?: string | null): string {
  const clean = String(raw || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return raw || 'Sin RUT';
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

function formatRutInputSinPuntos(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
  if (clean.length <= 1) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

async function copiarTextoSeguro(texto: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Fallback
  }
  try {
    const el = document.createElement('textarea');
    el.value = texto;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  } catch {
    return false;
  }
}

function AdminDashboardContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [validando, setValidando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  // Sesión y contexto multi-tenant
  const [perfilActual, setPerfilActual] = useState<any>(null);
  const [userRol, setUserRol] = useState<string>('admin');
  const [idSindicatoActual, setIdSindicatoActual] = useState<number | null>(null);
  const [sindicatosDisponibles, setSindicatosDisponibles] = useState<any[]>([]);
  const [sindicatoInfo, setSindicatoInfo] = useState<any>(null);

  // Navegación y avisos
  const [activeTab, setActiveTab] = useState<AdminTab>('postulaciones');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [errorPostulacion, setErrorPostulacion] = useState<{
    id: number;
    nombre: string;
    mensaje: string;
  } | null>(null);

  // Datos principales
  const [postulaciones, setPostulaciones] = useState<any[]>([]);
  const [socios, setSocios] = useState<any[]>([]);
  const [historialAsambleas, setHistorialAsambleas] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [comunicados, setComunicados] = useState<any[]>([]);

  // Estados de Postulaciones
  const [filtroPost, setFiltroPost] = useState<'Todas' | 'Pendientes' | 'Aprobadas' | 'Rechazadas'>('Todas');
  const [busquedaPost, setBusquedaPost] = useState('');
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [modalNuevoPostulante, setModalNuevoPostulante] = useState(false);
  const [formNuevoPost, setFormNuevoPost] = useState({
    full_name: '',
    rut: '',
    email: '',
    telefono: '',
    rol_solicitado: 'socio',
  });
  const [postARechazar, setPostARechazar] = useState<any>(null);
  const [credSocioAprobado, setCredSocioAprobado] = useState<{
    ordenSocio: string;
    fullName: string;
    rut: string;
    email: string;
    password: string;
    codigoCorreo: string;
    linkValidacion: string;
    role: string;
    correoEnviado: boolean;
  } | null>(null);
  const [escaladosIds, setEscaladosIds] = useState<Record<number, boolean>>({});

  // Estados de Asambleas
  const [tituloNuevaAsamblea, setTituloNuevaAsamblea] = useState('');
  const [creandoAsamblea, setCreandoAsamblea] = useState(false);
  const [asambleaAEliminar, setAsambleaAEliminar] = useState<any>(null);

  // Estados de Notificaciones
  const [notifDestino, setNotifDestino] = useState<string>('todos');
  const [notifTitulo, setNotifTitulo] = useState('');
  const [notifMensaje, setNotifMensaje] = useState('');
  const [enviandoNotif, setEnviandoNotif] = useState(false);

  // Estados de Padrón de Socios
  const [busquedaSocio, setBusquedaSocio] = useState('');
  const [socioEdit, setSocioEdit] = useState<any>(null);
  const [formSocioEdit, setFormSocioEdit] = useState({ role: 'socio', estado: 'activo' });

  // Estados de Módulos y Apariencia
  const [modulosActivos, setModulosActivos] = useState<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = {};
    Object.keys(MODULOS_BASE).forEach((k) => {
      base[k] = true;
    });
    return base;
  });
  const [guardandoModulo, setGuardandoModulo] = useState<string | null>(null);
  const [configTema, setConfigTema] = useState({
    tema: {
      fondo_base: '#0b0e14',
      color_tarjetas: '#121722',
      color_acento: '#e5b32a',
      color_borde: '#252e42',
    },
    hero: {
      titulo: 'Tu sindicato, unido y digital.',
      subtitulo: 'Beneficios, actas, votaciones y respaldo en un solo lugar.',
    },
  });
  const [guardandoTema, setGuardandoTema] = useState(false);

  const notificar = useCallback((texto: string, tipo: 'ok' | 'err' = 'ok') => {
    setAviso({ tipo, texto });
    setTimeout(() => {
      setAviso((prev) => (prev?.texto === texto ? null : prev));
    }, 6000);
  }, []);

  const cargarDatosSindicato = useCallback(async (targetId: number) => {
    setActualizando(true);
    try {
      const supabase = createClient();

      const [sindRes, postRes, usrRes, histRes, asistRes, comRes] = await Promise.all([
        supabase.from('sindicatos').select('*').eq('id', targetId).maybeSingle(),
        supabase
          .from('postulaciones')
          .select('*')
          .eq('sindicato_id', targetId)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .eq('sindicato_id', targetId)
          .order('created_at', { ascending: false }),
        supabase
          .from('historial_asambleas')
          .select('*')
          .eq('sindicato_id', targetId)
          .order('created_at', { ascending: false }),
        supabase
          .from('asistencia_asambleas')
          .select('*')
          .eq('sindicato_id', targetId)
          .order('hora_entrada', { ascending: false }),
        supabase
          .from('comunicados')
          .select('*')
          .eq('sindicato_id', targetId)
          .order('id', { ascending: false })
          .limit(15),
      ]);

      if (sindRes.data) {
        setSindicatoInfo(sindRes.data);

        const modDb = sindRes.data.config_ui?.modulos_activos || {};
        const normalizados: Record<string, boolean> = {};
        Object.keys(MODULOS_BASE).forEach((k) => {
          normalizados[k] = modDb[k] !== undefined ? Boolean(modDb[k]) : true;
        });
        setModulosActivos(normalizados);

        if (sindRes.data.configuracion) {
          setConfigTema((prev) => ({
            tema: { ...prev.tema, ...(sindRes.data.configuracion.tema || {}) },
            hero: { ...prev.hero, ...(sindRes.data.configuracion.hero || {}) },
          }));
        }
      }

      if (Array.isArray(postRes.data)) setPostulaciones(postRes.data);
      if (Array.isArray(usrRes.data)) setSocios(usrRes.data);
      if (Array.isArray(histRes.data)) setHistorialAsambleas(histRes.data);
      if (Array.isArray(asistRes.data)) setAsistencias(asistRes.data);
      if (Array.isArray(comRes.data)) setComunicados(comRes.data);
    } finally {
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Autenticación inicial + carga de sindicato + suscripción Realtime
  useEffect(() => {
    if (!mounted) return;
    const supabase = createClient();
    let rtChannel: any = null;

    const iniciar = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      const { data: perfil } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const rol = String(perfil?.role || 'socio').trim().toLowerCase();
      if (!['superadmin', 'admin', 'administrador', 'directiva', 'presidente'].includes(rol)) {
        router.push('/dashboard');
        return;
      }

      setPerfilActual(perfil);
      setUserRol(rol);

      let targetSindId: number | null = perfil?.sindicato_id ? Number(perfil.sindicato_id) : null;

      if (rol === 'superadmin') {
        const { data: allSinds } = await supabase
          .from('sindicatos')
          .select('id, nombre, estado, validado')
          .order('id', { ascending: true });

        if (Array.isArray(allSinds) && allSinds.length > 0) {
          setSindicatosDisponibles(allSinds);
          const cached = localStorage.getItem('sindicato_activo');
          const cachedNum = cached ? Number(cached) : null;
          const existeCached = cachedNum && allSinds.some((s) => Number(s.id) === cachedNum);
          targetSindId = existeCached ? cachedNum : Number(allSinds[0].id);
        }
      }

      setIdSindicatoActual(targetSindId);
      setValidando(false);

      if (targetSindId) {
        localStorage.setItem('sindicato_activo', String(targetSindId));
        await cargarDatosSindicato(targetSindId);

        rtChannel = supabase
          .channel(`admin-live-${targetSindId}-${Date.now()}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'postulaciones', filter: `sindicato_id=eq.${targetSindId}` },
            () => cargarDatosSindicato(targetSindId!)
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'asistencia_asambleas', filter: `sindicato_id=eq.${targetSindId}` },
            () => cargarDatosSindicato(targetSindId!)
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'profiles', filter: `sindicato_id=eq.${targetSindId}` },
            () => cargarDatosSindicato(targetSindId!)
          )
          .subscribe();
      }
    };

    iniciar();

    return () => {
      if (rtChannel) supabase.removeChannel(rtChannel);
    };
  }, [mounted, router, cargarDatosSindicato]);

  // Cambiar de sindicato (solo SuperAdmin)
  const handleCambiarSindicato = async (nuevoIdStr: string) => {
    const nuevoId = Number(nuevoIdStr);
    if (!nuevoId) return;
    setErrorPostulacion(null);
    setIdSindicatoActual(nuevoId);
    localStorage.setItem('sindicato_activo', String(nuevoId));
    await cargarDatosSindicato(nuevoId);
    notificar('Cambiaste de organización correctamente.');
  };

  // --- DEVOLVER POSTULACIÓN A PENDIENTE ---
  const handleVolverAPendiente = async (post: any) => {
    setProcesandoId(post.id);
    setErrorPostulacion(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('postulaciones')
        .update({ estado: 'Pendiente' })
        .eq('id', post.id);
      if (error) throw error;

      setActiveTab('postulaciones');
      setFiltroPost('Pendientes');
      if (idSindicatoActual) await cargarDatosSindicato(idSindicatoActual);
      notificar(`La postulación de ${post.full_name} volvió a Pendientes para aprobarla nuevamente.`);
    } catch (err: any) {
      notificar(err.message || 'No se pudo devolver la postulación a Pendiente.', 'err');
    } finally {
      setProcesandoId(null);
    }
  };

  // --- APROBAR POSTULACIÓN: CREA USUARIO EN BD + ENVÍA ORDEN DE INCORPORACIÓN ---
  const handleAprobarPostulacion = async (post: any) => {
    const esDir = esCargoDirectivo(post.rol_solicitado);
    if (esDir && userRol !== 'superadmin') {
      notificar('Solo un SuperAdmin puede aprobar cargos de Directiva o Presidencia.', 'err');
      return;
    }

    setProcesandoId(post.id);
    setErrorPostulacion(null);
    const supabase = createClient();

    try {
      // 1. RPC atómico: crea el socio en auth.users + public.profiles con código Bcrypt
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('aprobar_postulacion_socio', {
        p_postulacion_id: post.id,
      });

      if (rpcErr) {
        throw new Error(
          rpcErr.message.includes('aprobar_postulacion_socio')
            ? 'Falta ejecutar el SQL de aprobar_postulacion_socio en Supabase.'
            : rpcErr.message
        );
      }

      if (!rpcRes?.ok) {
        throw new Error(rpcRes?.error || 'No se pudo agregar el usuario a la base de datos.');
      }

      const sindNombre = sindicatoInfo?.nombre || `Sindicato #${idSindicatoActual}`;
      const baseUrl = obtenerBaseUrlPublica();
      const linkValidacion = `${baseUrl}/validar-correo?email=${encodeURIComponent(
        String(rpcRes.email)
      )}&sindicato=${encodeURIComponent(sindNombre)}`;

      const credData = {
        email: String(rpcRes.email),
        rut: String(rpcRes.rut),
        full_name: String(rpcRes.full_name),
        password: String(rpcRes.password),
        codigo_correo: String(rpcRes.codigo_correo || ''),
        role: String(rpcRes.role),
      };

      // 2. Despachar Orden de Incorporación de Socio vía plantilla dedicada (NEXT_PUBLIC_EMAILJS_TEMPLATE_SOCIO_ID)
      const ordenSocio = `INC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const rolEtiqueta = credData.role === 'admin' ? 'Directivo' : 'Socio';
      let correoEnviado = false;

      if (EMAILJS_PUBLIC_KEY && EMAILJS_TEMPLATE_SOCIO_ID) {
        try {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_SOCIO_ID,
            {
              to_email: credData.email,
              to_name: credData.full_name,
              orden_socio: ordenSocio,
              sindicato_nombre: sindNombre,
              sindicato_id: String(idSindicatoActual || ''),
              rol_asignado: rolEtiqueta,
              codigo_correo: credData.codigo_correo,
              socio_rut: formatRutLegible(credData.rut),
              socio_password: credData.password,
              link_validacion: linkValidacion,
              fecha: new Date().toLocaleDateString('es-CL'),
            },
            EMAILJS_PUBLIC_KEY
          );
          correoEnviado = true;
        } catch (emailErr) {
          console.error('Error EmailJS incorporación socio:', emailErr);
        }
      } else {
        console.warn(
          'Falta NEXT_PUBLIC_EMAILJS_TEMPLATE_SOCIO_ID o NEXT_PUBLIC_EMAILJS_PUBLIC_KEY en .env.local.'
        );
      }

      setCredSocioAprobado({
        ordenSocio,
        fullName: credData.full_name,
        rut: credData.rut,
        email: credData.email,
        password: credData.password,
        codigoCorreo: credData.codigo_correo,
        linkValidacion,
        role: credData.role,
        correoEnviado,
      });

      if (idSindicatoActual) await cargarDatosSindicato(idSindicatoActual);
      notificar(
        correoEnviado
          ? `${post.full_name} agregado a la BD y orden ${ordenSocio} enviada a ${credData.email}.`
          : `${post.full_name} agregado a la BD (verifica NEXT_PUBLIC_EMAILJS_TEMPLATE_SOCIO_ID o copia los datos del resumen).`
      );
    } catch (err: any) {
      // Rollback a Pendiente si hubo error
      try {
        await supabase
          .from('postulaciones')
          .update({ estado: 'Pendiente' })
          .eq('id', post.id);
      } catch {
        // Ignorar fallo secundario
      }

      const detalle = err?.message || 'Error inesperado al aprobar la postulación.';
      setActiveTab('postulaciones');
      setFiltroPost('Pendientes');
      setErrorPostulacion({
        id: post.id,
        nombre: post.full_name || 'Postulante',
        mensaje: detalle,
      });
      if (idSindicatoActual) await cargarDatosSindicato(idSindicatoActual);
      notificar(`No se pudo aprobar a ${post.full_name}. Volvió a Pendientes para reintentar.`, 'err');
    } finally {
      setProcesandoId(null);
    }
  };

  // --- RECHAZAR POSTULACIÓN ---
  const confirmarRechazarPostulacion = async () => {
    if (!postARechazar) return;
    if (esCargoDirectivo(postARechazar.rol_solicitado) && userRol !== 'superadmin') {
      notificar('Solo un SuperAdmin puede rechazar cargos directivos.', 'err');
      setPostARechazar(null);
      return;
    }

    setProcesandoId(postARechazar.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('postulaciones')
        .update({ estado: 'Rechazada' })
        .eq('id', postARechazar.id);
      if (error) throw error;

      const nombre = postARechazar.full_name;
      setPostARechazar(null);
      if (idSindicatoActual) await cargarDatosSindicato(idSindicatoActual);
      notificar(`La postulación de ${nombre} fue rechazada.`);
    } catch (err: any) {
      notificar(err.message || 'No se pudo rechazar la postulación.', 'err');
    } finally {
      setProcesandoId(null);
    }
  };

  // --- SOLICITAR AUTORIZACIÓN AL SUPERADMIN ---
  const handleEscalarASuperAdmin = async (post: any) => {
    if (!idSindicatoActual) return;
    setProcesandoId(post.id);
    try {
      const supabase = createClient();
      const alertasPrevias = Array.isArray(sindicatoInfo?.config_ui?.alertas_superadmin)
        ? sindicatoInfo.config_ui.alertas_superadmin
        : [];

      const nuevaAlerta = {
        id: `esc-${post.id}-${Date.now()}`,
        postulacion_id: post.id,
        tipo: 'Cargo Directivo',
        titulo: `Autorización Directiva: ${post.full_name}`,
        mensaje: `El admin de ${sindicatoInfo?.nombre || `Sindicato #${idSindicatoActual}`} solicita validar a ${post.full_name} (RUT ${post.rut}, ${post.email}) como Directivo.`,
        created_at: new Date().toISOString(),
        leido: false,
      };

      await supabase
        .from('sindicatos')
        .update({
          config_ui: {
            ...(sindicatoInfo?.config_ui || {}),
            alertas_superadmin: [nuevaAlerta, ...alertasPrevias],
          },
        })
        .eq('id', idSindicatoActual);

      setEscaladosIds((prev) => ({ ...prev, [post.id]: true }));
      notificar('Solicitud enviada al SuperAdmin para su autorización.');
    } catch (err: any) {
      notificar(err.message || 'No se pudo notificar al SuperAdmin.', 'err');
    } finally {
      setProcesandoId(null);
    }
  };

  // --- REGISTRAR POSTULANTE MANUALMENTE ---
  const handleRegistrarPostulante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSindicatoActual) return;

    const cleanRut = formNuevoPost.rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (cleanRut.length < 8) {
      notificar('Ingresa un RUT completo (ej: 15432198-5).', 'err');
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from('postulaciones').insert([
        {
          sindicato_id: idSindicatoActual,
          full_name: formNuevoPost.full_name.trim(),
          rut: cleanRut,
          email: formNuevoPost.email.trim().toLowerCase(),
          telefono: formNuevoPost.telefono.trim() || 'No informado',
          rol_solicitado: formNuevoPost.rol_solicitado,
          estado: 'Pendiente',
        },
      ]);
      if (error) throw error;

      setModalNuevoPostulante(false);
      setFormNuevoPost({ full_name: '', rut: '', email: '', telefono: '', rol_solicitado: 'socio' });
      setFiltroPost('Pendientes');
      await cargarDatosSindicato(idSindicatoActual);
      notificar('Postulante agregado al padrón de revisión.');
    } catch (err: any) {
      notificar(err.message || 'Error al registrar postulante.', 'err');
    }
  };

  // --- CREAR / ELIMINAR ASAMBLEA ---
  const handleCrearAsamblea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSindicatoActual || !tituloNuevaAsamblea.trim()) return;
    setCreandoAsamblea(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('historial_asambleas').insert([
        {
          sindicato_id: idSindicatoActual,
          titulo: tituloNuevaAsamblea.trim(),
        },
      ]);
      if (error) throw error;

      setTituloNuevaAsamblea('');
      await cargarDatosSindicato(idSindicatoActual);
      notificar('Nueva sesión de asamblea creada.');
    } catch (err: any) {
      notificar(err.message || 'Error al crear asamblea.', 'err');
    } finally {
      setCreandoAsamblea(false);
    }
  };

  const confirmarEliminarAsamblea = async () => {
    if (!asambleaAEliminar || !idSindicatoActual) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('historial_asambleas')
        .delete()
        .eq('id', asambleaAEliminar.id);
      if (error) throw error;

      setAsambleaAEliminar(null);
      await cargarDatosSindicato(idSindicatoActual);
      notificar('Sesión de asamblea eliminada.');
    } catch (err: any) {
      notificar(err.message || 'No se pudo eliminar la asamblea.', 'err');
    }
  };

  // --- ENVIAR AVISO / NOTIFICACIÓN ---
  const handleEnviarAviso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSindicatoActual || !notifTitulo.trim() || !notifMensaje.trim()) return;
    setEnviandoNotif(true);
    try {
      const supabase = createClient();

      const prevAlertas = Array.isArray(sindicatoInfo?.config_ui?.alertas_socios)
        ? sindicatoInfo.config_ui.alertas_socios
        : [];
      const nuevaAlerta = {
        id: `aviso-${Date.now()}`,
        destinatario: notifDestino,
        tipo: 'Aviso Directiva',
        titulo: notifTitulo.trim(),
        mensaje: notifMensaje.trim(),
        created_at: new Date().toISOString(),
        leido: false,
      };

      await supabase
        .from('sindicatos')
        .update({
          config_ui: {
            ...(sindicatoInfo?.config_ui || {}),
            alertas_socios: [nuevaAlerta, ...prevAlertas.slice(0, 49)],
          },
        })
        .eq('id', idSindicatoActual);

      if (notifDestino === 'todos') {
        await supabase.from('comunicados').insert([
          {
            sindicato_id: idSindicatoActual,
            titulo: notifTitulo.trim(),
            contenido: notifMensaje.trim(),
          },
        ]);
      } else {
        await supabase.from('notificaciones').insert([
          {
            user_id: notifDestino,
            tipo: 'Aviso Directiva',
            titulo: notifTitulo.trim(),
            mensaje: notifMensaje.trim(),
            leido: false,
          },
        ]);
      }

      setNotifTitulo('');
      setNotifMensaje('');
      await cargarDatosSindicato(idSindicatoActual);
      notificar('Aviso enviado a los socios correctamente.');
    } catch (err: any) {
      notificar(err.message || 'Error al enviar el aviso.', 'err');
    } finally {
      setEnviandoNotif(false);
    }
  };

  // --- ACTUALIZAR SOCIO DEL PADRÓN ---
  const handleGuardarSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socioEdit || !idSindicatoActual) return;
    if (String(socioEdit.role || '').toLowerCase() === 'superadmin') {
      notificar('No se puede modificar una cuenta SuperAdmin desde aquí.', 'err');
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          role: formSocioEdit.role,
          estado: formSocioEdit.estado,
          email_verificado: formSocioEdit.estado === 'activo' ? true : socioEdit.email_verificado,
        })
        .eq('id', socioEdit.id);
      if (error) throw error;

      setSocioEdit(null);
      await cargarDatosSindicato(idSindicatoActual);
      notificar('Datos del socio actualizados.');
    } catch (err: any) {
      notificar(err.message || 'No se pudo actualizar el socio.', 'err');
    }
  };

  // --- ENCENDER / APAGAR MÓDULO ---
  const handleToggleModulo = async (key: string) => {
    if (!idSindicatoActual) return;
    setGuardandoModulo(key);
    try {
      const nuevoEstado = { ...modulosActivos, [key]: !modulosActivos[key] };
      const supabase = createClient();
      const { error } = await supabase
        .from('sindicatos')
        .update({
          config_ui: {
            ...(sindicatoInfo?.config_ui || {}),
            modulos_activos: nuevoEstado,
          },
        })
        .eq('id', idSindicatoActual);
      if (error) throw error;

      setModulosActivos(nuevoEstado);
      setSindicatoInfo((prev: any) => ({
        ...(prev || {}),
        config_ui: { ...(prev?.config_ui || {}), modulos_activos: nuevoEstado },
      }));
      notificar(
        `Módulo "${MODULOS_BASE[key].label}" ${nuevoEstado[key] ? 'activado' : 'ocultado'} para los socios.`
      );
    } catch (err: any) {
      notificar(err.message || 'Error al cambiar módulo.', 'err');
    } finally {
      setGuardandoModulo(null);
    }
  };

  // --- GUARDAR APARIENCIA DEL PORTAL ---
  const handleGuardarTema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSindicatoActual) return;
    setGuardandoTema(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('sindicatos')
        .update({ configuracion: configTema })
        .eq('id', idSindicatoActual);
      if (error) throw error;

      notificar('Colores y bienvenida actualizados en vivo para todos tus socios.');
    } catch (err: any) {
      notificar(err.message || 'No se pudo guardar la apariencia.', 'err');
    } finally {
      setGuardandoTema(false);
    }
  };

  if (!mounted || validando) {
    return (
      <div
        suppressHydrationWarning
        className="w-full min-h-[60vh] bg-[#0b0e14] text-slate-200 flex flex-col items-center justify-center gap-3 p-6"
      >
        <span className="w-8 h-8 border-2 border-slate-700 border-t-[#e5b32a] rounded-full animate-spin block" />
        <p className="text-sm text-slate-300">Cargando panel de administración...</p>
      </div>
    );
  }

  // Contadores
  const postPendientes = postulaciones.filter(
    (p) => !p.estado || p.estado === 'Pendiente' || p.estado === 'En Revisión'
  );
  const postAprobadas = postulaciones.filter((p) => p.estado === 'Aceptada' || p.estado === 'Aprobada');
  const postRechazadas = postulaciones.filter((p) => p.estado === 'Rechazada');

  const postulacionesFiltradas = postulaciones.filter((p) => {
    const est = String(p.estado || 'Pendiente');
    const matchEstado =
      filtroPost === 'Todas' ||
      (filtroPost === 'Pendientes' && (est === 'Pendiente' || est === 'En Revisión')) ||
      (filtroPost === 'Aprobadas' && (est === 'Aceptada' || est === 'Aprobada')) ||
      (filtroPost === 'Rechazadas' && est === 'Rechazada');

    const q = busquedaPost.toLowerCase().trim();
    const matchTexto =
      !q ||
      String(p.full_name || '').toLowerCase().includes(q) ||
      String(p.rut || '').toLowerCase().includes(q) ||
      String(p.email || '').toLowerCase().includes(q);

    return matchEstado && matchTexto;
  });

  const sociosFiltrados = socios.filter((u) => {
    const q = busquedaSocio.toLowerCase().trim();
    if (!q) return true;
    return (
      String(u.full_name || '').toLowerCase().includes(q) ||
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.rut || '').toLowerCase().includes(q)
    );
  });

  const modulosEncendidosCount = Object.values(modulosActivos).filter(Boolean).length;
  const totalModulosCount = Object.keys(MODULOS_BASE).length;

  const menuItems: { id: AdminTab; titulo: string; subtitulo: string; badge?: string | number }[] = [
    {
      id: 'postulaciones',
      titulo: 'Postulaciones',
      subtitulo: 'Revisar y aprobar ingresos',
      badge: postPendientes.length > 0 ? postPendientes.length : undefined,
    },
    {
      id: 'estadisticas',
      titulo: 'Resumen',
      subtitulo: 'Números del sindicato',
    },
    {
      id: 'asambleas',
      titulo: 'Asambleas y QR',
      subtitulo: 'Sesiones y asistencia',
      badge: historialAsambleas.length > 0 ? historialAsambleas.length : undefined,
    },
    {
      id: 'notificaciones',
      titulo: 'Enviar Avisos',
      subtitulo: 'Mensajes a los socios',
    },
    {
      id: 'socios',
      titulo: 'Lista de Socios',
      subtitulo: `${socios.length} personas en BD`,
    },
    {
      id: 'modulos',
      titulo: 'Secciones Visibles',
      subtitulo: `${modulosEncendidosCount} de ${totalModulosCount} activas`,
    },
    {
      id: 'tema',
      titulo: 'Apariencia',
      subtitulo: 'Colores y textos del portal',
    },
  ];

  return (
    <div
      suppressHydrationWarning
      className="w-full bg-[#0b0e14] text-slate-100 font-sans antialiased box-border"
    >
      {/* NOTIFICACIÓN FLOTANTE */}
      {aviso && (
        <div
          role="status"
          className={`fixed top-4 right-4 left-4 sm:left-auto z-50 sm:max-w-md px-4 py-3.5 rounded-xl border shadow-2xl flex items-start gap-3 text-sm ${
            aviso.tipo === 'ok'
              ? 'bg-[#121c18] border-emerald-500/50 text-emerald-100'
              : 'bg-[#211317] border-rose-500/50 text-rose-100'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
              aviso.tipo === 'ok' ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          />
          <p className="leading-snug flex-1">{aviso.texto}</p>
          <button
            type="button"
            onClick={() => setAviso(null)}
            className="text-slate-300 hover:text-white font-semibold px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] w-full">
        {/* ================= BARRA LATERAL MINIMALISTA ================= */}
        <aside className="w-full lg:w-72 bg-[#10141e] border-b lg:border-b-0 lg:border-r border-[#232a3b] flex flex-col justify-between shrink-0">
          <div>
            <div className="p-5 border-b border-[#232a3b] space-y-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#e5b32a] text-[#0b0e14] font-bold text-sm flex items-center justify-center shrink-0">
                  #{idSindicatoActual || '—'}
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-bold text-white leading-tight truncate">
                    {sindicatoInfo?.nombre || 'Sindicato'}
                  </h1>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {perfilActual?.full_name || perfilActual?.email}
                  </p>
                </div>
              </div>

              {userRol === 'superadmin' && sindicatosDisponibles.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#e5b32a]">
                    Cambiar de sindicato
                  </label>
                  <select
                    value={idSindicatoActual || ''}
                    onChange={(e) => handleCambiarSindicato(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#e5b32a] cursor-pointer"
                  >
                    {sindicatosDisponibles.map((s) => (
                      <option key={s.id} value={s.id}>
                        #{s.id} — {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <nav className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5">
              {menuItems.map((item) => {
                const activo = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      activo
                        ? 'bg-[#1b2233] border-[#e5b32a]/60 text-white'
                        : 'bg-transparent border-transparent text-slate-300 hover:bg-[#161c2a] hover:text-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block text-sm font-semibold leading-tight truncate">{item.titulo}</span>
                      <span className="hidden lg:block text-xs text-slate-400 mt-0.5 truncate">
                        {item.subtitulo}
                      </span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                          item.id === 'postulaciones'
                            ? 'bg-[#e5b32a] text-[#0b0e14]'
                            : 'bg-[#232b3e] text-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-[#232a3b] flex flex-wrap lg:flex-col gap-2">
            <Link
              href="/dashboard/asistencia"
              className="flex-1 lg:w-full text-center py-2.5 px-3 rounded-xl text-sm font-semibold text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 transition-colors"
            >
              Abrir Escáner de Asistencia
            </Link>

            {userRol === 'superadmin' && (
              <Link
                href="/superadmin"
                className="flex-1 lg:w-full text-center py-2.5 px-3 rounded-xl text-sm font-semibold text-[#f3c64f] bg-[#e5b32a]/10 hover:bg-[#e5b32a]/20 border border-[#e5b32a]/35 transition-colors"
              >
                Volver a Panel SuperAdmin
              </Link>
            )}

            <Link
              href="/dashboard"
              className="flex-1 lg:w-full text-center py-2.5 px-3 rounded-xl text-sm font-medium text-slate-200 bg-[#181f2e] hover:bg-[#222b3f] border border-[#2c354b] transition-colors"
            >
              ← Ver Portal de Socios
            </Link>
          </div>
        </aside>

        {/* ================= CONTENIDO PRINCIPAL ================= */}
        <section className="flex-1 min-w-0 w-full p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-7">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#232a3b]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#e5b32a]">
                  Panel de Directiva · ID #{idSindicatoActual}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conectado en tiempo real con {sindicatoInfo?.nombre || 'tu sindicato'}.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const link = `${obtenerBaseUrlPublica()}/postular?sid=${idSindicatoActual}`;
                    const ok = await copiarTextoSeguro(link);
                    notificar(
                      ok
                        ? `Enlace copiado: compártelo para que postulen directo a ${sindicatoInfo?.nombre}.`
                        : 'No se pudo copiar el enlace.',
                      ok ? 'ok' : 'err'
                    );
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#e5b32a]/15 hover:bg-[#e5b32a]/25 border border-[#e5b32a]/40 text-xs font-semibold text-[#f3c64f] cursor-pointer"
                >
                  Copiar enlace de postulación
                </button>
                <button
                  type="button"
                  onClick={() => idSindicatoActual && cargarDatosSindicato(idSindicatoActual)}
                  disabled={actualizando}
                  className="px-3.5 py-2 rounded-lg bg-[#161c2a] hover:bg-[#1e2638] border border-[#2c354b] text-xs font-medium text-slate-200 cursor-pointer disabled:opacity-50"
                >
                  {actualizando ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
            </div>

            {/* ================= 1. POSTULACIONES ================= */}
            {activeTab === 'postulaciones' && (
              <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Postulaciones de Ingreso</h2>
                    <p className="text-sm text-slate-300 mt-1">
                      Al aprobar a un socio, se agrega automáticamente a la base de datos de <strong>{sindicatoInfo?.nombre}</strong> y recibe su Orden de Incorporación para validar su correo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalNuevoPostulante(true)}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-[#0b0e14] text-sm font-bold cursor-pointer shrink-0"
                  >
                    + Agregar Postulante
                  </button>
                </header>

                {errorPostulacion && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/45 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-rose-200">
                          No se pudo aprobar a {errorPostulacion.nombre}
                        </p>
                        <p className="text-xs text-rose-100/90 mt-1 leading-relaxed">
                          {errorPostulacion.mensaje}
                        </p>
                        <p className="text-xs text-slate-300 mt-1.5">
                          La solicitud quedó en <strong>Pendientes</strong> para que puedas reintentar.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setErrorPostulacion(null)}
                        className="text-rose-200 hover:text-white text-xs font-bold px-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Guía 3 pasos */}
                <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[#e5b32a]/20 text-[#e5b32a] font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">Aprueba al socio</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        El sistema lo registra de inmediato en la base de datos de tu sindicato.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">Valida desde el móvil</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        El socio abre su Orden de Incorporación e ingresa su código de 6 dígitos.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">Ingreso al sindicato</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Ingresa su contraseña temporal y entra directo al portal de su sindicato.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Filtros y buscador */}
                <div className="flex flex-col md:flex-row gap-3 justify-between">
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'Todas', count: postulaciones.length },
                        { id: 'Pendientes', count: postPendientes.length },
                        { id: 'Aprobadas', count: postAprobadas.length },
                        { id: 'Rechazadas', count: postRechazadas.length },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFiltroPost(f.id)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          filtroPost === f.id
                            ? 'bg-[#e5b32a] text-[#0b0e14] border-[#e5b32a]'
                            : 'bg-[#121722] text-slate-300 border-[#252e42] hover:border-slate-500'
                        }`}
                      >
                        {f.id} ({f.count})
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={busquedaPost}
                    onChange={(e) => setBusquedaPost(e.target.value)}
                    placeholder="Buscar por nombre, RUT o correo..."
                    className="w-full md:w-72 bg-[#121722] border border-[#2c354b] rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#e5b32a]"
                  />
                </div>

                <div className="px-4 py-3 rounded-xl bg-[#121722] border border-[#252e42] text-xs text-slate-300 flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#e5b32a] shrink-0" />
                  <span>
                    {userRol === 'superadmin'
                      ? 'Estás conectado como SuperAdmin: puedes aprobar o rechazar tanto socios como cargos de directiva.'
                      : 'Como Administrador puedes aprobar socios directamente para tu sindicato. Los cargos de Directiva requieren autorización del SuperAdmin.'}
                  </span>
                </div>

                {/* Tarjetas de postulaciones */}
                <div className="space-y-4">
                  {postulacionesFiltradas.length === 0 ? (
                    <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-10 text-center space-y-2">
                      <p className="text-base font-semibold text-white">No hay postulaciones en esta vista</p>
                      <p className="text-sm text-slate-400">
                        Comparte el enlace de postulación con tus trabajadores o agrega una persona manualmente.
                      </p>
                    </div>
                  ) : (
                    postulacionesFiltradas.map((post) => {
                      const est = String(post.estado || 'Pendiente');
                      const esPendiente = est === 'Pendiente' || est === 'En Revisión';
                      const esAprobada = est === 'Aceptada' || est === 'Aprobada';
                      const esDir = esCargoDirectivo(post.rol_solicitado);
                      const puedeAprobar = !esDir || userRol === 'superadmin';
                      const yaEscalado = Boolean(escaladosIds[post.id]);
                      const tuvoError = errorPostulacion?.id === post.id;

                      return (
                        <article
                          key={post.id}
                          className={`bg-[#121722] border rounded-2xl p-5 sm:p-6 space-y-4 ${
                            tuvoError ? 'border-rose-500/60' : 'border-[#252e42]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#20283a]">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h3 className="text-lg font-bold text-white">{post.full_name}</h3>
                              <span
                                className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
                                  esDir
                                    ? 'bg-amber-500/15 text-amber-200 border-amber-500/40'
                                    : 'bg-[#1c2334] text-slate-200 border-[#2d374e]'
                                }`}
                              >
                                {esDir ? 'Cargo: Directiva / Presidente' : 'Cargo: Socio'}
                              </span>
                            </div>

                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                                esAprobada
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                                  : esPendiente
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                  : 'bg-rose-500/15 text-rose-300 border-rose-500/35'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  esAprobada
                                    ? 'bg-emerald-400'
                                    : esPendiente
                                    ? 'bg-amber-400'
                                    : 'bg-rose-400'
                                }`}
                              />
                              {esAprobada ? 'Aprobada' : esPendiente ? 'Pendiente de revisión' : 'Rechazada'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div className="bg-[#0e121b] border border-[#1f2637] rounded-xl p-3.5">
                              <p className="text-xs text-slate-400 mb-1">RUT del Postulante</p>
                              <p className="font-mono font-bold text-white text-base">
                                {formatRutLegible(post.rut)}
                              </p>
                            </div>

                            <div className="bg-[#0e121b] border border-[#1f2637] rounded-xl p-3.5">
                              <p className="text-xs text-slate-400 mb-1">Correo Electrónico</p>
                              <p className="font-medium text-slate-100 break-all">
                                {post.email || 'No informado'}
                              </p>
                            </div>

                            <div className="bg-[#0e121b] border border-[#1f2637] rounded-xl p-3.5">
                              <p className="text-xs text-slate-400 mb-1">Teléfono y Fecha</p>
                              <p className="font-mono text-slate-100">{post.telefono || 'Sin teléfono'}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {post.created_at
                                  ? new Date(post.created_at).toLocaleDateString('es-CL')
                                  : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 pt-1">
                            {esPendiente ? (
                              puedeAprobar ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={procesandoId === post.id}
                                    onClick={() => handleAprobarPostulacion(post)}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#08130e] font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {procesandoId === post.id
                                      ? 'Creando socio y enviando orden...'
                                      : tuvoError
                                      ? 'Reintentar Aprobación'
                                      : esDir
                                      ? 'Aprobar Directivo y Enviar Orden'
                                      : 'Aprobar Socio y Enviar Orden'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={procesandoId === post.id}
                                    onClick={() => setPostARechazar(post)}
                                    className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/40 font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    Rechazar
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  disabled={yaEscalado || procesandoId === post.id}
                                  onClick={() => handleEscalarASuperAdmin(post)}
                                  className="px-4 py-2.5 rounded-xl bg-[#e5b32a]/15 hover:bg-[#e5b32a]/25 border border-[#e5b32a]/40 text-[#f3c64f] font-semibold text-sm cursor-pointer disabled:opacity-60"
                                >
                                  {yaEscalado
                                    ? '✓ Solicitud enviada al SuperAdmin'
                                    : 'Solicitar autorización al SuperAdmin'}
                                </button>
                              )
                            ) : (
                              puedeAprobar && (
                                <>
                                  {esAprobada && (
                                    <button
                                      type="button"
                                      disabled={procesandoId === post.id}
                                      onClick={() => handleAprobarPostulacion(post)}
                                      className="px-4 py-2 rounded-xl bg-[#e5b32a]/15 hover:bg-[#e5b32a]/25 border border-[#e5b32a]/40 text-[#f3c64f] font-semibold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      {procesandoId === post.id
                                        ? 'Reemitiendo...'
                                        : 'Reemitir Código y Reenviar Correo'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={procesandoId === post.id}
                                    onClick={() => handleVolverAPendiente(post)}
                                    className="px-4 py-2 rounded-xl bg-[#1c2334] hover:bg-[#263047] border border-[#2d374e] text-slate-200 font-medium text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    Volver a Pendiente
                                  </button>
                                </>
                              )
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ================= 2. RESUMEN ================= */}
            {activeTab === 'estadisticas' && (
              <div className="space-y-6">
                <header>
                  <h2 className="text-2xl font-bold text-white">Resumen del Sindicato</h2>
                  <p className="text-sm text-slate-300 mt-1">
                    Números clave de <strong>{sindicatoInfo?.nombre}</strong> en tiempo real.
                  </p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-5">
                    <p className="text-xs text-slate-400">Socios en BD</p>
                    <p className="text-3xl font-bold text-white mt-2">{socios.length}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {sindicatoInfo?.max_socios ? `Límite plan: ${sindicatoInfo.max_socios}` : 'Registrados en el padrón'}
                    </p>
                  </div>
                  <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-5">
                    <p className="text-xs text-slate-400">Postulaciones pendientes</p>
                    <p className="text-3xl font-bold text-[#e5b32a] mt-2">{postPendientes.length}</p>
                    <p className="text-xs text-slate-400 mt-1">Esperando tu revisión</p>
                  </div>
                  <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-5">
                    <p className="text-xs text-slate-400">Asambleas creadas</p>
                    <p className="text-3xl font-bold text-sky-300 mt-2">{historialAsambleas.length}</p>
                    <p className="text-xs text-slate-400 mt-1">Sesiones registradas</p>
                  </div>
                  <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-5">
                    <p className="text-xs text-slate-400">Asistencias marcadas</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-2">{asistencias.length}</p>
                    <p className="text-xs text-slate-400 mt-1">Escaneos registrados</p>
                  </div>
                </div>

                <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white">Estado de Postulaciones</h3>
                  {[
                    { label: 'Pendientes por revisar', val: postPendientes.length, color: 'bg-[#e5b32a]' },
                    { label: 'Aprobadas', val: postAprobadas.length, color: 'bg-emerald-400' },
                    { label: 'Rechazadas', val: postRechazadas.length, color: 'bg-rose-400' },
                  ].map((item) => {
                    const total = postulaciones.length || 1;
                    const pct = Math.round((item.val / total) * 100);
                    return (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-200">{item.label}</span>
                          <span className="font-mono text-slate-300">
                            {item.val} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#1e2536] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================= 3. ASAMBLEAS ================= */}
            {activeTab === 'asambleas' && (
              <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Asambleas y Asistencia</h2>
                    <p className="text-sm text-slate-300 mt-1">
                      Crea una sesión oficial y revisa en vivo quién entró y quién salió.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/asistencia"
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#08130e] text-sm font-bold text-center shrink-0"
                  >
                    Abrir Escáner QR →
                  </Link>
                </header>

                <form
                  onSubmit={handleCrearAsamblea}
                  className="bg-[#121722] border border-[#252e42] rounded-2xl p-5 space-y-3"
                >
                  <label className="block text-sm font-semibold text-white">
                    Iniciar nueva sesión de asamblea
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      required
                      value={tituloNuevaAsamblea}
                      onChange={(e) => setTituloNuevaAsamblea(e.target.value)}
                      placeholder="Ej: Asamblea Ordinaria de Noviembre 2026"
                      className="flex-1 bg-[#0b0e14] border border-[#2c354b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#e5b32a]"
                    />
                    <button
                      type="submit"
                      disabled={creandoAsamblea}
                      className="px-5 py-2.5 rounded-xl bg-[#e5b32a] hover:bg-[#f0c038] text-[#0b0e14] font-bold text-sm cursor-pointer disabled:opacity-50"
                    >
                      {creandoAsamblea ? 'Creando...' : 'Crear Sesión'}
                    </button>
                  </div>
                </form>

                <div className="space-y-4">
                  {historialAsambleas.length === 0 ? (
                    <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-10 text-center text-sm text-slate-400">
                      Aún no hay asambleas creadas para este sindicato.
                    </div>
                  ) : (
                    historialAsambleas.map((asam) => {
                      const asistentes = asistencias.filter(
                        (a) =>
                          String(a.asamblea_titulo || '').trim().toLowerCase() ===
                          String(asam.titulo || '').trim().toLowerCase()
                      );

                      return (
                        <div
                          key={asam.id}
                          className="bg-[#121722] border border-[#252e42] rounded-2xl p-5 sm:p-6 space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#20283a]">
                            <div>
                              <h3 className="text-base font-bold text-white">{asam.titulo}</h3>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Creada el {new Date(asam.created_at).toLocaleDateString('es-CL')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold">
                                {asistentes.length} asistente(s)
                              </span>
                              <button
                                type="button"
                                onClick={() => setAsambleaAEliminar(asam)}
                                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>

                          {asistentes.length === 0 ? (
                            <p className="text-xs text-slate-400">
                              Todavía no se registran socios escaneados en esta sesión.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {asistentes.map((asist) => {
                                const horaEntrada = asist.hora_entrada
                                  ? new Date(asist.hora_entrada).toLocaleTimeString('es-CL', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '--:--';
                                const horaSalida = asist.hora_salida
                                  ? new Date(asist.hora_salida).toLocaleTimeString('es-CL', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : null;

                                return (
                                  <div
                                    key={asist.id}
                                    className="p-4 rounded-xl bg-[#0e121b] border border-[#1f2637] space-y-2 text-xs"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-white truncate text-sm">
                                        {asist.usuario_nombre || 'Socio'}
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-[#1c2334] text-slate-300 font-mono text-[10px]">
                                        {asist.metodo_registro || 'QR'}
                                      </span>
                                    </div>
                                    <p className="font-mono text-slate-400">
                                      {formatRutLegible(asist.usuario_rut)}
                                    </p>
                                    <div className="pt-2 border-t border-[#1f2637] space-y-1.5">
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Entrada:</span>
                                        <span className="font-mono font-semibold text-emerald-300">
                                          {horaEntrada} hrs
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Salida:</span>
                                        {horaSalida ? (
                                          <span className="font-mono font-semibold text-sky-300">
                                            {horaSalida} hrs
                                          </span>
                                        ) : (
                                          <span className="font-semibold text-amber-300">En sala</span>
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

            {/* ================= 4. ENVIAR AVISOS ================= */}
            {activeTab === 'notificaciones' && (
              <div className="space-y-6">
                <header>
                  <h2 className="text-2xl font-bold text-white">Enviar Avisos a los Socios</h2>
                  <p className="text-sm text-slate-300 mt-1">
                    Los mensajes aparecen de inmediato en la campanita de notificaciones de tus socios.
                  </p>
                </header>

                <form
                  onSubmit={handleEnviarAviso}
                  className="bg-[#121722] border border-[#252e42] rounded-2xl p-6 space-y-4 text-sm"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      ¿Para quién es el aviso?
                    </label>
                    <select
                      value={notifDestino}
                      onChange={(e) => setNotifDestino(e.target.value)}
                      className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-4 py-2.5 text-white"
                    >
                      <option value="todos">Todos los socios de {sindicatoInfo?.nombre}</option>
                      {socios.map((s) => (
                        <option key={s.id} value={s.id}>
                          Solo para: {s.full_name || s.email} ({formatRutLegible(s.rut)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Título del aviso
                    </label>
                    <input
                      required
                      value={notifTitulo}
                      onChange={(e) => setNotifTitulo(e.target.value)}
                      placeholder="Ej: Citación a Asamblea General este viernes"
                      className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-[#e5b32a]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Mensaje
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={notifMensaje}
                      onChange={(e) => setNotifMensaje(e.target.value)}
                      placeholder="Escribe los detalles claros (lugar, fecha, hora)..."
                      className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-[#e5b32a]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={enviandoNotif}
                    className="px-6 py-3 rounded-xl bg-[#e5b32a] hover:bg-[#f0c038] text-[#0b0e14] font-bold text-sm cursor-pointer disabled:opacity-50"
                  >
                    {enviandoNotif ? 'Enviando aviso...' : 'Enviar Aviso Ahora'}
                  </button>
                </form>

                {comunicados.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-300">Avisos enviados recientemente</h3>
                    <div className="space-y-2.5">
                      {comunicados.map((c) => (
                        <div
                          key={c.id}
                          className="bg-[#121722] border border-[#252e42] rounded-xl p-4 space-y-1"
                        >
                          <p className="text-sm font-bold text-white">{c.titulo}</p>
                          <p className="text-xs text-slate-300 leading-relaxed">{c.contenido}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================= 5. LISTA DE SOCIOS ================= */}
            {activeTab === 'socios' && (
              <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Lista de Socios ({sociosFiltrados.length})</h2>
                    <p className="text-sm text-slate-300 mt-1">
                      Todas las cuentas registradas en la base de datos de <strong>{sindicatoInfo?.nombre}</strong>.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={busquedaSocio}
                    onChange={(e) => setBusquedaSocio(e.target.value)}
                    placeholder="Buscar socio por nombre, RUT o correo..."
                    className="w-full sm:w-80 bg-[#121722] border border-[#2c354b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#e5b32a]"
                  />
                </header>

                <div className="space-y-2.5">
                  {sociosFiltrados.length === 0 ? (
                    <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-8 text-center text-sm text-slate-400">
                      No se encontraron socios con ese criterio.
                    </div>
                  ) : (
                    sociosFiltrados.map((u) => {
                      const esSA = String(u.role || '').toLowerCase() === 'superadmin';
                      const estLower = String(u.estado || 'activo').toLowerCase();
                      const suspendido = estLower === 'suspendido';
                      const faltaCorreo = estLower === 'pendiente_correo' || u.email_verificado === false;
                      return (
                        <div
                          key={u.id}
                          className="bg-[#121722] border border-[#252e42] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-semibold text-white">
                                {u.full_name || 'Sin nombre'}
                              </span>
                              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#1c2334] text-[#e5b32a]">
                                {u.role || 'socio'}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  suspendido
                                    ? 'bg-rose-500/15 text-rose-300'
                                    : faltaCorreo
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'bg-emerald-500/15 text-emerald-300'
                                }`}
                              >
                                {suspendido
                                  ? 'Suspendido'
                                  : faltaCorreo
                                  ? 'Falta validar correo'
                                  : 'Activo'}
                              </span>
                            </div>
                            <p className="text-xs font-mono text-slate-300 break-all">
                              RUT {formatRutLegible(u.rut)} · {u.email}
                            </p>
                          </div>

                          {!esSA && (
                            <button
                              type="button"
                              onClick={() => {
                                setSocioEdit(u);
                                setFormSocioEdit({
                                  role: u.role || 'socio',
                                  estado: u.estado || 'activo',
                                });
                              }}
                              className="px-4 py-2 rounded-lg bg-[#1c2334] hover:bg-[#263047] text-white text-xs font-semibold cursor-pointer self-start sm:self-center shrink-0"
                            >
                              Gestionar
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ================= 6. SECCIONES VISIBLES ================= */}
            {activeTab === 'modulos' && (
              <div className="space-y-6">
                <header>
                  <h2 className="text-2xl font-bold text-white">Secciones Visibles para Socios</h2>
                  <p className="text-sm text-slate-300 mt-1">
                    Enciende o apaga las herramientas que quieres mostrar en el portal de tus socios.
                  </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {Object.entries(MODULOS_BASE).map(([key, info]) => {
                    const encendido = Boolean(modulosActivos[key]);
                    return (
                      <div
                        key={key}
                        className="bg-[#121722] border border-[#252e42] rounded-2xl p-5 flex items-center justify-between gap-4"
                      >
                        <div>
                          <h3 className="text-sm font-bold text-white">{info.label}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{info.desc}</p>
                        </div>

                        <button
                          type="button"
                          disabled={guardandoModulo === key}
                          onClick={() => handleToggleModulo(key)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                            encendido
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-[#1a2030] border-[#2c354b] text-slate-400'
                          }`}
                        >
                          {guardandoModulo === key
                            ? 'Guardando...'
                            : encendido
                            ? 'Visible'
                            : 'Oculto'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================= 7. APARIENCIA ================= */}
            {activeTab === 'tema' && (
              <div className="space-y-6">
                <header>
                  <h2 className="text-2xl font-bold text-white">Apariencia del Portal</h2>
                  <p className="text-sm text-slate-300 mt-1">
                    Elige una combinación de colores o ajusta el mensaje de bienvenida que ven tus socios.
                  </p>
                </header>

                <form onSubmit={handleGuardarTema} className="space-y-6">
                  <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-6 space-y-4">
                    <p className="text-sm font-bold text-white">Combinaciones recomendadas (1 clic)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {PALETAS_PRESET.map((pal) => (
                        <button
                          key={pal.nombre}
                          type="button"
                          onClick={() =>
                            setConfigTema((prev) => ({
                              ...prev,
                              tema: {
                                fondo_base: pal.fondo_base,
                                color_tarjetas: pal.color_tarjetas,
                                color_acento: pal.color_acento,
                                color_borde: pal.color_borde,
                              },
                            }))
                          }
                          className="p-3.5 rounded-xl bg-[#0b0e14] border border-[#252e42] hover:border-[#e5b32a] text-left space-y-2.5 cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md border border-white/15" style={{ background: pal.fondo_base }} />
                            <span className="w-5 h-5 rounded-md border border-white/15" style={{ background: pal.color_tarjetas }} />
                            <span className="w-5 h-5 rounded-md border border-white/15" style={{ background: pal.color_acento }} />
                          </div>
                          <p className="text-xs font-semibold text-white">{pal.nombre}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-6 space-y-4 text-sm">
                    <p className="font-bold text-white">Mensaje de bienvenida del portal</p>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1.5">Título principal</label>
                      <input
                        value={configTema.hero.titulo}
                        onChange={(e) =>
                          setConfigTema((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, titulo: e.target.value },
                          }))
                        }
                        className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-4 py-2.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1.5">Descripción breve</label>
                      <textarea
                        rows={2}
                        value={configTema.hero.subtitulo}
                        onChange={(e) =>
                          setConfigTema((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, subtitulo: e.target.value },
                          }))
                        }
                        className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-4 py-2.5 text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={guardandoTema}
                      className="px-6 py-3 rounded-xl bg-[#e5b32a] hover:bg-[#f0c038] text-[#0b0e14] font-bold text-sm cursor-pointer disabled:opacity-50"
                    >
                      {guardandoTema ? 'Guardando cambios...' : 'Publicar Apariencia'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ================= MODAL 1: ORDEN DE INCORPORACIÓN + CÓDIGO MÓVIL ================= */}
      {credSocioAprobado && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setCredSocioAprobado(null)}
        >
          <div
            className="bg-[#121722] border border-emerald-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                {credSocioAprobado.correoEnviado
                  ? `✓ Orden ${credSocioAprobado.ordenSocio} enviada al correo`
                  : `✓ Socio creado · Orden ${credSocioAprobado.ordenSocio}`}
              </p>
              <h3 className="text-lg font-bold text-white mt-1">
                Incorporación de {credSocioAprobado.fullName}
              </h3>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0e14] border border-[#e5b32a]/40 space-y-1.5 text-sm font-mono">
              <p className="text-xs font-sans font-bold uppercase tracking-wider text-[#e5b32a]">
                1. Validación de correo (desde el móvil)
              </p>
              <p className="text-slate-300">
                Código 6 dígitos:{' '}
                <strong className="text-[#e5b32a] text-base tracking-widest">
                  {credSocioAprobado.codigoCorreo}
                </strong>
              </p>
              <p className="text-xs text-sky-300 break-all pt-1">{credSocioAprobado.linkValidacion}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0e14] border border-[#252e42] space-y-1.5 text-sm font-mono">
              <p className="text-xs font-sans font-bold uppercase tracking-wider text-slate-400">
                2. Credenciales de acceso
              </p>
              <p className="text-slate-300">
                RUT: <strong className="text-white">{formatRutLegible(credSocioAprobado.rut)}</strong>
              </p>
              <p className="text-slate-300 break-all">
                Correo: <strong className="text-white">{credSocioAprobado.email}</strong>
              </p>
              <p className="text-slate-300">
                Clave temporal:{' '}
                <strong className="text-emerald-300">{credSocioAprobado.password}</strong>
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  const texto =
                    `¡Hola ${credSocioAprobado.fullName}! Tu ingreso a ${sindicatoInfo?.nombre || 'Sindicato PYC'} fue aprobado (Orden ${credSocioAprobado.ordenSocio}).\n\n` +
                    `1. Valida tu correo aquí: ${credSocioAprobado.linkValidacion}\n` +
                    `Código de verificación: ${credSocioAprobado.codigoCorreo}\n\n` +
                    `2. Luego ingresa con:\n` +
                    `RUT: ${formatRutLegible(credSocioAprobado.rut)}\n` +
                    `Clave temporal: ${credSocioAprobado.password}`;
                  const ok = await copiarTextoSeguro(texto);
                  notificar(ok ? 'Mensaje completo copiado para WhatsApp.' : 'No se pudo copiar.', ok ? 'ok' : 'err');
                }}
                className="px-4 py-2.5 rounded-xl bg-[#1c2334] hover:bg-[#263047] text-white text-sm font-medium cursor-pointer"
              >
                Copiar para WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setCredSocioAprobado(null)}
                className="px-5 py-2.5 rounded-xl bg-[#e5b32a] hover:bg-[#f0c038] text-[#0b0e14] text-sm font-bold cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: AGREGAR POSTULANTE ================= */}
      {modalNuevoPostulante && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setModalNuevoPostulante(false)}
        >
          <div
            className="bg-[#121722] border border-[#2f3952] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Agregar Postulante</h3>
            <form onSubmit={handleRegistrarPostulante} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Nombre completo</label>
                <input
                  required
                  value={formNuevoPost.full_name}
                  onChange={(e) => setFormNuevoPost({ ...formNuevoPost, full_name: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">RUT (sin puntos)</label>
                  <input
                    required
                    maxLength={10}
                    placeholder="20386773-2"
                    value={formNuevoPost.rut}
                    onChange={(e) =>
                      setFormNuevoPost({ ...formNuevoPost, rut: formatRutInputSinPuntos(e.target.value) })
                    }
                    className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Teléfono</label>
                  <input
                    placeholder="+56987654321"
                    value={formNuevoPost.telefono}
                    onChange={(e) => setFormNuevoPost({ ...formNuevoPost, telefono: e.target.value })}
                    className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Correo electrónico</label>
                <input
                  required
                  type="email"
                  value={formNuevoPost.email}
                  onChange={(e) => setFormNuevoPost({ ...formNuevoPost, email: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Rol solicitado</label>
                <select
                  value={formNuevoPost.rol_solicitado}
                  onChange={(e) => setFormNuevoPost({ ...formNuevoPost, rol_solicitado: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                >
                  <option value="socio">Socio Trabajador</option>
                  <option value="admin">Directiva / Presidente</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevoPostulante(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#1c2334] text-slate-200 text-sm font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#e5b32a] hover:bg-[#f0c038] text-[#0b0e14] text-sm font-bold cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: CONFIRMAR RECHAZO ================= */}
      {postARechazar && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPostARechazar(null)}
        >
          <div
            className="bg-[#121722] border border-rose-500/40 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">¿Rechazar postulación?</h3>
            <p className="text-sm text-slate-300">
              Se marcará como rechazada la solicitud de <strong>{postARechazar.full_name}</strong> (RUT{' '}
              {formatRutLegible(postARechazar.rut)}).
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPostARechazar(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1c2334] text-slate-200 text-sm font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarRechazarPostulacion}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold cursor-pointer"
              >
                Sí, rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: CONFIRMAR ELIMINAR ASAMBLEA ================= */}
      {asambleaAEliminar && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setAsambleaAEliminar(null)}
        >
          <div
            className="bg-[#121722] border border-[#2f3952] rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">¿Eliminar asamblea?</h3>
            <p className="text-sm text-slate-300">
              Se eliminará la sesión <strong>{asambleaAEliminar.titulo}</strong> del historial.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAsambleaAEliminar(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1c2334] text-slate-200 text-sm font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminarAsamblea}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: GESTIONAR SOCIO ================= */}
      {socioEdit && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSocioEdit(null)}
        >
          <div
            className="bg-[#121722] border border-[#2f3952] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">
              Gestionar a {socioEdit.full_name || socioEdit.email}
            </h3>
            <form onSubmit={handleGuardarSocio} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Rol en el sindicato</label>
                <select
                  value={formSocioEdit.role}
                  onChange={(e) => setFormSocioEdit({ ...formSocioEdit, role: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                >
                  <option value="socio">Socio</option>
                  {userRol === 'superadmin' && <option value="admin">Administrador (Presidente)</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Estado de acceso</label>
                <select
                  value={formSocioEdit.estado}
                  onChange={(e) => setFormSocioEdit({ ...formSocioEdit, estado: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                >
                  <option value="activo">Activo</option>
                  <option value="pendiente_correo">Falta validar correo</option>
                  <option value="suspendido">Suspendido (sin acceso)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSocioEdit(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#1c2334] text-slate-200 text-sm font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#e5b32a] hover:bg-[#f0c038] text-[#0b0e14] text-sm font-bold cursor-pointer"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div
          suppressHydrationWarning
          className="w-full min-h-[60vh] bg-[#0b0e14] text-slate-200 flex items-center justify-center p-6"
        >
          <p className="text-sm text-slate-300">Cargando panel...</p>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}