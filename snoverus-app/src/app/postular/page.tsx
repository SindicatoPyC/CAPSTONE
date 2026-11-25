'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '../lib/supabase';

// ─── FORMATEADORES CHILENOS (SIN PUNTOS, CON GUIÓN) ───────────────────────────
function formatRutSinPuntos(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return `${body}-${dv}`;
}

function formatRutConPuntos(clean: string): string {
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

function hasValidRutFormat(rut: string): boolean {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 8 || clean.length > 9) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return /^\d{7,8}$/.test(body) && /^[0-9K]$/.test(dv);
}

function formatTelefonoChileno(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 1) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 1)} ${digits.slice(1)}`;
  return `${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5)}`;
}

function esSindicatoDisponible(s: SindicatoItem): boolean {
  const est = String(s.estado || 'activo').trim().toLowerCase();
  return est !== 'suspendido' && est !== 'pendiente_validacion';
}

const ETIQUETAS_MODULOS_UI: Record<string, string> = {
  beneficios: 'Beneficios',
  legal: 'Asesoría Legal IA',
  credencial: 'Credencial QR',
  asistencia: 'Asistencia Asambleas',
  actas: 'Actas Digitales',
  finanzas: 'Finanzas',
  encuestas: 'Votaciones',
  negociacion: 'Negociación',
  solidario: 'Fondo Solidario',
  soporte: 'Mesa de Soporte',
};

interface SindicatoItem {
  id: number;
  nombre: string;
  rut_sindicato?: string;
  estado?: string;
  validado?: boolean;
  logo_url?: string | null;
  plan_activo?: string | null;
  config_ui?: any;
}

function PostularContent() {
  const searchParams = useSearchParams();
  const lookupSeqRef = useRef(0);

  // Campos del formulario
  const [sindicatoId, setSindicatoId] = useState('');
  const [busquedaIdInput, setBusquedaIdInput] = useState('');
  const [rolSolicitado, setRolSolicitado] = useState<'socio' | 'admin'>('socio');
  const [fullName, setFullName] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [aceptaDeclaracion, setAceptaDeclaracion] = useState(true);

  // Estados de carga y UI
  const [sindicatos, setSindicatos] = useState<SindicatoItem[]>([]);
  const [cargandoSindicatos, setCargandoSindicatos] = useState(true);
  const [buscandoId, setBuscandoId] = useState(false);
  const [avisoId, setAvisoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [folioEnviado, setFolioEnviado] = useState<{
    folio: string;
    fecha: string;
    sindicatoNombre: string;
    sindicatoId: number;
    rolEnviado: 'socio' | 'admin';
  } | null>(null);

  // 1. Cargar sindicatos activos + detectar ?sid= o ?id= en la URL
  useEffect(() => {
    async function cargarSindicatos() {
      setCargandoSindicatos(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('sindicatos')
          .select('*')
          .order('id', { ascending: true });

        if (!error && Array.isArray(data)) {
          const todos = data as SindicatoItem[];
          const visibles = todos.filter(esSindicatoDisponible);
          setSindicatos(visibles);

          const paramSid = (searchParams.get('sid') || searchParams.get('id') || '').replace(
            /\D/g,
            ''
          );
          if (paramSid) {
            setBusquedaIdInput(paramSid);
            const matchVisible = visibles.find((s) => String(s.id) === paramSid);
            if (matchVisible) {
              setSindicatoId(String(matchVisible.id));
              setAvisoId('');
            } else {
              const matchEnTodos = todos.find((s) => String(s.id) === paramSid);
              if (matchEnTodos) {
                const est = String(matchEnTodos.estado || '').toLowerCase();
                setAvisoId(
                  est === 'suspendido'
                    ? `El sindicato ID #${paramSid} se encuentra suspendido temporalmente.`
                    : `El sindicato ID #${paramSid} aún está pendiente de validación por su directiva.`
                );
              } else {
                setAvisoId(`No hay ningún sindicato activo con el ID #${paramSid}.`);
              }
            }
          }
        }
      } finally {
        setCargandoSindicatos(false);
      }
    }
    cargarSindicatos();
  }, [searchParams]);

  // Buscar y seleccionar sindicato por ID (en memoria y con fallback directo a Supabase)
  const handleBuscarPorId = async (valor: string) => {
    const soloNumeros = valor.replace(/\D/g, '');
    setBusquedaIdInput(soloNumeros);
    setAvisoId('');
    setErrorMsg('');

    const seq = ++lookupSeqRef.current;

    if (!soloNumeros) {
      setSindicatoId('');
      setBuscandoId(false);
      return;
    }

    const matchLocal = sindicatos.find((s) => String(s.id) === soloNumeros);
    if (matchLocal) {
      setSindicatoId(String(matchLocal.id));
      setBuscandoId(false);
      return;
    }

    // Fallback en vivo a Supabase por si el sindicato se creó recién o aún cargaba la lista
    setSindicatoId('');
    setBuscandoId(true);
    try {
      const supabase = createClient();
      const { data: directo, error } = await supabase
        .from('sindicatos')
        .select('*')
        .eq('id', Number(soloNumeros))
        .maybeSingle();

      if (seq !== lookupSeqRef.current) return;

      if (!error && directo) {
        const sind = directo as SindicatoItem;
        if (esSindicatoDisponible(sind)) {
          setSindicatos((prev) =>
            prev.some((p) => p.id === sind.id)
              ? prev
              : [...prev, sind].sort((a, b) => a.id - b.id)
          );
          setSindicatoId(String(sind.id));
          setAvisoId('');
        } else {
          const est = String(sind.estado || '').toLowerCase();
          setAvisoId(
            est === 'suspendido'
              ? `El sindicato ID #${soloNumeros} se encuentra suspendido temporalmente.`
              : `El sindicato ID #${soloNumeros} aún está pendiente de validación por su directiva.`
          );
        }
      } else {
        setAvisoId(`No hay ningún sindicato activo con el ID #${soloNumeros}.`);
      }
    } catch {
      if (seq === lookupSeqRef.current) {
        setAvisoId(`No se pudo verificar el sindicato ID #${soloNumeros}. Intenta nuevamente.`);
      }
    } finally {
      if (seq === lookupSeqRef.current) {
        setBuscandoId(false);
      }
    }
  };

  const handleSelectSindicato = (val: string) => {
    lookupSeqRef.current += 1;
    setBuscandoId(false);
    setSindicatoId(val);
    setBusquedaIdInput(val);
    setAvisoId('');
    setErrorMsg('');
  };

  const sindicatoActual = sindicatos.find((s) => String(s.id) === sindicatoId) || null;

  // Módulos habilitados del sindicato seleccionado (para mostrar en la ficha izquierda)
  const modulosSindicato = sindicatoActual?.config_ui?.modulos_activos
    ? Object.entries(sindicatoActual.config_ui.modulos_activos)
        .filter(([, activo]) => Boolean(activo))
        .map(([k]) => ETIQUETAS_MODULOS_UI[k] || k)
    : ['Beneficios', 'Credencial QR', 'Asistencia Asambleas', 'Actas Digitales'];

  // Validaciones en vivo para barra de progreso
  const rutCleanLength = rut.replace(/[^0-9kK]/g, '').length;
  const rutValido = hasValidRutFormat(rut);
  const nombreValido = fullName.trim().length >= 3;
  const telefonoLimpio = telefono.replace(/\D/g, '');
  const telefonoValido = telefonoLimpio.length >= 8;
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const camposCompletos = [
    Boolean(sindicatoActual),
    nombreValido,
    rutValido,
    telefonoValido,
    emailValido,
    aceptaDeclaracion,
  ].filter(Boolean).length;
  const porcentajeProgreso = Math.round((camposCompletos / 6) * 100);

  // Enviar postulación a Supabase para revisión y aprobación (Admin / SuperAdmin)
  const handlePostular = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!sindicatoActual) {
      setErrorMsg('Debes indicar el ID o seleccionar una organización sindical válida.');
      return;
    }

    if (!hasValidRutFormat(rut)) {
      setErrorMsg('Ingresa un RUT completo sin puntos y con guion (ej: 20386773-2).');
      return;
    }

    if (!emailValido) {
      setErrorMsg('Ingresa un correo electrónico válido.');
      return;
    }

    if (!aceptaDeclaracion) {
      setErrorMsg('Confirma la declaración de veracidad para enviar tu postulación.');
      return;
    }

    setLoading(true);
    const cleanRut = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    const rutConGuion = `${cleanRut.slice(0, -1)}-${cleanRut.slice(-1)}`;
    const rutConPuntos = formatRutConPuntos(cleanRut);
    const emailNormalizado = email.trim().toLowerCase();
    const sidNum = Number(sindicatoActual.id);

    try {
      const supabase = createClient();

      // 1. Verificar si ya es miembro activo en ese sindicato (sin bloquear si RLS impide SELECT a anon)
      try {
        const { data: socioExistente } = await supabase
          .from('profiles')
          .select('id')
          .eq('sindicato_id', sidNum)
          .or(`rut.eq.${cleanRut},rut.eq.${rutConGuion},rut.eq.${rutConPuntos}`)
          .limit(1)
          .maybeSingle();

        if (socioExistente) {
          throw new Error(
            `Este RUT ya figura como miembro activo en ${sindicatoActual.nombre}. Puedes iniciar sesión directamente.`
          );
        }
      } catch (checkErr: any) {
        if (checkErr?.message?.includes('miembro activo')) throw checkErr;
      }

      // 2. Verificar si ya tiene postulación pendiente en ese sindicato (sin bloquear si RLS impide SELECT a anon)
      try {
        const { data: postulacionExistente } = await supabase
          .from('postulaciones')
          .select('id')
          .eq('sindicato_id', sidNum)
          .eq('estado', 'Pendiente')
          .or(`rut.eq.${cleanRut},rut.eq.${rutConGuion},rut.eq.${rutConPuntos}`)
          .limit(1)
          .maybeSingle();

        if (postulacionExistente) {
          throw new Error(
            `Ya tienes una postulación en revisión para ${sindicatoActual.nombre}. Espera la aprobación correspondiente.`
          );
        }
      } catch (checkErr: any) {
        if (checkErr?.message?.includes('postulación en revisión')) throw checkErr;
      }

      // 3. Insertar postulación en estado Pendiente (Socio o Directiva/Presidente)
      const { error: insertError } = await supabase.from('postulaciones').insert([
        {
          rut: cleanRut,
          full_name: fullName.trim(),
          email: emailNormalizado,
          telefono: `+56${telefonoLimpio}`,
          estado: 'Pendiente',
          sindicato_id: sidNum,
          rol_solicitado: rolSolicitado,
        },
      ]);

      if (insertError) throw insertError;

      setFolioEnviado({
        folio: `POST-${sidNum}-${Math.floor(10000 + Math.random() * 90000)}`,
        fecha: new Date().toLocaleString('es-CL'),
        sindicatoNombre: sindicatoActual.nombre,
        sindicatoId: sidNum,
        rolEnviado: rolSolicitado,
      });
    } catch (err: any) {
      setErrorMsg(
        err.message || 'No se pudo enviar la postulación. Inténtalo nuevamente en unos segundos.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090b10] text-slate-100 font-sans antialiased flex flex-col">
      {/* ── NAVBAR MINIMALISTA ── */}
      <header className="w-full border-b border-white/[0.07] bg-[#0d1017]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#e5b32a] text-[#090b10] font-bold text-xs flex items-center justify-center">
              PYC
            </div>
            <div>
              <span className="font-semibold text-sm text-white block leading-tight">
                Sindicato PYC
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                Portal de Incorporación
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              href="/validar-sindicato"
              className="hidden sm:inline-flex items-center px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-[#e5b32a] transition-colors"
            >
              Validar Código
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] border border-white/10 text-xs font-medium text-white transition-colors"
            >
              ← Volver al Login
            </Link>
          </div>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-5 py-10 sm:py-14">
        <AnimatePresence mode="wait">
          {folioEnviado ? (
            /* ================= COMPROBANTE DE POSTULACIÓN ENVIADA ================= */
            <motion.div
              key="exito"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="max-w-lg mx-auto bg-[#111520] border border-emerald-500/35 rounded-2xl p-7 sm:p-9 shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2.5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-3xl">
                  ✓
                </div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 block">
                  Solicitud Registrada · {folioEnviado.folio}
                </span>
                <h1 className="text-2xl font-bold text-white">¡Postulación Enviada!</h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {folioEnviado.rolEnviado === 'admin' ? (
                    <>
                      Tu postulación a <strong className="text-[#e5b32a]">Directiva / Presidente</strong>{' '}
                      para <strong className="text-white">{folioEnviado.sindicatoNombre}</strong> ya quedó
                      registrada en el panel del <strong className="text-white">SuperAdmin y la Directiva</strong>.
                      Apenas sea aprobada recibirás tu código de 6 dígitos y tus credenciales en{' '}
                      <strong className="text-[#e5b32a]">{email}</strong>.
                    </>
                  ) : (
                    <>
                      Tu solicitud ya llegó al panel de administración de{' '}
                      <strong className="text-white">{folioEnviado.sindicatoNombre}</strong>. Apenas la
                      directiva valide tu RUT y la apruebe, recibirás tu código de 6 dígitos y tus credenciales en{' '}
                      <strong className="text-[#e5b32a]">{email}</strong>.
                    </>
                  )}
                </p>
              </div>

              <div className="bg-[#090b10] border border-[#232a3b] rounded-xl p-4 text-xs space-y-2.5">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Organización:</span>
                  <span className="text-white font-semibold text-right">
                    #{folioEnviado.sindicatoId} {folioEnviado.sindicatoNombre}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Postulante:</span>
                  <span className="text-white font-medium text-right">{fullName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">RUT enviado:</span>
                  <span className="text-slate-200 font-mono">{rut}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Rol solicitado:</span>
                  <span className="text-[#e5b32a] font-semibold uppercase font-mono">
                    {folioEnviado.rolEnviado === 'admin'
                      ? 'Presidente / Directiva'
                      : 'Socio Trabajador'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 border-t border-white/[0.06] pt-2.5">
                  <span className="text-slate-400">Fecha de ingreso:</span>
                  <span className="text-slate-300 font-mono">{folioEnviado.fecha}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <Link
                  href="/"
                  className="flex-1 py-3 rounded-xl bg-[#e5b32a] hover:bg-[#f0c038] text-[#090b10] font-bold text-xs sm:text-sm text-center transition-colors"
                >
                  Ir al Portal e Iniciar Sesión
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setFolioEnviado(null);
                    setFullName('');
                    setRut('');
                    setTelefono('');
                    setEmail('');
                  }}
                  className="py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-slate-200 cursor-pointer"
                >
                  Nueva postulación
                </button>
              </div>
            </motion.div>
          ) : (
            /* ================= MÓDULO PRINCIPAL 2 COLUMNAS ================= */
            <motion.div
              key="formulario"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* ── COLUMNA IZQUIERDA (5 cols): FICHA DEL SINDICATO + PROGRESO + PASOS ── */}
              <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e5b32a]/10 border border-[#e5b32a]/30 text-[#f3c64f] text-[11px] font-semibold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e5b32a]" />
                    Incorporación Multi-Sindicato
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                    Postula a tu sindicato por{' '}
                    <span className="text-[#e5b32a]">ID oficial</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Ingresa el número identificador (#ID) que te entregó tu directiva o elige tu
                    organización de la lista para solicitar tu cuenta digital.
                  </p>
                </div>

                {/* Tarjeta Dinámica de Vista Previa del Sindicato */}
                <div className="bg-[#111520] border border-[#252e42] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      Organización Destino
                    </span>
                    {sindicatoActual ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Verificado
                      </span>
                    ) : buscandoId ? (
                      <span className="text-[11px] font-mono text-[#e5b32a]">Buscando...</span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-500">Sin seleccionar</span>
                    )}
                  </div>

                  {sindicatoActual ? (
                    <motion.div
                      key={sindicatoActual.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-3.5">
                        {sindicatoActual.logo_url ? (
                          <img
                            src={sindicatoActual.logo_url}
                            alt={sindicatoActual.nombre}
                            className="w-12 h-12 rounded-xl object-cover border border-white/10 bg-[#090b10]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#e5b32a]/15 border border-[#e5b32a]/35 text-[#e5b32a] font-bold text-sm flex items-center justify-center shrink-0">
                            #{sindicatoActual.id}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[#e5b32a]">
                              ID #{sindicatoActual.id}
                            </span>
                            {sindicatoActual.plan_activo && (
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300">
                                {sindicatoActual.plan_activo}
                              </span>
                            )}
                          </div>
                          <h2 className="text-base font-bold text-white truncate">
                            {sindicatoActual.nombre}
                          </h2>
                          {sindicatoActual.rut_sindicato && (
                            <p className="text-xs font-mono text-slate-400">
                              RUT {sindicatoActual.rut_sindicato}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/[0.07]">
                        <p className="text-[11px] text-slate-400 mb-2">
                          Acceso incluido al ser aprobado:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {modulosSindicato.slice(0, 6).map((mod) => (
                            <span
                              key={mod}
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#090b10] border border-[#232a3b] text-slate-200"
                            >
                              <span className="text-[#e5b32a] mr-1">✓</span>
                              {mod}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="py-5 text-center border border-dashed border-[#252e42] rounded-xl bg-[#0b0e15] px-4">
                      <p className="text-xs text-slate-300 font-medium">
                        Selecciona un sindicato o escribe su ID en el formulario
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Aquí verás su ficha verificada y los beneficios habilitados.
                      </p>
                    </div>
                  )}
                </div>

                {/* Barra de Progreso en Vivo */}
                <div className="bg-[#111520] border border-[#252e42] rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">Progreso de tu solicitud</span>
                    <span className="font-mono font-bold text-[#e5b32a]">{porcentajeProgreso}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#090b10] overflow-hidden border border-white/[0.05]">
                    <div
                      className="h-full bg-gradient-to-r from-[#d49d12] to-[#f3c64f] rounded-full transition-all duration-300"
                      style={{ width: `${porcentajeProgreso}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {porcentajeProgreso === 100
                      ? 'Todo listo. Ya puedes enviar tu postulación a revisión.'
                      : 'Completa los campos obligatorios para habilitar el envío.'}
                  </p>
                </div>

                {/* Mini guía de qué pasa después */}
                <div className="hidden lg:block bg-[#111520]/60 border border-white/[0.06] rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-semibold text-white">¿Cómo funciona la aprobación?</p>
                  <div className="space-y-2.5 text-xs text-slate-400">
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono text-[#e5b32a] font-bold">01</span>
                      <span>Tu solicitud entra al padrón del sindicato elegido y al panel SuperAdmin.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono text-[#e5b32a] font-bold">02</span>
                      <span>La directiva (o SuperAdmin si postulas a Presidente) verifica y aprueba tu RUT.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono text-[#e5b32a] font-bold">03</span>
                      <span>Recibes tu código de 6 dígitos y clave temporal por correo para entrar con tu RUT.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── COLUMNA DERECHA (7 cols): FORMULARIO MODULAR DE POSTULACIÓN ── */}
              <div className="lg:col-span-7 bg-[#111520] border border-[#252e42] rounded-2xl p-6 sm:p-8 shadow-2xl">
                <div className="pb-5 mb-6 border-b border-white/[0.07]">
                  <h2 className="text-lg font-bold text-white">Formulario de Ingreso</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Todos los datos se envían directamente al panel de revisión del sindicato seleccionado para su aprobación.
                  </p>
                </div>

                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/35 text-rose-200 text-xs flex items-start gap-2.5 leading-relaxed"
                  >
                    <span className="shrink-0">⚠️</span>
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                {avisoId && (
                  <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/35 text-amber-200 text-xs leading-relaxed">
                    {avisoId}
                  </div>
                )}

                <form onSubmit={handlePostular} className="space-y-6">
                  {/* BLOQUE 1: IDENTIFICACIÓN DEL SINDICATO POR ID O LISTA */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-200">
                      1. Identifica tu Sindicato (por ID o nombre)
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-4 relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#e5b32a]">
                          ID #
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Ej: 1"
                          value={busquedaIdInput}
                          onChange={(e) => handleBuscarPorId(e.target.value)}
                          className="w-full bg-[#090b10] border border-[#2c354b] rounded-xl pl-11 pr-3 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#e5b32a] transition-colors"
                        />
                      </div>

                      <div className="sm:col-span-8">
                        <select
                          required
                          disabled={cargandoSindicatos}
                          value={sindicatoId}
                          onChange={(e) => handleSelectSindicato(e.target.value)}
                          className="w-full bg-[#090b10] border border-[#2c354b] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#e5b32a] transition-colors cursor-pointer"
                        >
                          <option value="" disabled>
                            {cargandoSindicatos
                              ? 'Cargando sindicatos verificados...'
                              : 'Selecciona una organización activa...'}
                          </option>
                          {sindicatos.map((s) => (
                            <option key={s.id} value={s.id}>
                              #{s.id} — {s.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* BLOQUE 2: TARJETAS VISUALES DE ROL */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-200">
                      2. Rol al que postulas
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRolSolicitado('socio')}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          rolSolicitado === 'socio'
                            ? 'bg-[#e5b32a]/10 border-[#e5b32a]/60'
                            : 'bg-[#090b10] border-[#252e42] hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">Socio Trabajador</span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                              rolSolicitado === 'socio'
                                ? 'border-[#e5b32a] bg-[#e5b32a] text-[#090b10] font-bold'
                                : 'border-slate-600'
                            }`}
                          >
                            {rolSolicitado === 'socio' ? '✓' : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                          Acceso a convenios, credencial QR, votaciones y actas oficiales.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRolSolicitado('admin')}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          rolSolicitado === 'admin'
                            ? 'bg-[#e5b32a]/10 border-[#e5b32a]/60'
                            : 'bg-[#090b10] border-[#252e42] hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">Directiva / Presidente</span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                              rolSolicitado === 'admin'
                                ? 'border-[#e5b32a] bg-[#e5b32a] text-[#090b10] font-bold'
                                : 'border-slate-600'
                            }`}
                          >
                            {rolSolicitado === 'admin' ? '✓' : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                          Gestión de padrón y asambleas. Requiere validación del SuperAdmin.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* BLOQUE 3: DATOS PERSONALES */}
                  <div className="space-y-4">
                    <label className="block text-xs font-semibold text-slate-200">
                      3. Tus datos personales
                    </label>

                    <div>
                      <span className="block text-[11px] text-slate-400 mb-1.5">Nombre Completo</span>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ej: María González Rojas"
                        className="w-full bg-[#090b10] border border-[#2c354b] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#e5b32a] transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-slate-400">RUT (sin puntos, con guion)</span>
                          {rutCleanLength >= 8 && (
                            <span className="text-[11px] font-semibold text-emerald-400">
                              ✓ Formato listo
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={10}
                          value={rut}
                          onChange={(e) => {
                            setRut(formatRutSinPuntos(e.target.value));
                            if (errorMsg) setErrorMsg('');
                          }}
                          placeholder="20386773-2"
                          className={`w-full bg-[#090b10] border rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none transition-colors ${
                            rutValido
                              ? 'border-emerald-500/50'
                              : 'border-[#2c354b] focus:border-[#e5b32a]'
                          }`}
                        />
                      </div>

                      <div>
                        <span className="block text-[11px] text-slate-400 mb-1.5">
                          Teléfono de contacto
                        </span>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                            +56
                          </span>
                          <input
                            type="tel"
                            required
                            maxLength={11}
                            value={telefono}
                            onChange={(e) => setTelefono(formatTelefonoChileno(e.target.value))}
                            placeholder="9 8765 4321"
                            className="w-full bg-[#090b10] border border-[#2c354b] rounded-xl pl-12 pr-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#e5b32a] transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] text-slate-400 mb-1.5">
                        Correo Electrónico (aquí llegarán tus credenciales)
                      </span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nombre@gmail.com"
                        className="w-full bg-[#090b10] border border-[#2c354b] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#e5b32a] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Declaración de veracidad */}
                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#090b10] border border-white/[0.06] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aceptaDeclaracion}
                      onChange={(e) => setAceptaDeclaracion(e.target.checked)}
                      className="mt-0.5 accent-[#e5b32a] w-4 h-4 shrink-0 cursor-pointer"
                    />
                    <span className="text-xs text-slate-300 leading-relaxed">
                      Confirmo que mis datos son reales y autorizo a la directiva del sindicato
                      seleccionado a verificar mi afiliación y emitir mis credenciales de acceso.
                    </span>
                  </label>

                  {/* Botón Enviar */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#e5b32a] hover:bg-[#f0c038] disabled:opacity-50 text-[#090b10] font-bold text-sm transition-colors cursor-pointer shadow-lg shadow-[#e5b32a]/10"
                  >
                    {loading
                      ? 'Registrando postulación...'
                      : sindicatoActual
                      ? `Enviar Postulación a #${sindicatoActual.id} ${sindicatoActual.nombre} →`
                      : 'Enviar Postulación →'}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>¿Ya tienes cuenta activa?</span>
                  <Link href="/" className="text-[#e5b32a] font-semibold hover:underline">
                    Iniciar sesión con mi RUT →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function PostularPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090b10] flex items-center justify-center">
          <div className="w-7 h-7 border-2 border-white/20 border-t-[#e5b32a] rounded-full animate-spin" />
        </div>
      }
    >
      <PostularContent />
    </Suspense>
  );
}