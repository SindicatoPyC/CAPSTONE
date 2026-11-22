'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import emailjs from '@emailjs/browser';
import { createClient } from '../lib/supabase';
import { PLANES_SAAS, PlanId, ETIQUETAS_MODULOS } from '../lib/planes';

// --- CONFIGURACIÓN EMAILJS (.env.local) ---
const EMAILJS_SERVICE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_thw7gfn';
// Plantilla 1: Creación / Activación de Sindicatos
const EMAILJS_TEMPLATE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_VALIDACION_ID ||
  process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ||
  'template_ot9airk';
// Plantilla 2: Incorporación de Socios / Postulantes (código 6 dígitos)
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

type Tab = 'resumen' | 'ordenes' | 'postulaciones' | 'sindicatos' | 'usuarios' | 'activaciones';

type EstadoOrden =
  | 'Pendiente'
  | 'Pago Aprobado'
  | 'Activado'
  | 'Rechazado'
  | 'Esperando Webpay'
  | 'Pago Fallido'
  | 'Aprobado'
  | 'En Revisión';

interface OrdenPlan {
  id: number;
  orden_numero?: string;
  plan_id?: PlanId;
  plan_nombre: string;
  monto_pagado: number;
  es_trial?: boolean;
  usuario_nombre: string;
  usuario_email: string;
  usuario_rut: string;
  nombre_sindicato: string;
  rut_sindicato: string;
  tarjeta_titular?: string;
  tarjeta_marca?: string;
  tarjeta_ultimos4?: string;
  comprobante_ref?: string;
  webpay_auth_code?: string;
  sindicato_id?: number;
  codigo_validacion?: string;
  estado: EstadoOrden;
  motivo_rechazo?: string;
  fecha_aprobacion_pago?: string;
  fecha_activacion?: string;
  created_at: string;
}

interface CredencialesEmitidas {
  ordenNumero: string;
  sindicatoId: number;
  sindicatoNombre: string;
  codigoValidacion: string;
  adminEmail: string;
  adminRut: string;
  adminPassword: string;
  link: string;
  correoOk: boolean;
}

interface CredencialesSocioEmitidas {
  ordenSocio: string;
  sindicatoId: number;
  sindicatoNombre: string;
  fullName: string;
  rut: string;
  email: string;
  password: string;
  codigoCorreo: string;
  linkValidacion: string;
  role: string;
  correoEnviado: boolean;
}

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

function obtenerEstiloEstado(estado: string) {
  switch (estado) {
    case 'Activado':
      return {
        label: 'Sindicato Activo',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
        dot: 'bg-emerald-400',
      };
    case 'Pago Aprobado':
    case 'Aprobado':
      return {
        label: 'Correo enviado · Falta activar',
        badge: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
        dot: 'bg-sky-400',
      };
    case 'Pendiente':
    case 'En Revisión':
      return {
        label: 'Por revisar pago',
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
        dot: 'bg-amber-400',
      };
    case 'Esperando Webpay':
      return {
        label: 'En proceso Webpay',
        badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
        dot: 'bg-slate-400',
      };
    case 'Rechazado':
    case 'Pago Fallido':
      return {
        label: estado === 'Pago Fallido' ? 'Pago fallido en Webpay' : 'Rechazado',
        badge: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
        dot: 'bg-rose-400',
      };
    default:
      return {
        label: estado || 'Sin estado',
        badge: 'bg-slate-700/40 text-slate-200 border-slate-600',
        dot: 'bg-slate-400',
      };
  }
}

async function copiarTextoSeguro(texto: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Fallback para navegadores con restricciones de portapapeles
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

export default function SuperAdminPanel() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [validando, setValidando] = useState(true);
  const [superAdmin, setSuperAdmin] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('ordenes');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  // Datos principales
  const [sindicatos, setSindicatos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenPlan[]>([]);
  const [postulaciones, setPostulaciones] = useState<any[]>([]);
  const [notificacionesSA, setNotificacionesSA] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [actualizando, setActualizando] = useState(false);

  // Filtros Órdenes y Usuarios
  const [filtroEstadoOrden, setFiltroEstadoOrden] = useState<string>('Todos');
  const [busquedaOrden, setBusquedaOrden] = useState('');
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [procesandoId, setProcesandoId] = useState<number | null>(null);

  // Estados de Postulaciones de Socios (Multi-Sindicato)
  const [filtroEstadoPost, setFiltroEstadoPost] = useState<'Todas' | 'Pendientes' | 'Aprobadas' | 'Rechazadas'>('Todas');
  const [filtroSindicatoPost, setFiltroSindicatoPost] = useState<string>('todos');
  const [busquedaPost, setBusquedaPost] = useState('');
  const [procesandoPostId, setProcesandoPostId] = useState<number | null>(null);
  const [errorPostulacion, setErrorPostulacion] = useState<{
    id: number;
    nombre: string;
    mensaje: string;
  } | null>(null);
  const [postARechazar, setPostARechazar] = useState<any>(null);
  const [credSocioEmitidas, setCredSocioEmitidas] = useState<CredencialesSocioEmitidas | null>(null);
  const [modalNuevoPostulante, setModalNuevoPostulante] = useState(false);
  const [formNuevoPost, setFormNuevoPost] = useState({
    sindicato_id: '',
    full_name: '',
    rut: '',
    email: '',
    telefono: '',
    rol_solicitado: 'socio',
  });

  // Modal de credenciales de sindicato recién emitidas
  const [credencialesEmitidas, setCredencialesEmitidas] = useState<CredencialesEmitidas | null>(null);

  // Modal de rechazo de orden
  const [ordenARechazar, setOrdenARechazar] = useState<OrdenPlan | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState(
    'El pago no pudo ser verificado en la cuenta o fue anulado.'
  );

  // Modal de eliminación de orden
  const [ordenAEliminar, setOrdenAEliminar] = useState<OrdenPlan | null>(null);

  // Modal Crear / Editar Orden
  const [modalOrden, setModalOrden] = useState(false);
  const [editOrdenId, setEditOrdenId] = useState<number | null>(null);
  const [formOrden, setFormOrden] = useState({
    usuario_nombre: '',
    usuario_email: '',
    usuario_rut: '',
    nombre_sindicato: '',
    rut_sindicato: '',
    plan_id: 'estandar' as PlanId,
    monto_pagado: 9990,
    comprobante_ref: '',
    estado: 'Pendiente' as EstadoOrden,
  });

  // Modal Crear / Editar Sindicato
  const [modalSindicato, setModalSindicato] = useState(false);
  const [editSindicatoId, setEditSindicatoId] = useState<number | null>(null);
  const [formSindicato, setFormSindicato] = useState({
    nombre: '',
    rut_sindicato: '',
    logo_url: '',
    estado: 'activo',
  });

  // Modal Editar Usuario
  const [usuarioEdit, setUsuarioEdit] = useState<any>(null);
  const [formUsuario, setFormUsuario] = useState({
    role: 'socio',
    sindicato_id: '',
    estado: 'activo',
  });

  const notificar = useCallback((texto: string, tipo: 'ok' | 'err' = 'ok') => {
    setAviso({ tipo, texto });
    setTimeout(() => {
      setAviso((prev) => (prev?.texto === texto ? null : prev));
    }, 6000);
  }, []);

  const cargarDatos = useCallback(
    async (saUserId?: string) => {
      setActualizando(true);
      try {
        const supabase = createClient();
        const uid = saUserId || superAdmin?.id;

        const [sindRes, usrRes, ordRes, postRes, asistRes, notifRes] = await Promise.all([
          supabase.from('sindicatos').select('*').order('id', { ascending: true }),
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('solicitudes_planes').select('*').order('created_at', { ascending: false }),
          supabase.from('postulaciones').select('*').order('created_at', { ascending: false }),
          supabase
            .from('asistencia_asambleas')
            .select('*')
            .order('hora_entrada', { ascending: false })
            .limit(30),
          uid
            ? supabase
                .from('notificaciones')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false })
                .limit(20)
            : Promise.resolve({ data: [] }),
        ]);

        if (Array.isArray(sindRes.data)) setSindicatos(sindRes.data);
        if (Array.isArray(usrRes.data)) setUsuarios(usrRes.data);
        if (Array.isArray(ordRes.data)) setOrdenes(ordRes.data as OrdenPlan[]);
        if (Array.isArray(postRes.data)) setPostulaciones(postRes.data);
        if (Array.isArray(asistRes.data)) setAsistencias(asistRes.data);
        if (Array.isArray(notifRes.data)) setNotificacionesSA(notifRes.data);
      } finally {
        setActualizando(false);
      }
    },
    [superAdmin?.id]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

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

      if (String(perfil?.role || '').trim().toLowerCase() !== 'superadmin') {
        router.push('/dashboard');
        return;
      }

      setSuperAdmin(perfil);
      setValidando(false);
      await cargarDatos(user.id);

      // Actualización en tiempo real para órdenes, sindicatos, postulaciones y notificaciones
      rtChannel = supabase
        .channel(`sa-live-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_planes' }, () =>
          cargarDatos(user.id)
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'postulaciones' }, () =>
          cargarDatos(user.id)
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sindicatos' }, () =>
          cargarDatos(user.id)
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () =>
          cargarDatos(user.id)
        )
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, () =>
          cargarDatos(user.id)
        )
        .subscribe();
    };

    iniciar();

    return () => {
      if (rtChannel) supabase.removeChannel(rtChannel);
    };
  }, [mounted, router, cargarDatos]);

  // --- ENVÍO POR EMAILJS (PERMITE ELEGIR PLANTILLA DE SINDICATO O DE SOCIO) ---
  const enviarCorreoEmailJS = async (
    params: Record<string, string>,
    templateIdOverride?: string
  ) => {
    const templateToUse = templateIdOverride || EMAILJS_TEMPLATE_ID;
    if (!EMAILJS_PUBLIC_KEY || !templateToUse) {
      console.warn('Faltan credenciales de EmailJS para template:', templateToUse);
      return false;
    }
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, templateToUse, params, EMAILJS_PUBLIC_KEY);
      return true;
    } catch (err) {
      console.error('Error EmailJS:', err);
      return false;
    }
  };

  // --- APROBAR POSTULACIÓN DE SOCIO / DIRECTIVO DESDE SUPERADMIN ---
  const handleAprobarPostulacion = async (post: any) => {
    setProcesandoPostId(post.id);
    setErrorPostulacion(null);
    const supabase = createClient();

    try {
      // 1. RPC atómico: crea el socio en auth.users + profiles con código de 6 dígitos Bcrypt
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
        throw new Error(rpcRes?.error || 'No se pudo aprobar la postulación ni crear la cuenta.');
      }

      const sindObj = sindicatos.find((s) => Number(s.id) === Number(post.sindicato_id));
      const sindNombre = sindObj?.nombre || `Sindicato #${post.sindicato_id}`;
      const baseUrl = obtenerBaseUrlPublica();
      const linkValidacion = `${baseUrl}/validar-correo?email=${encodeURIComponent(
        String(rpcRes.email)
      )}&sindicato=${encodeURIComponent(sindNombre)}`;

      const ordenSocio = `INC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const rolEtiqueta = String(rpcRes.role) === 'admin' ? 'Directivo' : 'Socio';

      // 2. Despachar Orden de Incorporación con la plantilla dedicada de Socios
      const correoEnviado = await enviarCorreoEmailJS(
        {
          to_email: String(rpcRes.email),
          to_name: String(rpcRes.full_name),
          orden_socio: ordenSocio,
          sindicato_nombre: sindNombre,
          sindicato_id: String(post.sindicato_id || ''),
          rol_asignado: rolEtiqueta,
          codigo_correo: String(rpcRes.codigo_correo || ''),
          socio_rut: formatRutLegible(rpcRes.rut),
          socio_password: String(rpcRes.password),
          link_validacion: linkValidacion,
          fecha: new Date().toLocaleDateString('es-CL'),
        },
        EMAILJS_TEMPLATE_SOCIO_ID
      );

      setCredSocioEmitidas({
        ordenSocio,
        sindicatoId: Number(post.sindicato_id || 0),
        sindicatoNombre: sindNombre,
        fullName: String(rpcRes.full_name),
        rut: String(rpcRes.rut),
        email: String(rpcRes.email),
        password: String(rpcRes.password),
        codigoCorreo: String(rpcRes.codigo_correo || ''),
        linkValidacion,
        role: String(rpcRes.role),
        correoEnviado,
      });

      await cargarDatos();
      notificar(
        correoEnviado
          ? `${post.full_name} aprobado en ${sindNombre} y orden ${ordenSocio} enviada a ${rpcRes.email}.`
          : `${post.full_name} creado en BD (verifica NEXT_PUBLIC_EMAILJS_TEMPLATE_SOCIO_ID o copia los datos del resumen).`
      );
    } catch (err: any) {
      // Rollback a Pendiente si ocurrió un error
      try {
        await supabase.from('postulaciones').update({ estado: 'Pendiente' }).eq('id', post.id);
      } catch {
        // Ignorar fallo secundario
      }

      const detalle = err?.message || 'Error inesperado al aprobar la postulación.';
      setFiltroEstadoPost('Pendientes');
      setErrorPostulacion({
        id: post.id,
        nombre: post.full_name || 'Postulante',
        mensaje: detalle,
      });
      await cargarDatos();
      notificar(`No se pudo aprobar a ${post.full_name}. Volvió a Pendientes para reintentar.`, 'err');
    } finally {
      setProcesandoPostId(null);
    }
  };

  // --- DEVOLVER POSTULACIÓN A PENDIENTE ---
  const handleVolverPostAPendiente = async (post: any) => {
    setProcesandoPostId(post.id);
    setErrorPostulacion(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('postulaciones')
        .update({ estado: 'Pendiente' })
        .eq('id', post.id);
      if (error) throw error;

      setFiltroEstadoPost('Pendientes');
      await cargarDatos();
      notificar(`La postulación de ${post.full_name} volvió a Pendientes.`);
    } catch (err: any) {
      notificar(err.message || 'No se pudo devolver a Pendiente.', 'err');
    } finally {
      setProcesandoPostId(null);
    }
  };

  // --- RECHAZAR POSTULACIÓN ---
  const confirmarRechazarPostulacion = async () => {
    if (!postARechazar) return;
    setProcesandoPostId(postARechazar.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('postulaciones')
        .update({ estado: 'Rechazada' })
        .eq('id', postARechazar.id);
      if (error) throw error;

      const nombre = postARechazar.full_name;
      setPostARechazar(null);
      await cargarDatos();
      notificar(`La postulación de ${nombre} fue rechazada.`);
    } catch (err: any) {
      notificar(err.message || 'No se pudo rechazar la postulación.', 'err');
    } finally {
      setProcesandoPostId(null);
    }
  };

  // --- REGISTRAR POSTULANTE MANUALMENTE PARA CUALQUIER SINDICATO ---
  const handleRegistrarPostulante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNuevoPost.sindicato_id) {
      notificar('Selecciona el sindicato destino para el postulante.', 'err');
      return;
    }

    const cleanRut = formNuevoPost.rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (cleanRut.length < 8) {
      notificar('Ingresa un RUT completo (ej: 15432198-5).', 'err');
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from('postulaciones').insert([
        {
          sindicato_id: Number(formNuevoPost.sindicato_id),
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
      setFormNuevoPost({
        sindicato_id: '',
        full_name: '',
        rut: '',
        email: '',
        telefono: '',
        rol_solicitado: 'socio',
      });
      setFiltroEstadoPost('Pendientes');
      await cargarDatos();
      notificar('Postulante agregado al padrón de revisión.');
    } catch (err: any) {
      notificar(err.message || 'Error al registrar postulante.', 'err');
    }
  };

  // --- APROBAR PAGO DE SINDICATO -> RPC + ENVÍO EMAILJS (PLANTILLA SINDICATOS) ---
  const handleAprobarPago = async (orden: OrdenPlan) => {
    setProcesandoId(orden.id);
    try {
      const supabase = createClient();
      const nombrePlanLower = String(orden.plan_nombre || '').toLowerCase();

      const planKey: PlanId =
        orden.plan_id && PLANES_SAAS[orden.plan_id]
          ? orden.plan_id
          : nombrePlanLower.includes('premium')
          ? 'premium'
          : nombrePlanLower.includes('est')
          ? 'estandar'
          : nombrePlanLower.includes('trial')
          ? 'trial'
          : 'basico';

      const planDef = PLANES_SAAS[planKey];

      const { data: res, error } = await supabase.rpc('aprobar_orden_pago_superadmin', {
        p_solicitud_id: orden.id,
        p_plan_id: planDef.id,
        p_max_socios: planDef.maxSocios,
        p_es_trial: planDef.esTrial,
        p_modulos: planDef.modulos_activos,
      });

      if (error) throw error;
      if (!res?.ok) throw new Error(res?.error || 'No se pudo aprobar la orden.');

      const linkActivacion = `${obtenerBaseUrlPublica()}/validar-sindicato?sid=${res.sindicato_id}`;
      const modulosTexto = Object.entries(planDef.modulos_activos)
        .filter(([, activo]) => activo)
        .map(([k]) => ETIQUETAS_MODULOS[k] || k)
        .join(', ');

      const credSindicatoTexto = `ID Sindicato: #${res.sindicato_id} | Código de Activación: ${res.codigo_validacion}`;
      const credAdminTexto = `RUT: ${res.admin_rut} | Correo: ${res.admin_email} | Contraseña: ${res.admin_password}`;

      const cuerpoMensaje =
        `Confirmamos la validación de tu orden ${res.orden_numero} (${planDef.nombre}).\n` +
        `Organización: ${orden.nombre_sindicato} (RUT ${orden.rut_sindicato})\n` +
        `Límite de socios: ${planDef.maxSociosTexto}\n` +
        `Módulos incluidos: ${modulosTexto}\n\n` +
        `Pasos para activar tu plataforma:\n` +
        `1. Haz clic en el botón "Validar y Activar Sindicato".\n` +
        `2. Ingresa el ID de Sindicato (#${res.sindicato_id}) y el Código (${res.codigo_validacion}).\n` +
        `3. Confirma con tu correo y contraseña de Administrador para activar y entrar a tu panel.`;

      const correoOk = await enviarCorreoEmailJS(
        {
          to_email: res.admin_email,
          to_name: orden.usuario_nombre,
          orden_numero: res.orden_numero,
          sindicato_nombre: orden.nombre_sindicato,
          estado_solicitud: 'PAGO APROBADO',
          credenciales_sindicato: credSindicatoTexto,
          credenciales_admin: credAdminTexto,
          link_activacion: linkActivacion,
          mensaje: cuerpoMensaje,
          fecha: new Date().toLocaleDateString('es-CL'),
        },
        EMAILJS_TEMPLATE_ID
      );

      setCredencialesEmitidas({
        ordenNumero: res.orden_numero,
        sindicatoId: res.sindicato_id,
        sindicatoNombre: orden.nombre_sindicato,
        codigoValidacion: res.codigo_validacion,
        adminEmail: res.admin_email,
        adminRut: res.admin_rut,
        adminPassword: res.admin_password,
        link: linkActivacion,
        correoOk,
      });

      await cargarDatos();
      notificar(
        correoOk
          ? `Orden ${res.orden_numero} aprobada. Correo con credenciales enviado a ${res.admin_email}.`
          : `Orden ${res.orden_numero} aprobada. Revisa tus llaves de EmailJS si el correo no salió.`
      );
    } catch (err: any) {
      notificar(err.message || 'Ocurrió un error al aprobar la orden.', 'err');
    } finally {
      setProcesandoId(null);
    }
  };

  // --- RECHAZAR PAGO (DESDE MODAL INTEGRADO) ---
  const confirmarRechazoPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenARechazar) return;

    const orden = ordenARechazar;
    const motivoLimpio = motivoRechazo.trim() || 'No pudimos confirmar el pago en nuestra cuenta.';
    setProcesandoId(orden.id);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('solicitudes_planes')
        .update({ estado: 'Rechazado', motivo_rechazo: motivoLimpio })
        .eq('id', orden.id);

      if (error) throw error;

      const ordenNum = orden.orden_numero || `ORD-${orden.id}`;
      const correoOk = await enviarCorreoEmailJS(
        {
          to_email: orden.usuario_email,
          to_name: orden.usuario_nombre,
          orden_numero: ordenNum,
          sindicato_nombre: orden.nombre_sindicato,
          estado_solicitud: 'PAGO RECHAZADO',
          credenciales_sindicato: 'No emitidas (orden rechazada)',
          credenciales_admin: 'No emitidas (orden rechazada)',
          link_activacion: `${obtenerBaseUrlPublica()}/planes`,
          mensaje: `Tu orden ${ordenNum} para "${orden.nombre_sindicato}" fue rechazada.\nMotivo indicado por administración: ${motivoLimpio}\n\nPuedes volver a intentarlo desde la sección de Planes.`,
          fecha: new Date().toLocaleDateString('es-CL'),
        },
        EMAILJS_TEMPLATE_ID
      );

      setOrdenARechazar(null);
      await cargarDatos();
      notificar(
        correoOk
          ? `Orden rechazada y aviso enviado a ${orden.usuario_email}.`
          : 'Orden marcada como rechazada (verifica la configuración de EmailJS).'
      );
    } catch (err: any) {
      notificar(`Error al rechazar la orden: ${err.message}`, 'err');
    } finally {
      setProcesandoId(null);
    }
  };

  // --- CREAR / EDITAR ORDEN ---
  const handleGuardarOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supabase = createClient();
      const planDef = PLANES_SAAS[formOrden.plan_id];
      const payload = {
        usuario_nombre: formOrden.usuario_nombre.trim(),
        usuario_email: formOrden.usuario_email.trim().toLowerCase(),
        usuario_rut: formOrden.usuario_rut.replace(/[^0-9kK]/g, '').toUpperCase(),
        nombre_sindicato: formOrden.nombre_sindicato.trim(),
        rut_sindicato: formOrden.rut_sindicato.trim(),
        plan_id: planDef.id,
        plan_nombre: planDef.nombre,
        monto_pagado: Number(formOrden.monto_pagado || 0),
        es_trial: planDef.esTrial,
        comprobante_ref: formOrden.comprobante_ref.trim() || 'MANUAL-ADMIN',
        estado: formOrden.estado,
      };

      if (editOrdenId) {
        const { error } = await supabase
          .from('solicitudes_planes')
          .update(payload)
          .eq('id', editOrdenId);
        if (error) throw error;
        notificar('Los cambios de la orden fueron guardados.');
      } else {
        const { error } = await supabase.from('solicitudes_planes').insert([
          {
            ...payload,
            orden_numero: `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
            tarjeta_marca: 'Ingreso Manual',
            tarjeta_ultimos4: '0000',
          },
        ]);
        if (error) throw error;
        notificar('Nueva orden registrada correctamente.');
      }

      setModalOrden(false);
      setEditOrdenId(null);
      await cargarDatos();
    } catch (err: any) {
      notificar(err.message || 'No se pudo guardar la orden.', 'err');
    }
  };

  // --- ELIMINAR ORDEN ---
  const confirmarEliminarOrden = async () => {
    if (!ordenAEliminar) return;
    setProcesandoId(ordenAEliminar.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('solicitudes_planes')
        .delete()
        .eq('id', ordenAEliminar.id);
      if (error) throw error;
      setOrdenAEliminar(null);
      await cargarDatos();
      notificar('La orden fue eliminada.');
    } catch (err: any) {
      notificar(err.message || 'No se pudo eliminar la orden.', 'err');
    } finally {
      setProcesandoId(null);
    }
  };

  // --- CREAR / EDITAR SINDICATO ---
  const handleGuardarSindicato = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supabase = createClient();
      const payload = {
        nombre: formSindicato.nombre.trim(),
        rut_sindicato: formSindicato.rut_sindicato.trim(),
        logo_url: formSindicato.logo_url.trim() || null,
        estado: formSindicato.estado,
      };

      if (editSindicatoId) {
        const { error } = await supabase
          .from('sindicatos')
          .update(payload)
          .eq('id', editSindicatoId);
        if (error) throw error;
        notificar('Datos del sindicato actualizados.');
      } else {
        const { error } = await supabase
          .from('sindicatos')
          .insert([{ ...payload, validado: true }]);
        if (error) throw error;
        notificar('Nuevo sindicato creado y activo.');
      }

      setModalSindicato(false);
      setEditSindicatoId(null);
      await cargarDatos();
    } catch (err: any) {
      notificar(err.message || 'No se pudo guardar el sindicato.', 'err');
    }
  };

  const toggleEstadoSindicato = async (s: any) => {
    const nuevo = (s.estado || 'activo') === 'activo' ? 'suspendido' : 'activo';
    const supabase = createClient();
    const { error } = await supabase.from('sindicatos').update({ estado: nuevo }).eq('id', s.id);
    if (error) {
      notificar(error.message, 'err');
      return;
    }
    await cargarDatos();
    notificar(
      nuevo === 'activo'
        ? `Acceso reactivado para "${s.nombre}".`
        : `Acceso suspendido temporalmente para "${s.nombre}".`
    );
  };

  // --- ACTUALIZAR USUARIO ---
  const handleGuardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEdit) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        role: formUsuario.role,
        sindicato_id: formUsuario.sindicato_id ? Number(formUsuario.sindicato_id) : null,
        estado: formUsuario.estado,
        email_verificado: formUsuario.estado === 'activo' ? true : usuarioEdit.email_verificado,
      })
      .eq('id', usuarioEdit.id);

    if (error) {
      notificar(error.message, 'err');
      return;
    }
    setUsuarioEdit(null);
    await cargarDatos();
    notificar('Permisos del usuario actualizados.');
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = 'sb-sindicato-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'sb-sindicato-rol=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/');
  };

  if (!mounted || validando) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-slate-200 flex flex-col items-center justify-center gap-3 p-6">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-[#e5b32a] rounded-full animate-spin" />
        <p className="text-sm text-slate-300">Verificando acceso de SuperAdmin...</p>
      </div>
    );
  }

  // Métricas Órdenes
  const ordenesPorRevisar = ordenes.filter(
    (o) => o.estado === 'Pendiente' || o.estado === 'En Revisión'
  ).length;
  const ordenesPorActivar = ordenes.filter(
    (o) => o.estado === 'Pago Aprobado' || o.estado === 'Aprobado'
  ).length;
  const ordenesActivadas = ordenes.filter((o) => o.estado === 'Activado').length;
  const ingresosValidados = ordenes
    .filter((o) => o.estado === 'Pago Aprobado' || o.estado === 'Aprobado' || o.estado === 'Activado')
    .reduce((acc, o) => acc + Number(o.monto_pagado || 0), 0);

  // Métricas Postulaciones de Socios
  const postPendientes = postulaciones.filter(
    (p) => !p.estado || p.estado === 'Pendiente' || p.estado === 'En Revisión'
  );
  const postAprobadas = postulaciones.filter((p) => p.estado === 'Aceptada' || p.estado === 'Aprobada');
  const postRechazadas = postulaciones.filter((p) => p.estado === 'Rechazada');

  const postulacionesFiltradas = postulaciones.filter((p) => {
    const est = String(p.estado || 'Pendiente');
    const matchEstado =
      filtroEstadoPost === 'Todas' ||
      (filtroEstadoPost === 'Pendientes' && (est === 'Pendiente' || est === 'En Revisión')) ||
      (filtroEstadoPost === 'Aprobadas' && (est === 'Aceptada' || est === 'Aprobada')) ||
      (filtroEstadoPost === 'Rechazadas' && est === 'Rechazada');

    const matchSind =
      filtroSindicatoPost === 'todos' || String(p.sindicato_id) === String(filtroSindicatoPost);

    const q = busquedaPost.toLowerCase().trim();
    const sindNombre =
      sindicatos.find((s) => Number(s.id) === Number(p.sindicato_id))?.nombre || '';
    const matchTexto =
      !q ||
      String(p.full_name || '').toLowerCase().includes(q) ||
      String(p.rut || '').toLowerCase().includes(q) ||
      String(p.email || '').toLowerCase().includes(q) ||
      sindNombre.toLowerCase().includes(q);

    return matchEstado && matchSind && matchTexto;
  });

  const ordenesFiltradas = ordenes.filter((o) => {
    const coincideEstado =
      filtroEstadoOrden === 'Todos' ||
      (filtroEstadoOrden === 'Por revisar' && (o.estado === 'Pendiente' || o.estado === 'En Revisión')) ||
      (filtroEstadoOrden === 'Esperando activación' && (o.estado === 'Pago Aprobado' || o.estado === 'Aprobado')) ||
      (filtroEstadoOrden === 'Activos' && o.estado === 'Activado') ||
      (filtroEstadoOrden === 'Rechazados' && (o.estado === 'Rechazado' || o.estado === 'Pago Fallido')) ||
      (filtroEstadoOrden === 'En Webpay' && o.estado === 'Esperando Webpay');

    const q = busquedaOrden.toLowerCase().trim();
    const coincideTexto =
      !q ||
      String(o.orden_numero || '').toLowerCase().includes(q) ||
      String(o.nombre_sindicato || '').toLowerCase().includes(q) ||
      String(o.usuario_nombre || '').toLowerCase().includes(q) ||
      String(o.usuario_email || '').toLowerCase().includes(q) ||
      String(o.rut_sindicato || '').toLowerCase().includes(q);

    return coincideEstado && coincideTexto;
  });

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busquedaUsuario.toLowerCase().trim();
    if (!q) return true;
    return (
      String(u.full_name || '').toLowerCase().includes(q) ||
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.rut || '').toLowerCase().includes(q)
    );
  });

  const maxSocios = Math.max(
    ...sindicatos.map((s) => usuarios.filter((u) => Number(u.sindicato_id) === Number(s.id)).length),
    1
  );

  const sindicatosValidadosRecientes = sindicatos
    .filter((s) => s.config_ui?.reporte_activacion)
    .sort((a, b) => new Date(b.fecha_validacion || 0).getTime() - new Date(a.fecha_validacion || 0).getTime());

  const menuItems: { id: Tab; titulo: string; subtitulo: string; badge?: number; badgeColor?: string }[] = [
    { id: 'ordenes', titulo: 'Órdenes y Pagos', subtitulo: 'Aprobar nuevos sindicatos', badge: ordenesPorRevisar },
    {
      id: 'postulaciones',
      titulo: 'Postulaciones Socios',
      subtitulo: 'Aprobar socios y enviar código',
      badge: postPendientes.length,
      badgeColor: 'bg-emerald-400 text-[#06231a]',
    },
    { id: 'resumen', titulo: 'Resumen General', subtitulo: 'Números y gráficos simples' },
    { id: 'sindicatos', titulo: 'Sindicatos', subtitulo: `${sindicatos.length} organizaciones` },
    { id: 'usuarios', titulo: 'Usuarios', subtitulo: `${usuarios.length} cuentas registradas` },
    { id: 'activaciones', titulo: 'Activaciones y Registro', subtitulo: 'Confirmaciones recibidas' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#0b0e14] text-slate-100 font-sans antialiased box-border">
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
            className="text-slate-300 hover:text-white text-sm font-semibold px-1 cursor-pointer"
            aria-label="Cerrar mensaje"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row min-h-screen w-full">
        {/* ================= BARRA LATERAL ================= */}
        <aside className="w-full lg:w-72 bg-[#10141e] border-b lg:border-b-0 lg:border-r border-[#232a3b] flex flex-col justify-between shrink-0">
          <div>
            <div className="px-5 py-5 border-b border-[#232a3b] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#e5b32a] text-[#0b0e14] font-bold text-sm flex items-center justify-center shrink-0">
                  PYC
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-semibold text-white leading-tight truncate">
                    Panel SuperAdmin
                  </h1>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {superAdmin?.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="lg:hidden px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-300 text-xs font-medium cursor-pointer"
              >
                Salir
              </button>
            </div>

            <nav className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5">
              {menuItems.map((item) => {
                const activo = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      activo
                        ? 'bg-[#1b2233] border-[#e5b32a]/60 text-white'
                        : 'bg-transparent border-transparent text-slate-300 hover:bg-[#161c2a] hover:text-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-tight truncate">{item.titulo}</div>
                      <div className="hidden lg:block text-xs text-slate-400 mt-0.5 truncate">
                        {item.subtitulo}
                      </div>
                    </div>
                    {item.badge ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                          item.badgeColor || 'bg-[#e5b32a] text-[#0b0e14]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="hidden lg:flex flex-col gap-2 p-4 border-t border-[#232a3b]">
            <Link
              href="/dashboard"
              className="w-full text-center py-2.5 px-3 rounded-xl text-sm font-medium text-slate-200 bg-[#181f2e] hover:bg-[#222b3f] border border-[#2c354b] transition-colors"
            >
              Ir al Portal de Socios
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 px-3 rounded-xl text-sm font-medium text-rose-300 hover:bg-rose-500/15 border border-rose-500/30 transition-colors cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* ================= ÁREA DE TRABAJO PRINCIPAL ================= */}
        <main className="flex-1 min-w-0 w-full p-4 sm:p-6 lg:p-9">
          <div className="max-w-5xl mx-auto space-y-7">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#232a3b]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#e5b32a]">
                  Sindicato PYC · Administración Central
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Los datos se actualizan solos cuando entra un pago, una postulación o se activa un sindicato.
                </p>
              </div>
              <button
                type="button"
                onClick={() => cargarDatos()}
                disabled={actualizando}
                className="px-3.5 py-2 rounded-lg bg-[#161c2a] hover:bg-[#1e2638] border border-[#2c354b] text-xs font-medium text-slate-200 cursor-pointer disabled:opacity-50"
              >
                {actualizando ? 'Actualizando...' : 'Actualizar datos'}
              </button>
            </div>

            {/* ==============================================================
                SECCIÓN 1: ÓRDENES Y VALIDACIÓN DE PAGOS (SINDICATOS)
               ============================================================== */}
            {tab === 'ordenes' && (
              <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Órdenes y Validación de Pagos</h2>
                    <p className="text-sm text-slate-300 mt-1">
                      Aquí llegan los pagos hechos por Webpay. Revisa cada orden y decide si aprobar o rechazar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditOrdenId(null);
                      setFormOrden({
                        usuario_nombre: '',
                        usuario_email: '',
                        usuario_rut: '',
                        nombre_sindicato: '',
                        rut_sindicato: '',
                        plan_id: 'estandar',
                        monto_pagado: 9990,
                        comprobante_ref: '',
                        estado: 'Pendiente',
                      });
                      setModalOrden(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-[#0b0e14] text-sm font-semibold cursor-pointer shrink-0"
                  >
                    + Registrar Orden Manual
                  </button>
                </header>

                <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[#e5b32a]/20 text-[#e5b32a] font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">Revisa el comprobante</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Confirma que la orden tenga referencia Webpay aprobada y el correo sea correcto.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">Aprueba y envía correo</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        El sistema crea el sindicato, genera la clave del admin y envía todo al Gmail.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">Activación automática</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Cuando el presidente abre su enlace y valida el código, la orden pasa a Activo sola.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 justify-between">
                  <div className="flex flex-wrap gap-2">
                    {['Todos', 'Por revisar', 'Esperando activación', 'Activos', 'Rechazados', 'En Webpay'].map(
                      (filtro) => (
                        <button
                          key={filtro}
                          type="button"
                          onClick={() => setFiltroEstadoOrden(filtro)}
                          className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                            filtroEstadoOrden === filtro
                              ? 'bg-[#e5b32a] text-[#0b0e14] border-[#e5b32a]'
                              : 'bg-[#121722] text-slate-300 border-[#252e42] hover:border-slate-500'
                          }`}
                        >
                          {filtro}
                        </button>
                      )
                    )}
                  </div>

                  <input
                    type="text"
                    value={busquedaOrden}
                    onChange={(e) => setBusquedaOrden(e.target.value)}
                    placeholder="Buscar orden, sindicato o correo..."
                    className="w-full md:w-72 bg-[#121722] border border-[#2c354b] rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#e5b32a]"
                  />
                </div>

                <div className="space-y-4">
                  {ordenesFiltradas.length === 0 ? (
                    <div className="bg-[#121722] border border-[#232a3b] rounded-2xl p-10 text-center space-y-2">
                      <p className="text-base font-semibold text-white">No hay órdenes en esta vista</p>
                      <p className="text-sm text-slate-400">
                        Prueba cambiando el filtro de arriba o esperando una nueva contratación desde /planes.
                      </p>
                    </div>
                  ) : (
                    ordenesFiltradas.map((ord) => {
                      const estilo = obtenerEstiloEstado(ord.estado);
                      const esPendiente = ord.estado === 'Pendiente' || ord.estado === 'En Revisión';
                      const esEsperandoAct = ord.estado === 'Pago Aprobado' || ord.estado === 'Aprobado';

                      return (
                        <article
                          key={ord.id}
                          className="bg-[#121722] border border-[#252e42] rounded-2xl p-5 sm:p-6 space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#20283a]">
                            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                              <span className="px-2.5 py-1 rounded-md bg-[#1c2334] text-[#e5b32a] font-mono text-xs font-bold">
                                {ord.orden_numero || `ORD-${ord.id}`}
                              </span>
                              <h3 className="text-base font-bold text-white break-words">
                                {ord.nombre_sindicato}
                              </h3>
                              {ord.sindicato_id ? (
                                <span className="text-xs font-mono text-slate-300 bg-[#1a2030] px-2 py-0.5 rounded">
                                  ID #{ord.sindicato_id}
                                </span>
                              ) : null}
                            </div>

                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${estilo.badge}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${estilo.dot}`} />
                              {estilo.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="bg-[#0e121b] border border-[#1f2637] rounded-xl p-3.5">
                              <p className="text-xs text-slate-400 mb-1">Administrador solicitante</p>
                              <p className="font-semibold text-white break-words">{ord.usuario_nombre}</p>
                              <p className="text-xs text-slate-300 break-all mt-0.5">{ord.usuario_email}</p>
                              <p className="text-xs font-mono text-slate-400 mt-0.5">RUT: {ord.usuario_rut}</p>
                            </div>

                            <div className="bg-[#0e121b] border border-[#1f2637] rounded-xl p-3.5">
                              <p className="text-xs text-slate-400 mb-1">Organización y Plan</p>
                              <p className="font-semibold text-white">{ord.plan_nombre}</p>
                              <p className="text-xs font-mono text-slate-300 mt-0.5">
                                RUT Sindicato: {ord.rut_sindicato}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Fecha: {new Date(ord.created_at).toLocaleString('es-CL')}
                              </p>
                            </div>

                            <div className="bg-[#0e121b] border border-[#1f2637] rounded-xl p-3.5">
                              <p className="text-xs text-slate-400 mb-1">Comprobante de Pago</p>
                              <p className="font-bold text-[#e5b32a] font-mono">
                                ${Number(ord.monto_pagado || 0).toLocaleString('es-CL')} CLP
                                {ord.es_trial ? ' (Trial 30 días)' : ''}
                              </p>
                              <p className="text-xs font-mono text-slate-300 mt-0.5 break-all">
                                Ref: {ord.comprobante_ref || 'Sin comprobante'}
                              </p>
                              {ord.tarjeta_ultimos4 ? (
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {ord.tarjeta_marca || 'Webpay'} ···· {ord.tarjeta_ultimos4}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {ord.codigo_validacion && esEsperandoAct && (
                            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 flex flex-wrap items-center justify-between gap-2">
                              <span>
                                Código enviado al presidente: <strong className="font-mono text-white">{ord.codigo_validacion}</strong>
                              </span>
                              <span className="text-sky-300">Esperando que ingrese al enlace de Gmail</span>
                            </div>
                          )}

                          {ord.fecha_activacion && (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
                              Activación completada por su administrador el{' '}
                              <strong>{new Date(ord.fecha_activacion).toLocaleString('es-CL')}</strong>.
                            </div>
                          )}

                          {ord.motivo_rechazo && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
                              Motivo registrado: <strong>{ord.motivo_rechazo}</strong>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <div className="flex flex-wrap items-center gap-2.5">
                              {(esPendiente || esEsperandoAct) && (
                                <button
                                  type="button"
                                  disabled={procesandoId === ord.id}
                                  onClick={() => handleAprobarPago(ord)}
                                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#08130e] font-bold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {procesandoId === ord.id
                                    ? 'Generando credenciales y enviando correo...'
                                    : esEsperandoAct
                                    ? 'Reenviar Credenciales y Link por Correo'
                                    : 'Aprobar Pago y Enviar Credenciales'}
                                </button>
                              )}

                              {esPendiente && (
                                <button
                                  type="button"
                                  disabled={procesandoId === ord.id}
                                  onClick={() => {
                                    setOrdenARechazar(ord);
                                    setMotivoRechazo(
                                      'El pago no pudo ser verificado en la cuenta o fue anulado.'
                                    );
                                  }}
                                  className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/40 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                                >
                                  Rechazar Pago
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditOrdenId(ord.id);
                                  setFormOrden({
                                    usuario_nombre: ord.usuario_nombre,
                                    usuario_email: ord.usuario_email,
                                    usuario_rut: ord.usuario_rut,
                                    nombre_sindicato: ord.nombre_sindicato,
                                    rut_sindicato: ord.rut_sindicato,
                                    plan_id: ord.plan_id || 'estandar',
                                    monto_pagado: ord.monto_pagado,
                                    comprobante_ref: ord.comprobante_ref || '',
                                    estado: ord.estado,
                                  });
                                  setModalOrden(true);
                                }}
                                className="px-3.5 py-2 rounded-lg bg-[#1c2334] hover:bg-[#263047] text-slate-200 text-xs font-medium cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setOrdenAEliminar(ord)}
                                className="px-3.5 py-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-medium cursor-pointer"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ==============================================================
                SECCIÓN 2 (NUEVA): POSTULACIONES DE SOCIOS Y DIRECTIVOS (GLOBAL)
               ============================================================== */}
            {tab === 'postulaciones' && (
              <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Postulaciones de Socios y Directiva</h2>
                    <p className="text-sm text-slate-300 mt-1">
                      Aprueba postulantes para cualquier sindicato: crea su cuenta en BD y envía al tiro su código de 6 dígitos y credenciales por correo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormNuevoPost({
                        sindicato_id: sindicatos[0]?.id ? String(sindicatos[0].id) : '',
                        full_name: '',
                        rut: '',
                        email: '',
                        telefono: '',
                        rol_solicitado: 'socio',
                      });
                      setModalNuevoPostulante(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-[#0b0e14] text-sm font-bold cursor-pointer shrink-0"
                  >
                    + Agregar Postulante
                  </button>
                </header>

                {errorPostulacion && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/45 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-rose-200">
                        No se pudo aprobar a {errorPostulacion.nombre}
                      </p>
                      <p className="text-xs text-rose-100/90 mt-1 leading-relaxed">
                        {errorPostulacion.mensaje}
                      </p>
                      <p className="text-xs text-slate-300 mt-1.5">
                        La solicitud volvió automáticamente a <strong>Pendientes</strong> para que puedas reintentar.
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
                )}

                {/* Guía rápida 3 pasos */}
                <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[#e5b32a]/20 text-[#e5b32a] font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">Aprueba desde SuperAdmin</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Crea al socio o directivo en la base de datos vinculado al sindicato que postuló.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">Código de 6 dígitos (Bcrypt)</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Envía la Orden de Incorporación con su código único y contraseña temporal al Gmail.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">Valida e ingresa al tiro</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        El usuario valida en el login (pestaña Validar Socio) o desde el enlace móvil.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Filtros: Estado + Sindicato + Buscador */}
                <div className="flex flex-col gap-3">
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
                        onClick={() => setFiltroEstadoPost(f.id)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          filtroEstadoPost === f.id
                            ? 'bg-[#e5b32a] text-[#0b0e14] border-[#e5b32a]'
                            : 'bg-[#121722] text-slate-300 border-[#252e42] hover:border-slate-500'
                        }`}
                      >
                        {f.id} ({f.count})
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={filtroSindicatoPost}
                      onChange={(e) => setFiltroSindicatoPost(e.target.value)}
                      className="sm:w-64 bg-[#121722] border border-[#2c354b] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#e5b32a] cursor-pointer"
                    >
                      <option value="todos">Todos los sindicatos ({sindicatos.length})</option>
                      {sindicatos.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          #{s.id} — {s.nombre}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={busquedaPost}
                      onChange={(e) => setBusquedaPost(e.target.value)}
                      placeholder="Buscar por nombre, RUT, correo o sindicato..."
                      className="flex-1 bg-[#121722] border border-[#2c354b] rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#e5b32a]"
                    />
                  </div>
                </div>

                {/* Listado de tarjetas */}
                <div className="space-y-4">
                  {postulacionesFiltradas.length === 0 ? (
                    <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-10 text-center space-y-2">
                      <p className="text-base font-semibold text-white">No hay postulaciones en esta vista</p>
                      <p className="text-sm text-slate-400">
                        Prueba cambiando el filtro de estado o de sindicato.
                      </p>
                    </div>
                  ) : (
                    postulacionesFiltradas.map((post) => {
                      const est = String(post.estado || 'Pendiente');
                      const esPendiente = est === 'Pendiente' || est === 'En Revisión';
                      const esAprobada = est === 'Aceptada' || est === 'Aprobada';
                      const esDir = esCargoDirectivo(post.rol_solicitado);
                      const sind = sindicatos.find((s) => Number(s.id) === Number(post.sindicato_id));
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
                              <span className="px-2.5 py-1 rounded-md bg-[#1c2334] text-[#e5b32a] font-mono text-xs font-bold">
                                #{post.sindicato_id} {sind?.nombre || 'Sindicato'}
                              </span>
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

                          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              {esPendiente ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={procesandoPostId === post.id}
                                    onClick={() => handleAprobarPostulacion(post)}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#08130e] font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {procesandoPostId === post.id
                                      ? 'Creando cuenta y enviando código...'
                                      : tuvoError
                                      ? 'Reintentar Aprobación'
                                      : esDir
                                      ? 'Aprobar Directivo y Enviar Código'
                                      : 'Aprobar Socio y Enviar Código'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={procesandoPostId === post.id}
                                    onClick={() => setPostARechazar(post)}
                                    className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/40 font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    Rechazar
                                  </button>
                                </>
                              ) : (
                                <>
                                  {esAprobada && (
                                    <button
                                      type="button"
                                      disabled={procesandoPostId === post.id}
                                      onClick={() => handleAprobarPostulacion(post)}
                                      className="px-4 py-2 rounded-xl bg-[#e5b32a]/15 hover:bg-[#e5b32a]/25 border border-[#e5b32a]/40 text-[#f3c64f] font-semibold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      {procesandoPostId === post.id
                                        ? 'Reemitiendo...'
                                        : 'Reemitir Código (6 dígitos) y Reenviar Correo'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={procesandoPostId === post.id}
                                    onClick={() => handleVolverPostAPendiente(post)}
                                    className="px-4 py-2 rounded-xl bg-[#1c2334] hover:bg-[#263047] border border-[#2d374e] text-slate-200 font-medium text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    Volver a Pendiente
                                  </button>
                                </>
                              )}
                            </div>

                            {sind && (
                              <button
                                type="button"
                                onClick={() => {
                                  localStorage.setItem('sindicato_activo', String(sind.id));
                                  router.push('/dashboard/admin');
                                }}
                                className="px-3.5 py-2 rounded-lg bg-[#182030] hover:bg-[#222d42] text-sky-300 text-xs font-medium cursor-pointer"
                              >
                                Abrir panel de #{sind.id} →
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ==============================================================
                SECCIÓN 3: RESUMEN GENERAL
               ============================================================== */}
            {tab === 'resumen' && (
              <div className="space-y-6">
                <header>
                  <h2 className="text-2xl font-bold text-white">Resumen General</h2>
                  <p className="text-sm text-slate-300 mt-1">
                    Vista rápida del estado de la plataforma, postulaciones y suscripciones activas.
                  </p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-5">
                    <p className="text-xs font-medium text-slate-400">Pagos por revisar</p>
                    <p className="text-3xl font-bold text-[#e5b32a] mt-2">{ordenesPorRevisar}</p>
                    <p className="text-xs text-slate-400 mt-1">Órdenes de sindicatos</p>
                  </div>
                  <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-5">
                    <p className="text-xs font-medium text-slate-400">Postulaciones pendientes</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-2">{postPendientes.length}</p>
                    <p className="text-xs text-slate-400 mt-1">Socios esperando código</p>
                  </div>
                  <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-5">
                    <p className="text-xs font-medium text-slate-400">Sindicatos activados</p>
                    <p className="text-3xl font-bold text-sky-300 mt-2">{ordenesActivadas}</p>
                    <p className="text-xs text-slate-400 mt-1">Operando con admin único</p>
                  </div>
                  <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-5">
                    <p className="text-xs font-medium text-slate-400">Ingresos validados</p>
                    <p className="text-3xl font-bold text-white mt-2">
                      ${ingresosValidados.toLocaleString('es-CL')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Total acumulado CLP</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-6 space-y-5">
                    <div>
                      <h3 className="text-base font-semibold text-white">Socios por Sindicato</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Cantidad de personas registradas dentro de cada organización.
                      </p>
                    </div>
                    <div className="space-y-4">
                      {sindicatos.map((s) => {
                        const cant = usuarios.filter((u) => Number(u.sindicato_id) === Number(s.id)).length;
                        const pct = Math.round((cant / maxSocios) * 100);
                        return (
                          <div key={s.id} className="space-y-1.5">
                            <div className="flex justify-between gap-3 text-sm">
                              <span className="text-slate-100 font-medium truncate">
                                #{s.id} {s.nombre}
                              </span>
                              <span className="text-slate-300 font-mono shrink-0">{cant} personas</span>
                            </div>
                            <div className="w-full h-2.5 bg-[#1e2536] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#e5b32a] rounded-full"
                                style={{ width: `${Math.max(pct, cant > 0 ? 6 : 0)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-6 space-y-5">
                    <div>
                      <h3 className="text-base font-semibold text-white">Avance de Órdenes</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Cuántas órdenes hay en cada paso del proceso de compra.
                      </p>
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: 'Por revisar pago', val: ordenesPorRevisar, color: 'bg-[#e5b32a]' },
                        { label: 'Correo enviado (falta activar)', val: ordenesPorActivar, color: 'bg-sky-400' },
                        { label: 'Sindicato activado', val: ordenesActivadas, color: 'bg-emerald-400' },
                        {
                          label: 'Rechazadas o fallidas',
                          val: ordenes.filter(
                            (o) => o.estado === 'Rechazado' || o.estado === 'Pago Fallido'
                          ).length,
                          color: 'bg-rose-400',
                        },
                      ].map((item) => {
                        const total = ordenes.length || 1;
                        const pct = Math.round((item.val / total) * 100);
                        return (
                          <div key={item.label} className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-100">{item.label}</span>
                              <span className="text-slate-300 font-mono">
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
                </div>
              </div>
            )}

            {/* ==============================================================
                SECCIÓN 4: SINDICATOS
               ============================================================== */}
            {tab === 'sindicatos' && (
              <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Sindicatos ({sindicatos.length})</h2>
                    <p className="text-sm text-slate-300 mt-1">
                      Administra todas las organizaciones, su plan contratado y si tienen acceso habilitado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditSindicatoId(null);
                      setFormSindicato({ nombre: '', rut_sindicato: '', logo_url: '', estado: 'activo' });
                      setModalSindicato(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-[#0b0e14] text-sm font-semibold cursor-pointer shrink-0"
                  >
                    + Crear Sindicato
                  </button>
                </header>

                <div className="space-y-3">
                  {sindicatos.map((s) => {
                    const activo = (s.estado || 'activo') === 'activo';
                    return (
                      <div
                        key={s.id}
                        className="bg-[#121722] border border-[#252e42] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#1c2334] text-[#e5b32a]">
                              ID #{s.id}
                            </span>
                            <h3 className="text-base font-bold text-white">{s.nombre}</h3>
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                                activo
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                                  : s.estado === 'pendiente_validacion'
                                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/35'
                                  : 'bg-rose-500/15 text-rose-300 border-rose-500/35'
                              }`}
                            >
                              {activo
                                ? 'Activo'
                                : s.estado === 'pendiente_validacion'
                                ? 'Pendiente de activación'
                                : 'Suspendido'}
                            </span>
                            {s.plan_activo && (
                              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#1c2334] text-slate-200">
                                Plan {s.plan_activo}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 font-mono">
                            RUT {s.rut_sindicato} • {s.validado ? 'Validado por Administrador Único' : 'Aún sin validar por su admin'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              localStorage.setItem('sindicato_activo', String(s.id));
                              router.push('/dashboard/admin');
                            }}
                            className="px-3.5 py-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-200 text-xs font-semibold cursor-pointer"
                          >
                            Entrar como Admin
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditSindicatoId(s.id);
                              setFormSindicato({
                                nombre: s.nombre,
                                rut_sindicato: s.rut_sindicato,
                                logo_url: s.logo_url || '',
                                estado: s.estado || 'activo',
                              });
                              setModalSindicato(true);
                            }}
                            className="px-3.5 py-2 rounded-lg bg-[#1c2334] hover:bg-[#263047] text-slate-200 text-xs font-medium cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleEstadoSindicato(s)}
                            className="px-3.5 py-2 rounded-lg bg-[#1c2334] hover:bg-[#263047] text-slate-200 text-xs font-medium cursor-pointer"
                          >
                            {activo ? 'Suspender acceso' : 'Activar acceso'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==============================================================
                SECCIÓN 5: USUARIOS
               ============================================================== */}
            {tab === 'usuarios' && (
              <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Usuarios ({usuariosFiltrados.length})</h2>
                    <p className="text-sm text-slate-300 mt-1">
                      Busca a cualquier socio o presidente para revisar su rol o cambiar su sindicato.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={busquedaUsuario}
                    onChange={(e) => setBusquedaUsuario(e.target.value)}
                    placeholder="Buscar por nombre, correo o RUT..."
                    className="w-full sm:w-80 bg-[#121722] border border-[#2c354b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#e5b32a]"
                  />
                </header>

                <div className="space-y-2.5">
                  {usuariosFiltrados.map((u) => {
                    const sind = sindicatos.find((s) => Number(s.id) === Number(u.sindicato_id));
                    const estLower = String(u.estado || 'activo').toLowerCase();
                    const faltaCorreo = estLower === 'pendiente_correo' || u.email_verificado === false;
                    return (
                      <div
                        key={u.id}
                        className="bg-[#121722] border border-[#252e42] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                              {u.full_name || 'Sin nombre registrado'}
                            </span>
                            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#1c2334] text-[#e5b32a]">
                              {u.role || 'socio'}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                estLower === 'suspendido'
                                  ? 'bg-rose-500/15 text-rose-300'
                                  : faltaCorreo
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : 'bg-emerald-500/15 text-emerald-300'
                              }`}
                            >
                              {estLower === 'suspendido'
                                ? 'Suspendido'
                                : faltaCorreo
                                ? 'Falta validar correo'
                                : u.estado || 'activo'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 font-mono break-all">
                            {u.email} • RUT {formatRutLegible(u.rut)} • {sind ? `#${sind.id} ${sind.nombre}` : 'Sin sindicato'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setUsuarioEdit(u);
                            setFormUsuario({
                              role: u.role || 'socio',
                              sindicato_id: u.sindicato_id ? String(u.sindicato_id) : '',
                              estado: u.estado || 'activo',
                            });
                          }}
                          className="px-4 py-2 rounded-lg bg-[#1c2334] hover:bg-[#263047] text-white text-xs font-semibold cursor-pointer self-start sm:self-center shrink-0"
                        >
                          Cambiar permisos
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==============================================================
                SECCIÓN 6: ACTIVACIONES Y REGISTRO DE EVENTOS
               ============================================================== */}
            {tab === 'activaciones' && (
              <div className="space-y-6">
                <header>
                  <h2 className="text-2xl font-bold text-white">Activaciones Recibidas y Registro</h2>
                  <p className="text-sm text-slate-300 mt-1">
                    Cada vez que un presidente activa su sindicato desde el enlace de Gmail, aquí queda su ficha completa.
                  </p>
                </header>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#e5b32a]">
                    Sindicatos activados recientemente ({sindicatosValidadosRecientes.length})
                  </h3>

                  {sindicatosValidadosRecientes.length === 0 ? (
                    <div className="bg-[#121722] border border-[#252e42] rounded-2xl p-6 text-sm text-slate-400">
                      Todavía ningún presidente ha completado la activación por enlace. Apenas uno lo haga, aparecerá aquí al instante.
                    </div>
                  ) : (
                    sindicatosValidadosRecientes.map((s) => {
                      const rep = s.config_ui.reporte_activacion;
                      return (
                        <div
                          key={s.id}
                          className="bg-[#121722] border border-emerald-500/35 rounded-2xl p-5 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-base font-bold text-white">
                              ✓ #{rep.sindicato_id} {rep.sindicato_nombre} ({rep.sindicato_rut})
                            </span>
                            <span className="text-xs font-mono text-emerald-300">
                              {rep.activado_en ? new Date(rep.activado_en).toLocaleString('es-CL') : ''}
                            </span>
                          </div>
                          <p className="text-sm text-slate-200">
                            Administrador Único: <strong>{rep.admin_nombre}</strong> · {rep.admin_email} · RUT {rep.admin_rut}
                          </p>
                          <p className="text-xs text-slate-400 font-mono">
                            Orden: {rep.orden_numero} · Plan: {rep.plan_activo} · Pago: ${Number(rep.monto_pagado || 0).toLocaleString('es-CL')} ({rep.tarjeta})
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">Últimos movimientos del sistema</h3>
                  <div className="bg-[#121722] border border-[#252e42] rounded-2xl divide-y divide-[#1f2637]">
                    {[
                      ...notificacionesSA.map((n) => ({
                        id: `n-${n.id}`,
                        tipo: n.tipo || 'Aviso',
                        titulo: n.titulo,
                        detalle: n.mensaje,
                        fecha: n.created_at,
                      })),
                      ...asistencias.map((a) => ({
                        id: `a-${a.id}`,
                        tipo: 'Asistencia QR',
                        titulo: `${a.usuario_nombre || 'Socio'} (${a.usuario_rut})`,
                        detalle: `Asamblea: ${a.asamblea_titulo}`,
                        fecha: a.hora_entrada || a.created_at,
                      })),
                    ]
                      .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())
                      .slice(0, 20)
                      .map((ev) => (
                        <div
                          key={ev.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <span className="text-xs font-semibold text-sky-300">{ev.tipo}</span>
                            <p className="text-sm font-semibold text-white mt-0.5">{ev.titulo}</p>
                            <p className="text-xs text-slate-300 mt-0.5">{ev.detalle}</p>
                          </div>
                          <span className="text-xs font-mono text-slate-400 shrink-0">
                            {ev.fecha ? new Date(ev.fecha).toLocaleString('es-CL') : ''}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ====================================================================
          MODAL A: ORDEN DE INCORPORACIÓN DE SOCIO EMITIDA (CÓDIGO 6 DÍGITOS)
         ==================================================================== */}
      {credSocioEmitidas && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setCredSocioEmitidas(null)}
        >
          <div
            className="bg-[#121722] border border-emerald-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  {credSocioEmitidas.correoEnviado
                    ? `✓ Orden ${credSocioEmitidas.ordenSocio} enviada al correo`
                    : `✓ Socio creado · Orden ${credSocioEmitidas.ordenSocio}`}
                </p>
                <h3 className="text-lg font-bold text-white mt-1">
                  {credSocioEmitidas.fullName}
                </h3>
                <p className="text-xs text-slate-400">
                  #{credSocioEmitidas.sindicatoId} {credSocioEmitidas.sindicatoNombre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCredSocioEmitidas(null)}
                className="text-slate-400 hover:text-white text-base font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0e14] border border-[#e5b32a]/40 space-y-1.5 text-sm font-mono">
              <p className="text-xs font-sans font-bold uppercase tracking-wider text-[#e5b32a]">
                1. Código de validación (6 dígitos · Bcrypt)
              </p>
              <p className="text-slate-300">
                Código:{' '}
                <strong className="text-[#e5b32a] text-lg tracking-[0.25em]">
                  {credSocioEmitidas.codigoCorreo}
                </strong>
              </p>
              <p className="text-xs text-sky-300 break-all pt-1">
                {credSocioEmitidas.linkValidacion}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0e14] border border-emerald-500/35 space-y-1.5 text-sm font-mono">
              <p className="text-xs font-sans font-bold uppercase tracking-wider text-emerald-400">
                2. Credenciales de acceso al sindicato
              </p>
              <p className="text-slate-300">
                RUT: <strong className="text-white">{formatRutLegible(credSocioEmitidas.rut)}</strong>
              </p>
              <p className="text-slate-300 break-all">
                Correo: <strong className="text-white">{credSocioEmitidas.email}</strong>
              </p>
              <p className="text-slate-300">
                Clave temporal:{' '}
                <strong className="text-emerald-300">{credSocioEmitidas.password}</strong>
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  const texto =
                    `¡Hola ${credSocioEmitidas.fullName}! Tu ingreso a ${credSocioEmitidas.sindicatoNombre} fue aprobado (Orden ${credSocioEmitidas.ordenSocio}).\n\n` +
                    `1. Valida tu correo aquí: ${credSocioEmitidas.linkValidacion}\n` +
                    `Código de verificación (6 dígitos): ${credSocioEmitidas.codigoCorreo}\n\n` +
                    `2. Luego ingresa con:\n` +
                    `RUT: ${formatRutLegible(credSocioEmitidas.rut)}\n` +
                    `Clave temporal: ${credSocioEmitidas.password}`;
                  const ok = await copiarTextoSeguro(texto);
                  notificar(
                    ok ? 'Mensaje completo copiado para WhatsApp.' : 'No se pudo copiar.',
                    ok ? 'ok' : 'err'
                  );
                }}
                className="px-4 py-2.5 rounded-xl bg-[#1c2334] hover:bg-[#263047] text-white text-sm font-medium cursor-pointer"
              >
                Copiar para WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setCredSocioEmitidas(null)}
                className="px-5 py-2.5 rounded-xl bg-[#e5b32a] hover:bg-[#f0c038] text-[#0b0e14] text-sm font-bold cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL B: AGREGAR POSTULANTE MANUALMENTE (CUALQUIER SINDICATO)
         ==================================================================== */}
      {modalNuevoPostulante && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setModalNuevoPostulante(false)}
        >
          <div
            className="bg-[#121722] border border-[#2f3952] rounded-2xl w-full max-w-md p-6 space-y-4 my-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Agregar Postulante</h3>
            <form onSubmit={handleRegistrarPostulante} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Sindicato destino</label>
                <select
                  required
                  value={formNuevoPost.sindicato_id}
                  onChange={(e) => setFormNuevoPost({ ...formNuevoPost, sindicato_id: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                >
                  <option value="" disabled>
                    Selecciona un sindicato...
                  </option>
                  {sindicatos.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      #{s.id} — {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
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
                      setFormNuevoPost({
                        ...formNuevoPost,
                        rut: formatRutInputSinPuntos(e.target.value),
                      })
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
                  onChange={(e) =>
                    setFormNuevoPost({ ...formNuevoPost, rol_solicitado: e.target.value })
                  }
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

      {/* ====================================================================
          MODAL C: CONFIRMAR RECHAZO DE POSTULACIÓN
         ==================================================================== */}
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
                disabled={procesandoPostId === postARechazar.id}
                onClick={confirmarRechazarPostulacion}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
              >
                Sí, rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 1: RESUMEN DE LAS 2 CREDENCIALES EMITIDAS (SINDICATOS)
         ==================================================================== */}
      {credencialesEmitidas && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setCredencialesEmitidas(null)}
        >
          <div
            className="bg-[#121722] border border-[#2f3952] rounded-2xl w-full max-w-lg p-6 space-y-5 my-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  {credencialesEmitidas.correoOk
                    ? '✓ Correo enviado al Gmail del administrador'
                    : 'Credenciales generadas (respaldo local)'}
                </p>
                <h3 className="text-lg font-bold text-white mt-1">
                  Orden {credencialesEmitidas.ordenNumero}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCredencialesEmitidas(null)}
                className="text-slate-400 hover:text-white text-base font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0e14] border border-[#e5b32a]/40 space-y-1.5 text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#e5b32a]">
                1. Credenciales del Sindicato (para validar el enlace)
              </p>
              <p className="text-slate-200">
                Organización: <strong className="text-white">{credencialesEmitidas.sindicatoNombre}</strong>
              </p>
              <p className="text-slate-200 font-mono">
                ID Oficial: <strong className="text-white">#{credencialesEmitidas.sindicatoId}</strong>
              </p>
              <p className="text-slate-200 font-mono">
                Código: <strong className="text-[#e5b32a]">{credencialesEmitidas.codigoValidacion}</strong>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0e14] border border-sky-500/40 space-y-1.5 text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-300">
                2. Credenciales del Administrador (para usar el panel)
              </p>
              <p className="text-slate-200 font-mono">
                RUT: <strong className="text-white">{credencialesEmitidas.adminRut}</strong>
              </p>
              <p className="text-slate-200 font-mono break-all">
                Correo: <strong className="text-white">{credencialesEmitidas.adminEmail}</strong>
              </p>
              <p className="text-slate-200 font-mono">
                Contraseña: <strong className="text-emerald-300">{credencialesEmitidas.adminPassword}</strong>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0b0e14] border border-[#252e42]">
              <p className="text-xs text-slate-400 mb-1">Enlace de activación enviado:</p>
              <p className="text-xs font-mono text-sky-300 break-all">{credencialesEmitidas.link}</p>
            </div>

            <div className="flex flex-wrap justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={async () => {
                  const ok = await copiarTextoSeguro(credencialesEmitidas.link);
                  notificar(ok ? 'Enlace copiado al portapapeles.' : 'No se pudo copiar automáticamente.', ok ? 'ok' : 'err');
                }}
                className="px-4 py-2.5 rounded-xl bg-[#1c2334] hover:bg-[#263047] text-white text-sm font-medium cursor-pointer"
              >
                Copiar enlace
              </button>
              <button
                type="button"
                onClick={() => setCredencialesEmitidas(null)}
                className="px-5 py-2.5 rounded-xl bg-[#e5b32a] hover:bg-[#f0c038] text-[#0b0e14] text-sm font-bold cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: RECHAZAR PAGO DE SINDICATO
         ==================================================================== */}
      {ordenARechazar && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOrdenARechazar(null)}
        >
          <div
            className="bg-[#121722] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Rechazar Pago</h3>
            <p className="text-sm text-slate-300">
              Se enviará un correo automático a <strong className="text-white">{ordenARechazar.usuario_email}</strong> avisando que la orden de <strong>{ordenARechazar.nombre_sindicato}</strong> fue rechazada.
            </p>
            <form onSubmit={confirmarRechazoPago} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Motivo del rechazo (lo verá el usuario en su correo)
                </label>
                <textarea
                  required
                  rows={3}
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
                />
              </div>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setOrdenARechazar(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#1c2334] text-slate-200 text-sm font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoId === ordenARechazar.id}
                  className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
                >
                  {procesandoId === ordenARechazar.id ? 'Enviando aviso...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: ELIMINAR ORDEN
         ==================================================================== */}
      {ordenAEliminar && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOrdenAEliminar(null)}
        >
          <div
            className="bg-[#121722] border border-[#2f3952] rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">¿Eliminar esta orden?</h3>
            <p className="text-sm text-slate-300">
              Se borrará permanentemente el registro de <strong>{ordenAEliminar.nombre_sindicato}</strong> ({ordenAEliminar.orden_numero || `ORD-${ordenAEliminar.id}`}).
            </p>
            <div className="flex justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setOrdenAEliminar(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1c2334] text-slate-200 text-sm font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoId === ordenAEliminar.id}
                onClick={confirmarEliminarOrden}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 4: CREAR / EDITAR ORDEN
         ==================================================================== */}
      {modalOrden && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setModalOrden(false)}
        >
          <div
            className="bg-[#121722] border border-[#2f3952] rounded-2xl w-full max-w-md p-6 space-y-4 my-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">
              {editOrdenId ? 'Editar Orden' : 'Registrar Nueva Orden'}
            </h3>
            <form onSubmit={handleGuardarOrden} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Nombre del Administrador</label>
                <input
                  required
                  value={formOrden.usuario_nombre}
                  onChange={(e) => setFormOrden({ ...formOrden, usuario_nombre: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#e5b32a]"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Correo Gmail del Administrador</label>
                <input
                  required
                  type="email"
                  value={formOrden.usuario_email}
                  onChange={(e) => setFormOrden({ ...formOrden, usuario_email: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#e5b32a]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">RUT del Administrador</label>
                  <input
                    required
                    value={formOrden.usuario_rut}
                    onChange={(e) => setFormOrden({ ...formOrden, usuario_rut: e.target.value })}
                    className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#e5b32a]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">RUT del Sindicato</label>
                  <input
                    required
                    value={formOrden.rut_sindicato}
                    onChange={(e) => setFormOrden({ ...formOrden, rut_sindicato: e.target.value })}
                    className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#e5b32a]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Nombre del Sindicato</label>
                <input
                  required
                  value={formOrden.nombre_sindicato}
                  onChange={(e) => setFormOrden({ ...formOrden, nombre_sindicato: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#e5b32a]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Plan</label>
                  <select
                    value={formOrden.plan_id}
                    onChange={(e) => {
                      const pid = e.target.value as PlanId;
                      setFormOrden({
                        ...formOrden,
                        plan_id: pid,
                        monto_pagado: PLANES_SAAS[pid].precioMensual,
                      });
                    }}
                    className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                  >
                    <option value="trial">Trial 30 Días ($0)</option>
                    <option value="basico">Básico ($4.990)</option>
                    <option value="estandar">Estándar ($9.990)</option>
                    <option value="premium">Premium ($14.990)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Estado</label>
                  <select
                    value={formOrden.estado}
                    onChange={(e) => setFormOrden({ ...formOrden, estado: e.target.value as EstadoOrden })}
                    className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                  >
                    <option value="Pendiente">Pendiente (Por revisar)</option>
                    <option value="Pago Aprobado">Pago Aprobado</option>
                    <option value="Activado">Activado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOrden(false)}
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

      {/* ====================================================================
          MODAL 5: CREAR / EDITAR SINDICATO
         ==================================================================== */}
      {modalSindicato && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setModalSindicato(false)}
        >
          <div
            className="bg-[#121722] border border-[#2f3952] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">
              {editSindicatoId ? 'Editar Sindicato' : 'Crear Nuevo Sindicato'}
            </h3>
            <form onSubmit={handleGuardarSindicato} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Nombre Oficial</label>
                <input
                  required
                  value={formSindicato.nombre}
                  onChange={(e) => setFormSindicato({ ...formSindicato, nombre: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">RUT Tributario</label>
                <input
                  required
                  value={formSindicato.rut_sindicato}
                  onChange={(e) => setFormSindicato({ ...formSindicato, rut_sindicato: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">URL del Logo (Opcional)</label>
                <input
                  type="url"
                  value={formSindicato.logo_url}
                  onChange={(e) => setFormSindicato({ ...formSindicato, logo_url: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalSindicato(false)}
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

      {/* ====================================================================
          MODAL 6: CAMBIAR PERMISOS DE USUARIO
         ==================================================================== */}
      {usuarioEdit && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setUsuarioEdit(null)}
        >
          <div
            className="bg-[#121722] border border-[#2f3952] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">
              Permisos de {usuarioEdit.full_name || usuarioEdit.email}
            </h3>
            <form onSubmit={handleGuardarUsuario} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Rol en la plataforma</label>
                <select
                  value={formUsuario.role}
                  onChange={(e) => setFormUsuario({ ...formUsuario, role: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                >
                  <option value="socio">Socio</option>
                  <option value="admin">Administrador (Presidente)</option>
                  <option value="superadmin">SuperAdmin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Sindicato asignado</label>
                <select
                  value={formUsuario.sindicato_id}
                  onChange={(e) => setFormUsuario({ ...formUsuario, sindicato_id: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                >
                  <option value="">-- Sin Sindicato --</option>
                  {sindicatos.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Estado de la cuenta</label>
                <select
                  value={formUsuario.estado}
                  onChange={(e) => setFormUsuario({ ...formUsuario, estado: e.target.value })}
                  className="w-full bg-[#0b0e14] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white"
                >
                  <option value="activo">Activo</option>
                  <option value="pendiente_correo">Falta validar correo (6 dígitos)</option>
                  <option value="pendiente_validacion">Pendiente de activación (sindicato)</option>
                  <option value="suspendido">Suspendido (Bloqueado)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setUsuarioEdit(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#1c2334] text-slate-200 text-sm font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#e5b32a] hover:bg-[#f0c038] text-[#0b0e14] text-sm font-bold cursor-pointer"
                >
                  Aplicar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}