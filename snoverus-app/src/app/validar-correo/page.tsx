'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../lib/supabase';

function formatRutLegible(raw?: string | null): string {
  const clean = String(raw || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return raw || '';
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

function ValidarCorreoContent() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [sindicatoParam, setSindicatoParam] = useState('');
  const [codigo, setCodigo] = useState('');
  const [validando, setValidando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [resultadoOk, setResultadoOk] = useState<{
    fullName: string;
    rut: string;
    email: string;
    sindicatoNombre: string;
    yaVerificado: boolean;
  } | null>(null);

  useEffect(() => {
    const paramEmail = searchParams.get('email') || '';
    const paramSind = searchParams.get('sindicato') || '';
    if (paramEmail) setEmail(paramEmail.trim().toLowerCase());
    if (paramSind) setSindicatoParam(paramSind.trim());
  }, [searchParams]);

  const handleValidar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const codigoLimpio = codigo.replace(/\s+/g, '').trim();
    if (!email.includes('@')) {
      setErrorMsg('Ingresa un correo electrónico válido.');
      return;
    }
    if (codigoLimpio.length < 6) {
      setErrorMsg('Ingresa el código completo de 6 dígitos que llegó a tu correo.');
      return;
    }

    setValidando(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('validar_correo_usuario', {
        p_email: email.trim().toLowerCase(),
        p_codigo: codigoLimpio,
      });

      if (error) throw error;
      if (!data?.ok) {
        setErrorMsg(data?.error || 'Código incorrecto o vencido.');
        return;
      }

      setResultadoOk({
        fullName: data.full_name || 'Socio',
        rut: data.rut || '',
        email: data.email || email,
        sindicatoNombre: data.sindicato_nombre || sindicatoParam || 'Tu Sindicato',
        yaVerificado: Boolean(data.ya_verificado),
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'No pudimos conectar con el servidor. Intenta nuevamente.');
    } finally {
      setValidando(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#090b10] text-slate-100 font-sans antialiased flex flex-col justify-between px-4 py-6 sm:py-10">
      {/* Cabecera compacta móvil */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#e5b32a] text-[#090b10] font-bold text-xs flex items-center justify-center">
            PYC
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Sindicato PYC</p>
            <p className="text-[11px] text-slate-400 leading-tight">Verificación de Correo</p>
          </div>
        </div>
        <Link
          href="/"
          className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-medium text-slate-200"
        >
          Inicio
        </Link>
      </header>

      {/* Tarjeta principal optimizada para pantalla táctil */}
      <main className="w-full max-w-md mx-auto my-auto">
        <div className="bg-[#111520] border border-[#252e42] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
          {resultadoOk ? (
            /* ================= CORREO VALIDADO CON ÉXITO ================= */
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-3xl">
                ✓
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 block">
                  {resultadoOk.yaVerificado ? 'Cuenta Ya Activa' : 'Correo Verificado'}
                </span>
                <h1 className="text-2xl font-bold text-white">
                  ¡Listo, {resultadoOk.fullName}!
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Tu cuenta en <strong className="text-white">{resultadoOk.sindicatoNombre}</strong> ya está activa. Ahora puedes entrar con tu RUT y la contraseña que recibiste en tu correo.
                </p>
              </div>

              <div className="bg-[#090b10] border border-[#232a3b] rounded-2xl p-4 text-left space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">Tu RUT de ingreso:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#e5b32a] text-base">
                      {formatRutLegible(resultadoOk.rut)}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copiarTextoSeguro(formatRutLegible(resultadoOk.rut));
                        if (ok) {
                          setCopiado(true);
                          setTimeout(() => setCopiado(false), 2500);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.08] text-[11px] font-semibold text-white cursor-pointer"
                    >
                      {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
                  <span className="text-xs text-slate-400">Correo validado:</span>
                  <span className="text-xs font-mono text-slate-200 truncate max-w-[200px]">
                    {resultadoOk.email}
                  </span>
                </div>
              </div>

              <Link
                href="/"
                className="block w-full py-4 rounded-2xl bg-[#e5b32a] active:scale-[0.99] text-[#090b10] font-bold text-base text-center transition-transform"
              >
                Ir a Iniciar Sesión →
              </Link>
            </div>
          ) : (
            /* ================= FORMULARIO MÓVIL DE VERIFICACIÓN ================= */
            <>
              <div className="space-y-2 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e5b32a]/15 border border-[#e5b32a]/35 text-[#f3c64f] text-[11px] font-semibold uppercase tracking-wider">
                  Validación Segura · Bcrypt
                </span>
                <h1 className="text-2xl font-bold text-white">Valida tu Correo</h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {sindicatoParam ? (
                    <>
                      Tu ingreso a <strong className="text-white">{sindicatoParam}</strong> fue aprobado. Ingresa el código de 6 dígitos de tu correo para activar tu cuenta.
                    </>
                  ) : (
                    'Ingresa tu correo y el código de 6 dígitos que recibiste al ser aprobado para activar tu acceso.'
                  )}
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-sm leading-snug">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleValidar} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="tucorreo@gmail.com"
                    className="w-full bg-[#090b10] border border-[#2c354b] rounded-2xl px-4 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-[#e5b32a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Código de verificación (6 dígitos)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    value={codigo}
                    onChange={(e) => {
                      setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6));
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="000000"
                    className="w-full bg-[#090b10] border border-[#2c354b] rounded-2xl px-4 py-4 text-center text-2xl font-mono font-bold tracking-[0.4em] text-[#e5b32a] placeholder-slate-600 focus:outline-none focus:border-[#e5b32a]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={validando}
                  className="w-full py-4 rounded-2xl bg-[#e5b32a] hover:bg-[#f0c038] active:scale-[0.99] disabled:opacity-50 text-[#090b10] font-bold text-base transition-all cursor-pointer"
                >
                  {validando ? 'Verificando código...' : 'Confirmar y Activar Cuenta →'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      <footer className="w-full max-w-md mx-auto text-center pt-5 text-xs text-slate-500">
        Sindicato PYC · Validación protegida de un solo uso
      </footer>
    </div>
  );
}

export default function ValidarCorreoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[#090b10] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-[#e5b32a] rounded-full animate-spin" />
        </div>
      }
    >
      <ValidarCorreoContent />
    </Suspense>
  );
}