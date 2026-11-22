'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import './landing.css';

// ─── FORMATEADOR Y VALIDADOR ESTRICTO DE RUT CHILENO (PUNTOS + GUIÓN + MÓDULO 11) ─
function formatRutWithDotsAndDash(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
  if (clean.length <= 1) return clean;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const dottedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${dottedBody}-${dv}`;
}

function isValidRut(rut: string): boolean {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 8 || clean.length > 9) return false;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const mod = 11 - (sum % 11);
  const expectedDv = mod === 11 ? '0' : mod === 10 ? 'K' : String(mod);

  return dv === expectedDv;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── CANVAS: fondo urbano generativo con pulso suave de luces ─────────────────
function useCityCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    interface WindowLight {
      x: number;
      y: number;
      warm: boolean;
      baseAlpha: number;
      phase: number;
      speed: number;
    }

    interface Building {
      x: number;
      w: number;
      h: number;
      layer: number;
      windows: WindowLight[];
    }

    let W = 0;
    let H = 0;
    let groundY = 0;
    let buildings: Building[] = [];

    const rng = (min: number, max: number) => min + Math.random() * (max - min);

    const buildScene = () => {
      W = canvas.width = canvas.offsetWidth || window.innerWidth;
      H = canvas.height = canvas.offsetHeight || 680;
      groundY = H * 0.78;
      buildings = [];

      let x = 0;
      while (x < W) {
        const w = rng(28, 60);
        const h = rng(H * 0.12, H * 0.3);
        buildings.push({ x, w, h, layer: 0, windows: [] });
        x += w + rng(0, 4);
      }

      x = -20;
      while (x < W + 20) {
        const w = rng(22, 52);
        const h = rng(H * 0.22, H * 0.52);
        buildings.push({ x, w, h, layer: 1, windows: [] });
        x += w + rng(2, 8);
      }

      buildings.forEach((b) => {
        const top = groundY - b.h;
        const cols = Math.floor(b.w / 9);
        const rows = Math.floor(b.h / 11);
        for (let col = 0; col < cols; col++) {
          for (let row = 0; row < rows; row++) {
            if (Math.random() > 0.52) continue;
            b.windows.push({
              x: b.x + 3 + col * 9,
              y: top + 4 + row * 11,
              warm: Math.random() > 0.28,
              baseAlpha: rng(0.22, 0.55),
              phase: rng(0, Math.PI * 2),
              speed: rng(0.0004, 0.0014),
            });
          }
        }
      });
    };

    const draw = (time: number) => {
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.82);
      sky.addColorStop(0, '#0b0d12');
      sky.addColorStop(0.45, '#12151c');
      sky.addColorStop(0.75, '#1a160c');
      sky.addColorStop(1, '#241b0d');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      const pulse = 0.16 + Math.sin(time * 0.0008) * 0.03;
      const glow = ctx.createRadialGradient(W * 0.72, H * 0.58, 0, W * 0.72, H * 0.58, W * 0.36);
      glow.addColorStop(0, `rgba(201,148,10,${pulse})`);
      glow.addColorStop(0.45, 'rgba(201,148,10,0.06)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      [0, 1].forEach((layer) => {
        buildings
          .filter((b) => b.layer === layer)
          .forEach((b) => {
            const top = groundY - b.h;
            ctx.fillStyle = layer === 0 ? '#17191f' : '#111318';
            ctx.fillRect(b.x, top, b.w, b.h);

            b.windows.forEach((win) => {
              const alpha = Math.max(
                0.08,
                win.baseAlpha + Math.sin(time * win.speed + win.phase) * 0.14
              );
              ctx.fillStyle = win.warm
                ? `rgba(255,210,90,${alpha.toFixed(2)})`
                : `rgba(140,190,255,${(alpha * 0.75).toFixed(2)})`;
              ctx.fillRect(win.x, win.y, 5, 6);
            });
          });
      });

      const ground = ctx.createLinearGradient(0, groundY, 0, H);
      ground.addColorStop(0, '#161207');
      ground.addColorStop(1, '#0b0d12');
      ctx.fillStyle = ground;
      ctx.fillRect(0, groundY, W, H - groundY);

      const ref_ = ctx.createLinearGradient(W * 0.3, groundY, W * 0.9, groundY);
      ref_.addColorStop(0, 'transparent');
      ref_.addColorStop(0.4, 'rgba(201,148,10,0.18)');
      ref_.addColorStop(1, 'transparent');
      ctx.fillStyle = ref_;
      ctx.fillRect(0, groundY, W, 2);

      animId = window.requestAnimationFrame(draw);
    };

    buildScene();
    animId = window.requestAnimationFrame(draw);

    const onResize = () => buildScene();
    window.addEventListener('resize', onResize);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [canvasRef]);
}

// ─── DATOS INTERACTIVOS DE PILARES, TRIAL Y PLANES ───────────────────────────
const PILARES_DATA = [
  {
    id: 'representacion',
    icon: '✊',
    titulo: 'Representación colectiva',
    desc: 'Negociamos en conjunto para obtener mejores condiciones laborales y salariales.',
    modulo: 'Módulo de Negociación & Hitos',
    detalle:
      'Seguimiento transparente de petitorios, mesas de trabajo y avances de negociación colectiva visibles en tiempo real para todos los socios.',
    bullets: ['Línea de tiempo de hitos en vivo', 'Comunicados oficiales de directiva', 'Respaldo documental centralizado'],
  },
  {
    id: 'beneficios',
    icon: '🎁',
    titulo: 'Beneficios exclusivos',
    desc: 'Convenios en salud, educación y recreación para ti y tu grupo familiar.',
    modulo: 'Catálogo de Convenios + Comprobantes Gmail',
    detalle:
      'Cada socio solicita sus descuentos con un clic y recibe un comprobante digital oficial directo en su correo electrónico.',
    bullets: ['Canje en 1 clic por categoría', 'Comprobante automático vía EmailJS', 'Historial de uso por socio'],
  },
  {
    id: 'legal',
    icon: '⚖️',
    titulo: 'Asesoría legal y actas',
    desc: 'Acceso a respaldo jurídico, actas y asambleas de manera abierta y segura.',
    modulo: 'Libro de Actas + Asistente Legal IA',
    detalle:
      'Consulta de normativa laboral chilena 24/7, biblioteca de documentos oficiales y archivo histórico de asambleas.',
    bullets: ['Orientación laboral inmediata', 'Documentos oficiales descargables', 'Trazabilidad total por sindicato'],
  },
  {
    id: 'democracia',
    icon: '🗳️',
    titulo: 'Democracia interna',
    desc: 'Votaciones digitales, encuestas y control de asistencia QR en asambleas.',
    modulo: 'Asambleas QR + Votación Digital',
    detalle:
      'Escáner rápido de credencial para registrar asistencia al instante y votaciones verificadas con un voto por RUT.',
    bullets: ['Credencial digital QR por socio', 'Control de quórum en tiempo real', 'Encuestas de clima laboral'],
  },
];

const PASOS_TRIAL = [
  {
    num: '01',
    titulo: 'Solicitas tu Trial ($0 hoy)',
    desc: 'Ingresas los datos del dirigente titular, tu sindicato y validas tu tarjeta sin cobro durante 30 días.',
  },
  {
    num: '02',
    titulo: 'Recibes 2 credenciales por Gmail',
    desc: 'El SuperAdmin aprueba tu orden y te envía las credenciales del sindicato, tu clave de admin y el link único.',
  },
  {
    num: '03',
    titulo: 'Activas tu organización al instante',
    desc: 'Validas el enlace una sola vez y quedas habilitado como Administrador Único con tus módulos listos.',
  },
];

const PLANES_PREVIEW = [
  {
    id: 'basico',
    nombre: 'Básico',
    desc: 'Para sindicatos pequeños que dan sus primeros pasos digitales.',
    mensual: 4990,
    anual: 49900,
    ahorro: 9980,
    socios: 'Hasta 25 socios',
    destacado: false,
    items: ['1 Administrador único', 'Login de socios por RUT', 'Beneficios y Credencial QR', 'Mesa de soporte'],
  },
  {
    id: 'estandar',
    nombre: 'Estándar',
    desc: 'Todo lo necesario para gestionar un sindicato activo.',
    mensual: 9990,
    anual: 99900,
    ahorro: 19980,
    socios: 'Hasta 50 socios',
    destacado: true,
    items: ['Todo lo de Básico', 'Actas y Asistencia QR', 'Votaciones y Encuestas', 'Fondo Solidario'],
  },
  {
    id: 'premium',
    nombre: 'Premium',
    desc: 'Máximo control, IA legal y personalización total.',
    mensual: 14990,
    anual: 149900,
    ahorro: 29980,
    socios: 'Socios ilimitados',
    destacado: false,
    items: ['Todos los módulos (10/10)', 'Asistente Legal IA 24/7', 'Finanzas y Negociación', 'Estudio UI personalizado'],
  },
];

// ─── ESCALA TIPOGRÁFICA COMPACTA Y ESTILOS UI MINIMALISTAS ──────────────────
const UI_FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif";

const styles = {
  page: {
    background: '#0b0d12',
    color: '#f4f5f7',
    fontFamily: UI_FONT,
    minHeight: '100vh',
    WebkitFontSmoothing: 'antialiased' as const,
    MozOsxFontSmoothing: 'grayscale' as const,
  },
  navLink: {
    fontSize: '0.8125rem',
    fontWeight: 450 as const,
    letterSpacing: '-0.005em',
  },
  navCta: {
    fontSize: '0.78125rem',
    fontWeight: 550 as const,
    letterSpacing: '-0.005em',
    padding: '7px 14px',
    borderRadius: '8px',
  },
  heroTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.6875rem',
    fontWeight: 550 as const,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    padding: '5px 12px',
    borderRadius: '999px',
    background: 'rgba(201, 148, 10, 0.10)',
    border: '1px solid rgba(201, 148, 10, 0.24)',
    color: '#e5b32a',
  },
  heroTitle: {
    fontSize: 'clamp(1.9rem, 3.4vw, 2.7rem)',
    fontWeight: 600 as const,
    lineHeight: 1.12,
    letterSpacing: '-0.03em',
    marginTop: '14px',
  },
  heroSub: {
    fontSize: '0.875rem',
    fontWeight: 400 as const,
    lineHeight: 1.6,
    letterSpacing: '-0.008em',
    color: 'rgba(244, 245, 247, 0.68)',
    maxWidth: '470px',
    marginTop: '12px',
  },
  btnPrimary: {
    fontSize: '0.8125rem',
    fontWeight: 600 as const,
    letterSpacing: '-0.01em',
    padding: '10px 17px',
    borderRadius: '8px',
  },
  btnGhost: {
    fontSize: '0.8125rem',
    fontWeight: 500 as const,
    letterSpacing: '-0.008em',
    padding: '10px 16px',
    borderRadius: '8px',
  },
  statNum: {
    fontSize: '1.25rem',
    fontWeight: 600 as const,
    letterSpacing: '-0.025em',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  statLabel: {
    fontSize: '0.71875rem',
    fontWeight: 400 as const,
    color: 'rgba(244, 245, 247, 0.56)',
    marginTop: '2px',
  },
  sectionTag: {
    fontSize: '0.6875rem',
    fontWeight: 600 as const,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#d49d12',
  },
  sectionTitle: {
    fontSize: 'clamp(1.35rem, 2.2vw, 1.8rem)',
    fontWeight: 600 as const,
    lineHeight: 1.2,
    letterSpacing: '-0.025em',
    marginTop: '6px',
  },
  bodyText: {
    fontSize: '0.84375rem',
    fontWeight: 400 as const,
    lineHeight: 1.6,
    letterSpacing: '-0.006em',
    color: 'rgba(244, 245, 247, 0.7)',
  },
  pillarTitle: {
    fontSize: '0.875rem',
    fontWeight: 600 as const,
    letterSpacing: '-0.012em',
    marginTop: '8px',
    marginBottom: '4px',
  },
  pillarDesc: {
    fontSize: '0.78125rem',
    fontWeight: 400 as const,
    lineHeight: 1.5,
    color: 'rgba(244, 245, 247, 0.62)',
  },
  drawer: {
    fontFamily: UI_FONT,
    background: '#11141a',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '-24px 0 60px rgba(0, 0, 0, 0.55)',
  },
  drawerEyebrow: {
    fontSize: '0.65625rem',
    fontWeight: 600 as const,
    letterSpacing: '0.09em',
    textTransform: 'uppercase' as const,
    color: '#d49d12',
    marginBottom: '6px',
  },
  drawerTitle: {
    fontSize: '1.25rem',
    fontWeight: 600 as const,
    lineHeight: 1.25,
    letterSpacing: '-0.02em',
    color: '#f7f8fa',
    marginBottom: '4px',
  },
  drawerSubtitle: {
    fontSize: '0.78125rem',
    fontWeight: 400 as const,
    lineHeight: 1.45,
    color: 'rgba(244, 245, 247, 0.56)',
    marginBottom: '16px',
  },
  fieldLabel: {
    fontSize: '0.6875rem',
    fontWeight: 500 as const,
    letterSpacing: '0.04em',
    color: 'rgba(244, 245, 247, 0.68)',
    marginBottom: '6px',
  },
  input: {
    fontFamily: UI_FONT,
    fontSize: '0.84375rem',
    fontWeight: 400 as const,
    letterSpacing: '0.005em',
    fontVariantNumeric: 'tabular-nums' as const,
    padding: '10px 12px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#f4f5f7',
    outline: 'none',
    transition: 'border-color 0.18s ease, background-color 0.18s ease',
  },
  drawerBtn: {
    fontFamily: UI_FONT,
    fontSize: '0.8125rem',
    fontWeight: 600 as const,
    letterSpacing: '-0.008em',
    padding: '11px 14px',
    borderRadius: '8px',
    marginTop: '16px',
  },
  sep: {
    fontSize: '0.71875rem',
    fontWeight: 400 as const,
    color: 'rgba(244, 245, 247, 0.44)',
    marginTop: '18px',
    marginBottom: '12px',
  },
  secondaryBtn: {
    fontFamily: UI_FONT,
    fontSize: '0.78125rem',
    fontWeight: 500 as const,
    letterSpacing: '-0.008em',
    padding: '9px 14px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'rgba(244, 245, 247, 0.85)',
  },
};

type DrawerMode = 'login' | 'validar_socio';
type ValInputMode = 'rut' | 'email';

interface SocioValidadoInfo {
  fullName: string;
  rut: string;
  email: string;
  sindicatoId: number;
  sindicatoNombre: string;
  yaVerificado: boolean;
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
function LandingPage() {
  // Estados de Login
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sindicatoPendiente, setSindicatoPendiente] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Estados del Validador Integrado de Socios (RUT con puntos y guion por defecto)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('login');
  const [valInputMode, setValInputMode] = useState<ValInputMode>('rut');
  const [valRut, setValRut] = useState('');
  const [valEmail, setValEmail] = useState('');
  const [valCodigo, setValCodigo] = useState('');
  const [valLoading, setValLoading] = useState(false);
  const [valVieneDeLogin, setValVieneDeLogin] = useState(false);
  const [valNombreDetectado, setValNombreDetectado] = useState('');
  const [socioValidado, setSocioValidado] = useState<SocioValidadoInfo | null>(null);
  const [valPasswordPaso2, setValPasswordPaso2] = useState('');
  const [showValPassword, setShowValPassword] = useState(false);

  // Estados interactivos para la Landing
  const [pilarActivo, setPilarActivo] = useState(PILARES_DATA[0].id);
  const [pasoTrialActivo, setPasoTrialActivo] = useState(0);
  const [cicloPlanes, setCicloPlanes] = useState<'mensual' | 'anual'>('mensual');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useCityCanvas(canvasRef);

  const searchParams = useSearchParams();
  const redirectDestino = searchParams.get('redirect');

  // Auto-abrir el drawer en modo validador si llega con ?validar=socio
  useEffect(() => {
    const modoUrl = searchParams.get('validar');
    const emailUrl = searchParams.get('email');
    const rutUrl = searchParams.get('rut');
    if (modoUrl === 'socio') {
      setDrawerMode('validar_socio');
      if (rutUrl) {
        setValInputMode('rut');
        setValRut(formatRutWithDotsAndDash(rutUrl));
      } else if (emailUrl) {
        setValInputMode('email');
        setValEmail(emailUrl.trim().toLowerCase());
      }
      setDrawerOpen(true);
    }
  }, [searchParams]);

  // Auto-rotar suavemente el paso activo del Trial cada 4.5s
  useEffect(() => {
    const timer = setInterval(() => {
      setPasoTrialActivo((prev) => (prev + 1) % PASOS_TRIAL.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const abrirDrawer = (modo: DrawerMode = 'login') => {
    setErrorMsg('');
    setSindicatoPendiente(false);
    setDrawerMode(modo);
    if (modo === 'login') {
      setValVieneDeLogin(false);
      setSocioValidado(null);
    }
    setDrawerOpen(true);
  };

  const cambiarModoDrawer = (modo: DrawerMode) => {
    setErrorMsg('');
    setSindicatoPendiente(false);
    setDrawerMode(modo);
    if (modo === 'login') {
      setValVieneDeLogin(false);
      setSocioValidado(null);
    }
  };

  // Utilidad compartida para resolver RUT -> Correo en Supabase
  const resolverCorreoDesdeRut = async (rutFormateadoInput: string): Promise<string | null> => {
    const cleanRut = rutFormateadoInput.replace(/[^0-9kK]/g, '').toUpperCase();
    if (cleanRut.length < 8) return null;
    const rutConGuion = `${cleanRut.slice(0, -1)}-${cleanRut.slice(-1)}`;
    const rutFormateado = formatRutWithDotsAndDash(cleanRut);

    const supabase = createClient();

    const { data: rpcEmail } = await supabase.rpc('get_email_por_rut', {
      p_rut: cleanRut,
    });
    if (rpcEmail) return String(rpcEmail).toLowerCase();

    const { data: matchProfile } = await supabase
      .from('profiles')
      .select('email')
      .or(`rut.eq.${cleanRut},rut.eq.${rutConGuion},rut.eq.${rutFormateado}`)
      .limit(1)
      .maybeSingle();

    return matchProfile?.email ? String(matchProfile.email).toLowerCase() : null;
  };

  // Utilidad compartida para fijar sesión y redirigir según rol
  const finalizarSesionYRedirigir = async (
    emailAuth: string,
    claveAuth: string
  ): Promise<void> => {
    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailAuth,
      password: claveAuth,
    });

    if (authError || !authData.session) {
      throw new Error('RUT o contraseña incorrectos.');
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      await supabase.auth.signOut();
      throw new Error('Error al obtener los permisos del usuario.');
    }

    const rolUsuario = String(profileData.role || 'socio').trim().toLowerCase();
    const estadoUsuario = String(profileData.estado || profileData.status || 'activo')
      .trim()
      .toLowerCase();

    // 1. Si es admin de un sindicato que aún no ha validado el sindicato
    if (estadoUsuario === 'pendiente_validacion') {
      await supabase.auth.signOut();
      setSindicatoPendiente(true);
      throw new Error(
        'Tu organización aún está pendiente de activación. Valida tu sindicato con el código PYC enviado a tu correo.'
      );
    }

    // 2. Si es un socio recién aprobado al que le falta ingresar su código de 6 dígitos:
    //    Pasamos suavemente al validador integrado mostrando su RUT formateado
    if (estadoUsuario === 'pendiente_correo' || profileData.email_verificado === false) {
      await supabase.auth.signOut();
      setValInputMode('rut');
      setValRut(formatRutWithDotsAndDash(String(profileData.rut || rut)));
      setValEmail(String(profileData.email || emailAuth).toLowerCase());
      setValNombreDetectado(String(profileData.full_name || 'Socio'));
      setValVieneDeLogin(true);
      setValCodigo('');
      setSocioValidado(null);
      setErrorMsg('');
      setDrawerMode('validar_socio');
      setLoading(false);
      return;
    }

    if (
      profileData.is_banned === true ||
      estadoUsuario === 'banned' ||
      estadoUsuario === 'suspendido' ||
      rolUsuario === 'banned'
    ) {
      await supabase.auth.signOut();
      throw new Error('Tu cuenta ha sido suspendida por la administración. No tienes acceso al portal.');
    }

    // 3. Verificar que la organización esté validada, activa y con Trial vigente (excepto SuperAdmin)
    if (rolUsuario !== 'superadmin' && profileData.sindicato_id) {
      const { data: sindEstado } = await supabase
        .from('sindicatos')
        .select('estado, validado, es_trial, trial_fin')
        .eq('id', profileData.sindicato_id)
        .maybeSingle();

      if (sindEstado) {
        const estSind = String(sindEstado.estado || 'activo').trim().toLowerCase();

        if (estSind === 'pendiente_validacion' || sindEstado.validado === false) {
          await supabase.auth.signOut();
          setSindicatoPendiente(true);
          throw new Error(
            'Tu organización aún no ha sido validada. Actívala con el código enviado a tu correo.'
          );
        }

        if (estSind === 'suspendido') {
          await supabase.auth.signOut();
          throw new Error('Tu sindicato se encuentra suspendido temporalmente. Contacta a soporte.');
        }

        if (
          sindEstado.es_trial === true &&
          sindEstado.trial_fin &&
          new Date(sindEstado.trial_fin).getTime() < Date.now()
        ) {
          await supabase.auth.signOut();
          throw new Error(
            'El periodo Trial de 30 días de tu sindicato ha finalizado. Contrata un plan para reactivar el acceso.'
          );
        }
      }
    }

    document.cookie = `sb-sindicato-session=${authData.user.email}; path=/; max-age=86400`;
    document.cookie = `sb-sindicato-rol=${profileData.role || 'socio'}; path=/; max-age=86400`;

    if (profileData.sindicato_id) {
      localStorage.setItem('sindicato_activo', String(profileData.sindicato_id));
    }

    const urlParams = new URLSearchParams(window.location.search);
    const redirectDestinoReal = urlParams.get('redirect');

    if (redirectDestinoReal) {
      window.location.href = redirectDestinoReal;
    } else if (rolUsuario === 'superadmin') {
      window.location.href = '/superadmin';
    } else if (
      rolUsuario === 'admin' ||
      rolUsuario === 'administrador' ||
      rolUsuario === 'directiva' ||
      rolUsuario === 'presidente'
    ) {
      window.location.href = '/dashboard/admin';
    } else {
      window.location.href = '/dashboard';
    }
  };

  // Formateo en vivo del RUT en Login
  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRutWithDotsAndDash(e.target.value);
    setRut(formatted);
    if (errorMsg) setErrorMsg('');
    if (sindicatoPendiente) setSindicatoPendiente(false);
  };

  // Formateo en vivo del RUT en Validar Socio
  const handleValRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRutWithDotsAndDash(e.target.value);
    setValRut(formatted);
    if (errorMsg) setErrorMsg('');
  };

  const rutCleanLen = rut.replace(/[^0-9kK]/g, '').length;
  const rutValidoEnVivo = isValidRut(rut);
  const rutInvalidoEnVivo = rutCleanLen >= 8 && !rutValidoEnVivo;

  const valRutCleanLen = valRut.replace(/[^0-9kK]/g, '').length;
  const valRutValidoEnVivo = isValidRut(valRut);
  const valRutInvalidoEnVivo = valRutCleanLen >= 8 && !valRutValidoEnVivo;

  // ── SUBMIT 1: INICIAR SESIÓN NORMAL (RUT MÓDULO 11 ESTRICTO) ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSindicatoPendiente(false);

    if (!isValidRut(rut)) {
      setErrorMsg('Ingresa un RUT chileno válido con puntos y guion (ej: 12.345.678-5).');
      return;
    }

    setLoading(true);
    try {
      const realEmail = await resolverCorreoDesdeRut(rut);
      if (!realEmail) {
        throw new Error('No encontramos una cuenta asociada a este RUT.');
      }

      await finalizarSesionYRedirigir(realEmail, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión. Por favor, verifica tus datos.');
      setLoading(false);
    }
  };

  // ── SUBMIT 2: VALIDAR CÓDIGO DE 6 DÍGITOS DEL SOCIO (RUT MÓDULO 11 O EMAIL) ──
  const handleValidarCodigoSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const codigoLimpio = valCodigo.replace(/\D/g, '').trim();

    if (valInputMode === 'rut') {
      if (!isValidRut(valRut)) {
        setErrorMsg('Ingresa un RUT chileno válido con puntos y guion (ej: 12.345.678-5).');
        return;
      }
    } else {
      if (!isValidEmail(valEmail)) {
        setErrorMsg('Ingresa un correo electrónico válido (ej: nombre@gmail.com).');
        return;
      }
    }

    if (codigoLimpio.length < 6) {
      setErrorMsg('Ingresa los 6 dígitos del código que llegó a tu correo.');
      return;
    }

    setValLoading(true);
    try {
      const emailFinal =
        valVieneDeLogin && valEmail
          ? valEmail.trim().toLowerCase()
          : valInputMode === 'email'
          ? valEmail.trim().toLowerCase()
          : await resolverCorreoDesdeRut(valRut);

      if (!emailFinal) {
        throw new Error('No encontramos una cuenta registrada con ese RUT.');
      }

      const supabase = createClient();
      const { data, error } = await supabase.rpc('validar_correo_usuario', {
        p_email: emailFinal,
        p_codigo: codigoLimpio,
      });

      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || 'El código de 6 dígitos no coincide o ya fue utilizado.');
      }

      // Si el socio venía desde el Login (ya escribió su contraseña), entra directo al sindicato
      if (valVieneDeLogin && password) {
        await finalizarSesionYRedirigir(emailFinal, password);
        return;
      }

      // Si entró directo a "Validar Socio", pasa al Paso 2 para meter su contraseña temporal
      setSocioValidado({
        fullName: data.full_name || 'Socio',
        rut: data.rut || valRut,
        email: data.email || emailFinal,
        sindicatoId: Number(data.sindicato_id || 0),
        sindicatoNombre: data.sindicato_nombre || 'Tu Sindicato',
        yaVerificado: Boolean(data.ya_verificado),
      });
      setValLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo validar el código. Revisa tu correo e intenta de nuevo.');
      setValLoading(false);
    }
  };

  // ── SUBMIT 3: PASO 2 DEL VALIDADOR (INGRESAR CLAVE TEMPORAL Y ENTRAR AL SINDICATO) ──
  const handleIngresarTrasValidar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socioValidado) return;
    setErrorMsg('');
    setValLoading(true);
    try {
      await finalizarSesionYRedirigir(socioValidado.email, valPasswordPaso2);
    } catch (err: any) {
      setErrorMsg(err.message || 'La contraseña no coincide con la enviada a tu correo.');
      setValLoading(false);
    }
  };

  const pilarSeleccionado = PILARES_DATA.find((p) => p.id === pilarActivo) || PILARES_DATA[0];

  return (
    <div style={styles.page}>
      {/* ── NAVBAR ── */}
      <nav className="pyc-nav">
        <div className="pyc-nav-brand">
          <div className="pyc-nav-mark" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
            PYC
          </div>
          <span
            className="pyc-nav-name"
            style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '-0.015em' }}
          >
            Sindicato PYC
          </span>
        </div>
        <ul className="pyc-nav-links">
          <li>
            <a href="#" style={styles.navLink}>Inicio</a>
          </li>
          <li>
            <a href="#nosotros" style={styles.navLink}>Nosotros</a>
          </li>
          <li>
            <a
              href="#trial"
              style={{
                ...styles.navLink,
                color: '#e5b32a',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '999px',
                  background: '#e5b32a',
                  boxShadow: '0 0 8px rgba(229,179,42,0.8)',
                }}
              />
              Trial 30 días
            </a>
          </li>
          <li>
            <a href="#planes" style={styles.navLink}>Planes</a>
          </li>
        </ul>
        <button className="pyc-nav-cta" style={styles.navCta} onClick={() => abrirDrawer('login')}>
          Ingresar
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="pyc-hero">
        <canvas ref={canvasRef} className="pyc-hero-canvas" />
        <div className="pyc-hero-overlay" />

        <motion.div
          className="pyc-hero-content"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={styles.heroTag}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#e5b32a',
              }}
            />
            <span>Plataforma SaaS Gremial</span>
          </div>
          <h1 className="pyc-hero-title" style={styles.heroTitle}>
            Tu sindicato, <em style={{ fontStyle: 'normal', color: '#e5b32a' }}>unido</em> y digital
          </h1>
          <p className="pyc-hero-sub" style={styles.heroSub}>
            Gestiona beneficios con comprobantes automáticos, votaciones, asistencia QR, actas y asesoría legal en un solo lugar.
          </p>
          <div className="pyc-hero-actions" style={{ marginTop: '22px', gap: '10px', flexWrap: 'wrap' }}>
            <button className="pyc-btn-primary" style={styles.btnPrimary} onClick={() => abrirDrawer('login')}>
              Ingresar al Portal
            </button>
            <a
              href="#trial"
              className="pyc-btn-ghost"
              style={{
                ...styles.btnGhost,
                borderColor: 'rgba(229, 179, 42, 0.38)',
                color: '#f3c64f',
                background: 'rgba(229, 179, 42, 0.08)',
              }}
            >
              Probar 30 días gratis
            </a>
            <button
              type="button"
              className="pyc-btn-ghost"
              style={{
                ...styles.btnGhost,
                borderColor: 'rgba(52, 211, 153, 0.35)',
                color: '#6ee7b7',
                background: 'rgba(16, 185, 129, 0.08)',
              }}
              onClick={() => abrirDrawer('validar_socio')}
            >
              Validar mi acceso de Socio
            </button>
          </div>
        </motion.div>

        <motion.div
          className="pyc-stats"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="pyc-stat">
            <div className="pyc-stat-num" style={styles.statNum}>
              +<span style={{ color: '#e5b32a' }}>240</span>
            </div>
            <div className="pyc-stat-label" style={styles.statLabel}>Socios activos</div>
          </div>
          <div className="pyc-stat">
            <div className="pyc-stat-num" style={styles.statNum}>
              <span style={{ color: '#e5b32a' }}>10</span>
            </div>
            <div className="pyc-stat-label" style={styles.statLabel}>Módulos sindicales</div>
          </div>
          <div className="pyc-stat">
            <div className="pyc-stat-num" style={styles.statNum}>
              <span style={{ color: '#e5b32a' }}>30</span> días
            </div>
            <div className="pyc-stat-label" style={styles.statLabel}>Trial sin costo</div>
          </div>
        </motion.div>
      </section>

      {/* ── SOBRE NOSOTROS (INTERACTIVO) ── */}
      <section className="pyc-section" id="nosotros">
        <div style={styles.sectionTag}>Sobre la plataforma</div>
        <h2 className="pyc-section-title" style={styles.sectionTitle}>
          Creada para representar a quienes trabajan
        </h2>

        <div className="pyc-nosotros-grid" style={{ marginTop: '28px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <p style={styles.bodyText}>
              Sindicato PYC reúne en un solo espacio multi-organización todo lo que una directiva y sus socios necesitan. Haz clic en cualquiera de los 4 pilares para explorar cómo funciona por dentro.
            </p>

            <AnimatePresence mode="wait">
              <motion.div
                key={pilarSeleccionado.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                style={{
                  background: '#11141d',
                  border: '1px solid rgba(229, 179, 42, 0.25)',
                  borderRadius: '14px',
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#e5b32a',
                    }}
                  >
                    {pilarSeleccionado.modulo}
                  </span>
                  <span style={{ fontSize: '1.15rem' }}>{pilarSeleccionado.icon}</span>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
                  {pilarSeleccionado.titulo}
                </h3>
                <p style={{ ...styles.bodyText, fontSize: '0.8125rem', marginBottom: '14px' }}>
                  {pilarSeleccionado.detalle}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {pilarSeleccionado.bullets.map((b) => (
                    <div
                      key={b}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.78rem',
                        color: '#cbd5e1',
                      }}
                    >
                      <span style={{ color: '#e5b32a', fontWeight: 700 }}>✓</span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="pyc-pillars">
            {PILARES_DATA.map((pilar) => {
              const activo = pilar.id === pilarActivo;
              return (
                <motion.button
                  key={pilar.id}
                  type="button"
                  onClick={() => setPilarActivo(pilar.id)}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.985 }}
                  className="pyc-pillar"
                  style={{
                    borderRadius: '12px',
                    padding: '18px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: activo
                      ? '1px solid rgba(229, 179, 42, 0.55)'
                      : '1px solid rgba(255, 255, 255, 0.07)',
                    background: activo
                      ? 'rgba(229, 179, 42, 0.07)'
                      : 'rgba(255, 255, 255, 0.02)',
                    transition: 'border-color 0.2s ease, background 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div className="pyc-pillar-icon" style={{ fontSize: '1.05rem' }}>
                      {pilar.icon}
                    </div>
                    {activo && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          color: '#e5b32a',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        Activo
                      </span>
                    )}
                  </div>
                  <h3 style={{ ...styles.pillarTitle, color: '#ffffff' }}>{pilar.titulo}</h3>
                  <p style={styles.pillarDesc}>{pilar.desc}</p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="pyc-divider" />

      {/* ── TRIAL 30 DÍAS GRATIS ── */}
      <section className="pyc-section" id="trial">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          style={{
            background:
              'linear-gradient(135deg, rgba(17,20,29,0.98) 0%, rgba(22,20,14,0.96) 100%)',
            border: '1px solid rgba(229, 179, 42, 0.32)',
            borderRadius: '20px',
            padding: 'clamp(24px, 4vw, 40px)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '32px',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 11px',
                  borderRadius: '999px',
                  background: 'rgba(229, 179, 42, 0.14)',
                  border: '1px solid rgba(229, 179, 42, 0.35)',
                  color: '#f3c64f',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '14px',
                }}
              >
                <span>★ Promoción Trial · $0 Hoy</span>
              </div>

              <h2 style={{ ...styles.sectionTitle, fontSize: 'clamp(1.5rem, 2.6vw, 2rem)', marginTop: 0 }}>
                Prueba Sindicato PYC gratis durante <span style={{ color: '#e5b32a' }}>30 días</span>
              </h2>
              <p style={{ ...styles.bodyText, marginTop: '10px', marginBottom: '18px' }}>
                Digitaliza tu organización sin pagar el primer mes. Te asignamos una{' '}
                <strong style={{ color: '#fff' }}>ID oficial de sindicato</strong> y una cuenta de{' '}
                <strong style={{ color: '#fff' }}>Administrador Único</strong> lista para operar con tus socios.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '22px' }}>
                {[
                  'Hasta 20 socios',
                  '1 Administrador único',
                  'Beneficios + EmailJS',
                  'Credencial QR',
                  'Actas y Asistencia',
                ].map((chip) => (
                  <span
                    key={chip}
                    style={{
                      fontSize: '0.73rem',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.09)',
                      color: '#e2e8f0',
                    }}
                  >
                    <span style={{ color: '#e5b32a', marginRight: '5px' }}>✓</span>
                    {chip}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <Link
                  href="/planes?plan=trial"
                  className="pyc-btn-primary"
                  style={{ ...styles.btnPrimary, textDecoration: 'none' }}
                >
                  Activar Trial 30 días ($0) →
                </Link>
                <Link
                  href="/validar-sindicato"
                  style={{
                    ...styles.btnGhost,
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#cbd5e1',
                  }}
                >
                  Ya tengo mi código
                </Link>
              </div>
            </div>

            <div
              style={{
                background: '#0b0d12',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#94a3b8',
                  }}
                >
                  Cómo funciona la activación
                </span>
                <span style={{ fontSize: '0.7rem', color: '#e5b32a', fontFamily: 'monospace' }}>
                  3 pasos simples
                </span>
              </div>

              {PASOS_TRIAL.map((paso, idx) => {
                const activo = idx === pasoTrialActivo;
                return (
                  <button
                    key={paso.num}
                    type="button"
                    onClick={() => setPasoTrialActivo(idx)}
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      padding: '13px 14px',
                      borderRadius: '12px',
                      border: activo
                        ? '1px solid rgba(229, 179, 42, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                      background: activo
                        ? 'rgba(229, 179, 42, 0.08)'
                        : 'rgba(255, 255, 255, 0.02)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 7px',
                          borderRadius: '6px',
                          background: activo ? '#e5b32a' : 'rgba(255,255,255,0.07)',
                          color: activo ? '#0b0d12' : '#94a3b8',
                        }}
                      >
                        {paso.num}
                      </span>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#ffffff' }}>
                        {paso.titulo}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '0.76rem',
                        color: activo ? '#cbd5e1' : '#788496',
                        lineHeight: 1.5,
                        marginTop: '6px',
                        marginBottom: 0,
                        paddingLeft: '36px',
                      }}
                    >
                      {paso.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>

      <div className="pyc-divider" />

      {/* ── PLANES INTERACTIVOS ── */}
      <section className="pyc-section" id="planes">
        <div style={{ textAlign: 'center', maxWidth: '620px', margin: '0 auto' }}>
          <div style={styles.sectionTag}>Planes para tu organización</div>
          <h2 style={{ ...styles.sectionTitle, marginTop: '8px' }}>
            Escala a tu ritmo, sin letra chica
          </h2>
          <p style={{ ...styles.bodyText, marginTop: '8px' }}>
            Elige pago mensual o ahorra dos meses contratando el ciclo anual. Todos incluyen los primeros 30 días de prueba.
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '20px',
              padding: '4px',
              borderRadius: '10px',
              background: '#11141d',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => setCicloPlanes('mensual')}
              style={{
                padding: '7px 16px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: cicloPlanes === 'mensual' ? '#e5b32a' : 'transparent',
                color: cicloPlanes === 'mensual' ? '#0b0d12' : '#94a3b8',
                transition: 'all 0.18s ease',
              }}
            >
              Pago mensual
            </button>
            <button
              type="button"
              onClick={() => setCicloPlanes('anual')}
              style={{
                padding: '7px 16px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: cicloPlanes === 'anual' ? '#e5b32a' : 'transparent',
                color: cicloPlanes === 'anual' ? '#0b0d12' : '#94a3b8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.18s ease',
              }}
            >
              <span>Pago anual</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '999px',
                  background:
                    cicloPlanes === 'anual' ? 'rgba(11,13,18,0.18)' : 'rgba(229,179,42,0.16)',
                  color: cicloPlanes === 'anual' ? '#0b0d12' : '#e5b32a',
                }}
              >
                2 meses gratis
              </span>
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '18px',
            marginTop: '30px',
          }}
        >
          {PLANES_PREVIEW.map((plan) => {
            const precio = cicloPlanes === 'mensual' ? plan.mensual : plan.anual;
            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'relative',
                  background: plan.destacado ? '#131722' : '#10131b',
                  border: plan.destacado
                    ? '1px solid rgba(229, 179, 42, 0.55)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {plan.destacado && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-11px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#e5b32a',
                      color: '#0b0d12',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    Más popular
                  </span>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                      {plan.nombre}
                    </h3>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: '#e5b32a',
                        background: 'rgba(229,179,42,0.1)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {plan.socios}
                    </span>
                  </div>
                  <p style={{ ...styles.pillarDesc, marginTop: '6px', marginBottom: '16px' }}>
                    {plan.desc}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.03em' }}>
                      ${precio.toLocaleString('es-CL')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      /{cicloPlanes === 'mensual' ? 'mes' : 'año'}
                    </span>
                  </div>

                  {cicloPlanes === 'anual' && (
                    <div style={{ fontSize: '0.72rem', color: '#34d399', marginBottom: '12px' }}>
                      Ahorras ${plan.ahorro.toLocaleString('es-CL')} al año
                    </div>
                  )}

                  <ul
                    style={{
                      listStyle: 'none',
                      padding: '14px 0 0 0',
                      margin: '12px 0 20px 0',
                      borderTop: '1px solid rgba(255,255,255,0.07)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {plan.items.map((item) => (
                      <li
                        key={item}
                        style={{
                          fontSize: '0.78rem',
                          color: '#cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ color: '#e5b32a' }}>✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={`/planes?plan=${plan.id}`}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    textDecoration: 'none',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: plan.destacado ? '#e5b32a' : 'rgba(255,255,255,0.06)',
                    color: plan.destacado ? '#0b0d12' : '#ffffff',
                    border: plan.destacado ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  Elegir {plan.nombre}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <div className="pyc-footer-cta">
        <h2 style={styles.sectionTitle}>¿Ya eres socio o dirigente?</h2>
        <p style={{ ...styles.bodyText, marginTop: '8px', marginBottom: '18px' }}>
          Ingresa con tu RUT y contraseña, o activa tu acceso si recién recibiste tu correo de aprobación.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button className="pyc-btn-primary" style={styles.btnPrimary} onClick={() => abrirDrawer('login')}>
            Ingresar al Portal
          </button>
          <button
            type="button"
            className="pyc-btn-ghost"
            style={{
              ...styles.btnGhost,
              borderColor: 'rgba(52, 211, 153, 0.35)',
              color: '#6ee7b7',
            }}
            onClick={() => abrirDrawer('validar_socio')}
          >
            Validar Acceso de Socio
          </button>
          <Link
            href="/validar-sindicato"
            className="pyc-btn-ghost"
            style={{ ...styles.btnGhost, textDecoration: 'none' }}
          >
            Activar Sindicato
          </Link>
        </div>
      </div>

      <div className="pyc-footer-bottom" style={{ fontSize: '0.75rem', color: 'rgba(244, 245, 247, 0.48)' }}>
        <span>© 2026 Sindicato PYC. Todos los derechos reservados.</span>
        <span>Desarrollado por equipo Capstone · Duoc UC</span>
      </div>

      {/* ══════════════════════════════════════════
          DRAWER UNIFICADO: INICIAR SESIÓN + VALIDADOR DE SOCIOS (RUT MÓDULO 11)
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="pyc-overlay"
              style={{ backdropFilter: 'blur(4px)', background: 'rgba(4, 6, 10, 0.68)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setDrawerOpen(false)}
            />

            <motion.div
              className="pyc-drawer"
              style={styles.drawer}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Cabecera del Drawer */}
              <div
                className="pyc-drawer-header"
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', padding: '16px 24px' }}
              >
                <div className="pyc-drawer-brand" style={{ gap: '8px' }}>
                  <div className="pyc-drawer-mark" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                    PYC
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.84375rem', letterSpacing: '-0.015em' }}>
                    Sindicato PYC
                  </span>
                </div>
                <button
                  className="pyc-drawer-close"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Cerrar panel"
                  style={{
                    fontSize: '0.78125rem',
                    fontWeight: 500,
                    borderRadius: '7px',
                    width: '28px',
                    height: '28px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="pyc-drawer-body" style={{ padding: '20px 24px 28px', overflowY: 'auto' }}>
                {/* Switch minimalista: Iniciar Sesión | Validar Socio */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4px',
                    padding: '4px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    marginBottom: '20px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => cambiarModoDrawer('login')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '7px',
                      border: 'none',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: drawerMode === 'login' ? '#e5b32a' : 'transparent',
                      color: drawerMode === 'login' ? '#0b0d12' : '#94a3b8',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarModoDrawer('validar_socio')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '7px',
                      border: 'none',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: drawerMode === 'validar_socio' ? '#10b981' : 'transparent',
                      color: drawerMode === 'validar_socio' ? '#06231a' : '#94a3b8',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    Validar Socio
                  </button>
                </div>

                {/* Error global dentro del drawer */}
                {errorMsg && (
                  <motion.div
                    className="pyc-error"
                    style={{
                      fontSize: '0.78125rem',
                      fontWeight: 450,
                      lineHeight: 1.45,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div>
                      <span>⚠️</span> {errorMsg}
                    </div>
                    {sindicatoPendiente && (
                      <Link
                        href="/validar-sindicato"
                        style={{
                          display: 'inline-block',
                          textAlign: 'center',
                          textDecoration: 'none',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          background: '#e5b32a',
                          color: '#0b0d12',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                        }}
                      >
                        Activar Sindicato Ahora →
                      </Link>
                    )}
                  </motion.div>
                )}

                <AnimatePresence mode="wait">
                  {drawerMode === 'login' ? (
                    /* ================= MODO 1: LOGIN NORMAL ================= */
                    <motion.div
                      key="modo-login"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div style={styles.drawerEyebrow}>Portal de Socios y Directiva</div>
                      <h2 style={styles.drawerTitle}>Bienvenido de vuelta</h2>
                      <p style={styles.drawerSubtitle}>
                        {redirectDestino
                          ? 'Inicia sesión para registrar tu asistencia.'
                          : 'Ingresa con tu RUT y contraseña. Si es tu primer ingreso, te pediremos tu código de 6 dígitos aquí mismo.'}
                      </p>

                      <form onSubmit={handleLogin}>
                        <div
                          style={{
                            ...styles.fieldLabel,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>RUT del Usuario</span>
                          {rutValidoEnVivo && (
                            <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 600 }}>
                              ✓ RUT válido
                            </span>
                          )}
                          {rutInvalidoEnVivo && (
                            <span style={{ fontSize: '0.68rem', color: '#fb7185', fontWeight: 600 }}>
                              ✕ RUT inválido
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={12}
                          inputMode="text"
                          autoComplete="username"
                          placeholder="12.345.678-5"
                          value={rut}
                          onChange={handleRutChange}
                          onFocus={() => setFocusedField('rut')}
                          onBlur={() => setFocusedField(null)}
                          autoFocus
                          style={{
                            ...styles.input,
                            width: '100%',
                            borderColor: rutValidoEnVivo
                              ? 'rgba(52, 211, 153, 0.55)'
                              : rutInvalidoEnVivo
                              ? 'rgba(251, 113, 133, 0.6)'
                              : focusedField === 'rut'
                              ? 'rgba(212, 157, 18, 0.55)'
                              : 'rgba(255, 255, 255, 0.1)',
                            backgroundColor:
                              focusedField === 'rut'
                                ? 'rgba(255, 255, 255, 0.045)'
                                : 'rgba(255, 255, 255, 0.03)',
                          }}
                        />

                        <div
                          style={{
                            ...styles.fieldLabel,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '14px',
                          }}
                        >
                          <span>Contraseña</span>
                          <Link
                            href="/forgot-password"
                            style={{
                              fontSize: '0.71875rem',
                              fontWeight: 450,
                              letterSpacing: 0,
                              color: '#e5b32a',
                              textDecoration: 'none',
                            }}
                          >
                            ¿Olvidaste tu clave?
                          </Link>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoComplete="current-password"
                            placeholder="••••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField(null)}
                            style={{
                              ...styles.input,
                              width: '100%',
                              paddingRight: '52px',
                              borderColor:
                                focusedField === 'password'
                                  ? 'rgba(212, 157, 18, 0.55)'
                                  : 'rgba(255, 255, 255, 0.1)',
                              backgroundColor:
                                focusedField === 'password'
                                  ? 'rgba(255, 255, 255, 0.045)'
                                  : 'rgba(255, 255, 255, 0.03)',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                          >
                            {showPassword ? 'Ocultar' : 'Ver'}
                          </button>
                        </div>

                        <button
                          className="pyc-drawer-btn"
                          type="submit"
                          disabled={loading}
                          style={{
                            ...styles.drawerBtn,
                            width: '100%',
                            opacity: loading ? 0.7 : 1,
                          }}
                        >
                          {loading
                            ? 'Verificando acceso...'
                            : redirectDestino
                            ? 'Ingresar y Confirmar Asistencia'
                            : 'Ingresar al Portal'}
                        </button>
                      </form>
                    </motion.div>
                  ) : socioValidado ? (
                    /* ================= MODO 2 · PASO 2: CORREO VALIDADO -> ENTRAR AL SINDICATO ================= */
                    <motion.div
                      key="modo-validar-paso2"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div
                        style={{
                          padding: '14px',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.08)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          marginBottom: '16px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px',
                          }}
                        >
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#34d399' }}>
                            ✓ {socioValidado.yaVerificado ? 'Cuenta ya verificada' : 'Correo validado con éxito'}
                          </span>
                          {socioValidado.sindicatoId > 0 && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontFamily: 'monospace',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                background: 'rgba(229,179,42,0.16)',
                                color: '#e5b32a',
                              }}
                            >
                              ID #{socioValidado.sindicatoId}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                          ¡Bienvenido, {socioValidado.fullName}!
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: '#cbd5e1' }}>
                          {socioValidado.sindicatoNombre} · RUT{' '}
                          <strong style={{ fontFamily: 'monospace', color: '#fff' }}>
                            {formatRutWithDotsAndDash(socioValidado.rut)}
                          </strong>
                        </p>
                      </div>

                      <form onSubmit={handleIngresarTrasValidar}>
                        <div style={styles.fieldLabel}>
                          Ingresa tu contraseña temporal del correo
                        </div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showValPassword ? 'text' : 'password'}
                            required
                            autoFocus
                            autoComplete="current-password"
                            placeholder="Ej: Socio1234!"
                            value={valPasswordPaso2}
                            onChange={(e) => {
                              setValPasswordPaso2(e.target.value);
                              if (errorMsg) setErrorMsg('');
                            }}
                            style={{
                              ...styles.input,
                              width: '100%',
                              paddingRight: '52px',
                              borderColor: 'rgba(16, 185, 129, 0.45)',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowValPassword((v) => !v)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                          >
                            {showValPassword ? 'Ocultar' : 'Ver'}
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={valLoading}
                          style={{
                            ...styles.drawerBtn,
                            width: '100%',
                            background: '#10b981',
                            color: '#06231a',
                            border: 'none',
                            cursor: 'pointer',
                            opacity: valLoading ? 0.7 : 1,
                          }}
                        >
                          {valLoading
                            ? 'Ingresando al sindicato...'
                            : `Ingresar a ${socioValidado.sindicatoNombre} →`}
                        </button>
                      </form>
                    </motion.div>
                  ) : (
                    /* ================= MODO 2 · PASO 1: VALIDADOR DE SOCIO (RUT FORMATEADO + CÓDIGO 6 DÍGITOS) ================= */
                    <motion.div
                      key="modo-validar-paso1"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div style={{ ...styles.drawerEyebrow, color: '#34d399' }}>
                        {valVieneDeLogin
                          ? 'Primer Ingreso · Verificación Rápida'
                          : 'Activación de Nuevo Socio · Bcrypt'}
                      </div>
                      <h2 style={styles.drawerTitle}>
                        {valVieneDeLogin
                          ? `¡Hola, ${valNombreDetectado}!`
                          : 'Valida tu Acceso de Socio'}
                      </h2>
                      <p style={styles.drawerSubtitle}>
                        {valVieneDeLogin
                          ? 'Tus credenciales son correctas. Ingresa el código de 6 dígitos que llegó a tu correo y entrarás directo al sindicato.'
                          : 'Ingresa tu RUT chileno con puntos y guion junto al código de 6 dígitos de tu Orden de Incorporación.'}
                      </p>

                      <form onSubmit={handleValidarCodigoSocio}>
                        <div
                          style={{
                            ...styles.fieldLabel,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span>{valInputMode === 'rut' ? 'RUT del Socio' : 'Correo electrónico'}</span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {valInputMode === 'rut' && valRutValidoEnVivo && (
                              <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 600 }}>
                                ✓ RUT válido
                              </span>
                            )}
                            {valInputMode === 'rut' && valRutInvalidoEnVivo && (
                              <span style={{ fontSize: '0.68rem', color: '#fb7185', fontWeight: 600 }}>
                                ✕ RUT inválido
                              </span>
                            )}
                            {!valVieneDeLogin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setErrorMsg('');
                                  setValInputMode((m) => (m === 'rut' ? 'email' : 'rut'));
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94a3b8',
                                  fontSize: '0.68rem',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                {valInputMode === 'rut' ? 'Usar correo' : 'Usar RUT'}
                              </button>
                            )}
                          </div>
                        </div>

                        {valInputMode === 'rut' ? (
                          <input
                            type="text"
                            required
                            readOnly={valVieneDeLogin}
                            maxLength={12}
                            inputMode="text"
                            placeholder="12.345.678-5"
                            value={valRut}
                            onChange={handleValRutChange}
                            onFocus={() => setFocusedField('valRut')}
                            onBlur={() => setFocusedField(null)}
                            autoFocus={!valVieneDeLogin}
                            style={{
                              ...styles.input,
                              width: '100%',
                              opacity: valVieneDeLogin ? 0.78 : 1,
                              borderColor: valRutValidoEnVivo
                                ? 'rgba(52, 211, 153, 0.55)'
                                : valRutInvalidoEnVivo
                                ? 'rgba(251, 113, 133, 0.6)'
                                : focusedField === 'valRut'
                                ? 'rgba(16, 185, 129, 0.55)'
                                : 'rgba(255, 255, 255, 0.1)',
                            }}
                          />
                        ) : (
                          <input
                            type="email"
                            required
                            readOnly={valVieneDeLogin}
                            autoComplete="email"
                            placeholder="tucorreo@gmail.com"
                            value={valEmail}
                            onChange={(e) => {
                              setValEmail(e.target.value);
                              if (errorMsg) setErrorMsg('');
                            }}
                            onFocus={() => setFocusedField('valEmail')}
                            onBlur={() => setFocusedField(null)}
                            autoFocus={!valVieneDeLogin}
                            style={{
                              ...styles.input,
                              width: '100%',
                              opacity: valVieneDeLogin ? 0.78 : 1,
                              borderColor:
                                focusedField === 'valEmail'
                                  ? 'rgba(16, 185, 129, 0.55)'
                                  : 'rgba(255, 255, 255, 0.1)',
                            }}
                          />
                        )}

                        <div style={{ ...styles.fieldLabel, marginTop: '14px' }}>
                          Código de verificación (6 dígitos)
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          required
                          autoFocus={valVieneDeLogin}
                          maxLength={6}
                          placeholder="000000"
                          value={valCodigo}
                          onChange={(e) => {
                            setValCodigo(e.target.value.replace(/\D/g, '').slice(0, 6));
                            if (errorMsg) setErrorMsg('');
                          }}
                          onFocus={() => setFocusedField('valCodigo')}
                          onBlur={() => setFocusedField(null)}
                          style={{
                            ...styles.input,
                            width: '100%',
                            textAlign: 'center',
                            fontSize: '1.35rem',
                            fontWeight: 700,
                            letterSpacing: '0.38em',
                            fontFamily: 'monospace',
                            color: '#34d399',
                            padding: '12px',
                            borderColor:
                              focusedField === 'valCodigo'
                                ? 'rgba(16, 185, 129, 0.65)'
                                : 'rgba(16, 185, 129, 0.28)',
                          }}
                        />

                        <button
                          type="submit"
                          disabled={valLoading}
                          style={{
                            ...styles.drawerBtn,
                            width: '100%',
                            background: '#10b981',
                            color: '#06231a',
                            border: 'none',
                            cursor: 'pointer',
                            opacity: valLoading ? 0.7 : 1,
                          }}
                        >
                          {valLoading
                            ? 'Verificando código...'
                            : valVieneDeLogin
                            ? 'Confirmar Código y Entrar →'
                            : 'Validar Código y Continuar →'}
                        </button>

                        {valVieneDeLogin && (
                          <button
                            type="button"
                            onClick={() => cambiarModoDrawer('login')}
                            style={{
                              width: '100%',
                              marginTop: '10px',
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              fontSize: '0.73rem',
                              cursor: 'pointer',
                              padding: '6px',
                            }}
                          >
                            ← Cambiar de cuenta
                          </button>
                        )}
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Apartado destacado Trial dentro del Login */}
                <Link
                  href="/planes?plan=trial"
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                    marginTop: '20px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(229, 179, 42, 0.08)',
                    border: '1px solid rgba(229, 179, 42, 0.28)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#f3c64f' }}>
                      ★ ¿Eres dirigente? Prueba 30 días gratis
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#e5b32a' }}>→</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    Crea tu sindicato en modo Trial ($0 hoy) y recibe tus credenciales por Gmail.
                  </p>
                </Link>

                <div style={{ ...styles.sep, textAlign: 'center' }}>Otros accesos</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Link
                    href="/postular"
                    style={{
                      ...styles.secondaryBtn,
                      display: 'block',
                      textAlign: 'center',
                      textDecoration: 'none',
                      fontSize: '0.73rem',
                    }}
                  >
                    Postular como Socio
                  </Link>

                  <Link
                    href="/validar-sindicato"
                    style={{
                      ...styles.secondaryBtn,
                      display: 'block',
                      textAlign: 'center',
                      textDecoration: 'none',
                      fontSize: '0.73rem',
                      color: '#f3c64f',
                      borderColor: 'rgba(229, 179, 42, 0.25)',
                    }}
                  >
                    Validar Sindicato
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: '#0b0d12',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '2px solid rgba(212,157,18,0.25)',
              borderTopColor: '#d49d12',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      }
    >
      <LandingPage />
    </Suspense>
  );
}