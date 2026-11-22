'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../lib/supabase';
import { ETIQUETAS_MODULOS } from '../lib/planes';

function ValidarSindicatoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Paso 1: Credenciales cifradas del Sindicato (Compuerta obligatoria)
  const [sid, setSid] = useState('');
  const [codigo, setCodigo] = useState('');
  const [verCodigo, setVerCodigo] = useState(false);

  // Paso 2: Credenciales del Administrador (solo se habilitan tras superar Bcrypt)
  const [identificadorAdmin, setIdentificadorAdmin] = useState(''); // Acepta Correo o RUT
  const [adminPassword, setAdminPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);

  const [verificando, setVerificando] = useState(false);
  const [activando, setActivando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoValidacion, setInfoValidacion] = useState<any>(null);
  const [activadoOk, setActivadoOk] = useState(false);

  // Si llega desde el enlace de Gmail (?sid=2), precarga SOLO el ID para que ingrese su código privado
  useEffect(() => {
    const paramSid = searchParams.get('sid') || '';
    if (paramSid) {
      setSid(paramSid);
    }
  }, [searchParams]);

  // PASO 1: Validar código contra el hash Bcrypt en Supabase
  const handleVerificarCodigoSindicato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sid.trim() || !codigo.trim()) {
      setErrorMsg('Ingresa el ID del sindicato y el código de activación.');
      return;
    }

    setVerificando(true);
    setErrorMsg('');

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('obtener_validacion_sindicato', {
        p_sindicato_id: Number(sid),
        p_codigo: codigo.trim().toUpperCase(),
      });

      if (error) throw error;

      if (!data?.ok) {
        setInfoValidacion(null);
        setErrorMsg(data?.error || 'Código de validación incorrecto o ya utilizado.');
      } else {
        setInfoValidacion(data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al verificar el código del sindicato.');
    } finally {
      setVerificando(false);
    }
  };

  // PASO 2: Solo accesible tras superar Paso 1 -> valida credenciales de Admin y activa el sindicato
  const handleConfirmarActivacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoValidacion) return;

    setErrorMsg('');
    setActivando(true);

    try {
      const supabase = createClient();
      const entrada = identificadorAdmin.trim();
      let emailParaAuth = entrada.toLowerCase();

      // Si el usuario ingresó su RUT en vez de correo, lo resolvemos igual que en el login
      if (!entrada.includes('@')) {
        const rutLimpio = entrada.replace(/[^0-9kK]/g, '').toUpperCase();
        if (rutLimpio.length < 8) {
          throw new Error('Ingresa un correo válido o un RUT completo (ej: 12.345.678-5).');
        }

        const { data: rpcEmail } = await supabase.rpc('get_email_por_rut', {
          p_rut: rutLimpio,
        });

        if (rpcEmail) {
          emailParaAuth = String(rpcEmail).toLowerCase();
        } else {
          const rutConGuion = `${rutLimpio.slice(0, -1)}-${rutLimpio.slice(-1)}`;
          const { data: matchProfile } = await supabase
            .from('profiles')
            .select('email')
            .or(`rut.eq.${rutLimpio},rut.eq.${rutConGuion},rut.eq.${entrada}`)
            .limit(1)
            .maybeSingle();

          if (!matchProfile?.email) {
            throw new Error('No encontramos un administrador registrado con ese RUT.');
          }
          emailParaAuth = String(matchProfile.email).toLowerCase();
        }
      }

      // 1. Autenticar con Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: emailParaAuth,
        password: adminPassword,
      });

      if (authErr || !authData.user) {
        throw new Error('Las credenciales de administrador no coinciden con las enviadas a tu correo.');
      }

      // 2. Re-verificar Bcrypt en servidor, validar pertenencia al sindicato y activar definitivamente
      const { data: res, error: rpcErr } = await supabase.rpc('activar_sindicato_por_codigo', {
        p_sindicato_id: Number(infoValidacion.sindicato_id),
        p_codigo: codigo.trim().toUpperCase(),
        p_user_id: authData.user.id,
      });

      if (rpcErr || !res?.ok) {
        await supabase.auth.signOut();
        throw new Error(
          res?.error || rpcErr?.message || 'No se pudo activar el sindicato con esta cuenta.'
        );
      }

      // 3. Fijar cookies y sindicato activo para entrar al Panel Admin
      document.cookie = `sb-sindicato-session=${authData.user.email}; path=/; max-age=86400`;
      document.cookie = `sb-sindicato-rol=admin; path=/; max-age=86400`;
      localStorage.setItem('sindicato_activo', String(infoValidacion.sindicato_id));

      setActivadoOk(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al activar el sindicato.');
    } finally {
      setActivando(false);
    }
  };

  const modulosIncluidos = infoValidacion?.modulos_activos
    ? Object.entries(infoValidacion.modulos_activos)
        .filter(([, activo]) => Boolean(activo))
        .map(([k]) => ETIQUETAS_MODULOS[k] || k)
    : [];

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#11141d] border border-[#252e42] rounded-2xl p-6 sm:p-7 space-y-6 shadow-2xl">
        {/* Cabecera + Indicador de pasos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#e5b32a]">
              Validación Segura · Bcrypt
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.06] text-slate-300">
              {activadoOk ? 'Completado' : infoValidacion ? 'Paso 2 de 2' : 'Paso 1 de 2'}
            </span>
          </div>

          <h1 className="text-xl font-bold text-white">
            {activadoOk
              ? 'Organización Activada'
              : infoValidacion
              ? 'Acceso del Administrador'
              : 'Validar Sindicato'}
          </h1>

          {/* Barra de progreso visual */}
          <div className="grid grid-cols-2 gap-2">
            <div className="h-1.5 rounded-full bg-[#e5b32a]" />
            <div
              className={`h-1.5 rounded-full transition-colors ${
                infoValidacion || activadoOk ? 'bg-emerald-400' : 'bg-white/10'
              }`}
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/35 text-rose-200 text-xs leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* ================= ESTADO FINAL: ACTIVADO ================= */}
        {activadoOk ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">
                ¡{infoValidacion?.nombre_sindicato} ya está activo!
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tu sindicato <strong className="text-[#e5b32a]">ID #{infoValidacion?.sindicato_id}</strong> fue validado, el código de un solo uso fue destruido por seguridad y ya tienes habilitado tu Panel de Administrador.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/admin')}
              className="w-full py-3 rounded-xl bg-[#e5b32a] hover:bg-[#f0c038] text-slate-950 font-bold text-sm cursor-pointer transition-colors"
            >
              Entrar a mi Panel de Administrador →
            </button>
          </div>
        ) : !infoValidacion ? (
          /* ================= PASO 1: VALIDAR SINDICATO (BCRYPT) ================= */
          <form onSubmit={handleVerificarCodigoSindicato} className="space-y-4 text-sm">
            <p className="text-xs text-slate-300 leading-relaxed">
              Antes de poder ingresar con tus credenciales de administrador, valida el código cifrado que recibiste en el <strong className="text-white">Paso 1 de tu correo</strong>.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                ID del Sindicato
              </label>
              <input
                required
                type="number"
                placeholder="Ej: 2"
                value={sid}
                onChange={(e) => {
                  setSid(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                className="w-full bg-[#090b10] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#e5b32a]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Código de Activación Privado
              </label>
              <div className="relative">
                <input
                  required
                  type={verCodigo ? 'text' : 'password'}
                  autoComplete="off"
                  placeholder="••••••••••"
                  value={codigo}
                  onChange={(e) => {
                    setCodigo(e.target.value.toUpperCase());
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full bg-[#090b10] border border-[#2c354b] rounded-xl px-3.5 py-2.5 pr-16 text-white font-mono tracking-widest focus:outline-none focus:border-[#e5b32a]"
                />
                <button
                  type="button"
                  onClick={() => setVerCodigo((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  {verCodigo ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Se verifica de forma cifrada (Bcrypt) y se invalida automáticamente al completar la activación.
              </p>
            </div>

            <button
              type="submit"
              disabled={verificando}
              className="w-full py-3 rounded-xl bg-[#e5b32a] hover:bg-[#f0c038] text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-50 transition-colors"
            >
              {verificando ? 'Verificando hash Bcrypt...' : 'Validar Sindicato y Continuar →'}
            </button>
          </form>
        ) : (
          /* ================= PASO 2: CREDENCIALES DEL ADMINISTRADOR ================= */
          <form onSubmit={handleConfirmarActivacion} className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-[#090b10] border border-emerald-500/35 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-400">
                  ✓ Sindicato verificado
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#e5b32a]/15 text-[#e5b32a]">
                  ID #{infoValidacion.sindicato_id}
                </span>
              </div>

              <div>
                <p className="font-bold text-white text-base">{infoValidacion.nombre_sindicato}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Orden {infoValidacion.orden_numero} • Plan {infoValidacion.plan_nombre}
                </p>
              </div>

              {modulosIncluidos.length > 0 && (
                <div className="pt-2 border-t border-white/[0.07]">
                  <span className="text-[11px] text-slate-400 block mb-1.5">
                    Módulos habilitados para tu plan:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {modulosIncluidos.map((m) => (
                      <span
                        key={m}
                        className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      >
                        ✓ {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ahora ingresa las credenciales del <strong className="text-white">Administrador Único</strong> recibidas en el Paso 2 de tu correo para activar el panel.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Correo o RUT del Administrador
              </label>
              <input
                required
                type="text"
                autoComplete="username"
                placeholder="Ej: correo@gmail.com o 12.345.678-5"
                value={identificadorAdmin}
                onChange={(e) => {
                  setIdentificadorAdmin(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                className="w-full bg-[#090b10] border border-[#2c354b] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#e5b32a]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Contraseña del Administrador
              </label>
              <div className="relative">
                <input
                  required
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full bg-[#090b10] border border-[#2c354b] rounded-xl px-3.5 py-2.5 pr-16 text-white focus:outline-none focus:border-[#e5b32a]"
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  {verPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={activando}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#08130e] font-bold text-sm cursor-pointer disabled:opacity-50 transition-colors"
            >
              {activando ? 'Activando sindicato...' : 'Activar Sindicato y Entrar al Panel →'}
            </button>

            <button
              type="button"
              onClick={() => {
                setInfoValidacion(null);
                setErrorMsg('');
              }}
              className="w-full py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ← Volver al Paso 1
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-white/[0.07] text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Volver al inicio y login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ValidarSindicatoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090b10]" />}>
      <ValidarSindicatoContent />
    </Suspense>
  );
}