'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../lib/supabase';
import { PLANES_SAAS, PlanId, DefinicionPlan, ETIQUETAS_MODULOS } from '../lib/planes';

function formatearRut(valor: string): string {
  const clean = valor.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${clean.slice(-1)}`;
}

function PlanesContent() {
  const searchParams = useSearchParams();

  const [ciclo, setCiclo] = useState<'mensual' | 'anual'>('mensual');
  const [planElegido, setPlanElegido] = useState<DefinicionPlan | null>(null);
  const [redirigiendoWebpay, setRedirigiendoWebpay] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    usuario_nombre: '',
    usuario_rut: '',
    usuario_email: '',
    nombre_sindicato: '',
    rut_sindicato: '',
  });

  // Si llega desde la landing con ?plan=trial|basico|estandar|premium, abre el modal al tiro
  useEffect(() => {
    const paramPlan = searchParams.get('plan') as PlanId | null;
    if (paramPlan && PLANES_SAAS[paramPlan]) {
      setPlanElegido(PLANES_SAAS[paramPlan]);
    }
  }, [searchParams]);

  const calcularMontoPlan = (plan: DefinicionPlan) => {
    if (plan.esTrial) return 50; // Cargo simbólico $50 CLP requerido por API Webpay Plus (reembolsable)
    return ciclo === 'anual' ? plan.precioMensual * 10 : plan.precioMensual;
  };

  const abrirCheckout = (id: PlanId) => {
    setErrorMsg('');
    setPlanElegido(PLANES_SAAS[id]);
  };

  const handlePagarConWebpay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planElegido) return;
    setErrorMsg('');

    if (!form.usuario_email.includes('@')) {
      setErrorMsg('Ingresa un correo electrónico válido (Gmail).');
      return;
    }

    setRedirigiendoWebpay(true);

    try {
      const ordenNumero = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const sessionId = `SES-${Date.now()}`;
      const montoWebpay = calcularMontoPlan(planElegido);

      // 1. Crear transacción real en Transbank Webpay Plus Integración
      const resTbk = await fetch('/api/webpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyOrder: ordenNumero,
          sessionId,
          amount: montoWebpay,
        }),
      });

      const tbkData = await resTbk.json();
      if (!resTbk.ok || !tbkData?.url || !tbkData?.token) {
        throw new Error(tbkData?.error || 'No se pudo iniciar la sesión de Webpay.');
      }

      // 2. Guardar orden preliminar en Supabase vinculada al token de Webpay
      const supabase = createClient();
      const rutAdminLimpio = form.usuario_rut.replace(/[^0-9kK]/g, '').toUpperCase();
      const nombrePlanConCiclo = planElegido.esTrial
        ? planElegido.nombre
        : `${planElegido.nombre} (${ciclo === 'anual' ? 'Anual' : 'Mensual'})`;

      const { error: dbErr } = await supabase.from('solicitudes_planes').insert([{
        orden_numero: ordenNumero,
        webpay_token: tbkData.token,
        plan_id: planElegido.id,
        plan_nombre: nombrePlanConCiclo,
        monto_pagado: planElegido.esTrial ? 0 : montoWebpay,
        es_trial: planElegido.esTrial,
        usuario_nombre: form.usuario_nombre.trim(),
        usuario_rut: rutAdminLimpio,
        usuario_email: form.usuario_email.trim().toLowerCase(),
        nombre_sindicato: form.nombre_sindicato.trim(),
        rut_sindicato: form.rut_sindicato.trim(),
        tarjeta_marca: 'Webpay Plus',
        comprobante_ref: 'INICIADO-WEBPAY',
        estado: 'Esperando Webpay',
      }]);

      if (dbErr) throw dbErr;

      // 3. Redirección oficial por POST con token_ws hacia la pasarela de Webpay Plus
      const formPost = document.createElement('form');
      formPost.method = 'POST';
      formPost.action = tbkData.url;

      const inputToken = document.createElement('input');
      inputToken.type = 'hidden';
      inputToken.name = 'token_ws';
      inputToken.value = tbkData.token;

      formPost.appendChild(inputToken);
      document.body.appendChild(formPost);
      formPost.submit();
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al conectar con Webpay.');
      setRedirigiendoWebpay(false);
    }
  };

  const niveles: DefinicionPlan[] = [
    PLANES_SAAS.basico,
    PLANES_SAAS.estandar,
    PLANES_SAAS.premium,
  ];

  return (
    <div className="min-h-screen bg-[#0b0d12] text-slate-100 font-sans">
      {/* Navbar */}
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#e5b32a] text-slate-950 font-bold text-xs flex items-center justify-center">
            PYC
          </div>
          <span className="font-semibold text-sm text-white tracking-tight">Sindicato PYC</span>
        </Link>

        <div className="hidden sm:flex items-center gap-7 text-xs text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
          <Link href="/#nosotros" className="hover:text-white transition-colors">Nosotros</Link>
          <Link href="/#trial" className="hover:text-white transition-colors">Trial 30 días</Link>
          <span className="text-[#e5b32a] font-medium">Planes</span>
        </div>

        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-[#e5b32a] hover:bg-[#f0c038] text-slate-950 font-semibold text-xs transition-colors"
        >
          Ingresar
        </Link>
      </nav>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-6 py-14 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e5b32a]">
            Para Dirigentes
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Digitaliza tu sindicato sin complicaciones
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Procesa tu orden de forma segura mediante <strong className="text-white">Webpay Plus (Transbank)</strong> y recibe tus credenciales oficiales por Gmail.
          </p>

          {/* Toggle Mensual / Anual */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#11141d] border border-white/[0.08] mt-3">
            <button
              type="button"
              onClick={() => setCiclo('mensual')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                ciclo === 'mensual' ? 'bg-[#e5b32a] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pago mensual
            </button>
            <button
              type="button"
              onClick={() => setCiclo('anual')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
                ciclo === 'anual' ? 'bg-[#e5b32a] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Pago anual</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  ciclo === 'anual' ? 'bg-slate-950/20 text-slate-950' : 'bg-[#e5b32a]/15 text-[#e5b32a]'
                }`}
              >
                2 meses gratis
              </span>
            </button>
          </div>
        </div>

        {/* Banner Trial */}
        <div className="bg-[#121620] border border-[#e5b32a]/35 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#e5b32a]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e5b32a]" />
              <span>Promoción Trial · Webpay Verificado</span>
            </div>
            <h2 className="text-base font-semibold text-white">Prueba gratis por 30 días</h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Valida tu medio de pago con Webpay Plus ($50 CLP simbólicos reembolsables). Incluye 1 administrador único, hasta 20 socios y módulos esenciales.
            </p>
          </div>
          <button
            onClick={() => abrirCheckout('trial')}
            className="px-5 py-2.5 rounded-lg bg-[#e5b32a]/15 hover:bg-[#e5b32a]/25 text-[#e5b32a] border border-[#e5b32a]/40 font-semibold text-xs transition-colors shrink-0 cursor-pointer"
          >
            Activar Trial con Webpay
          </button>
        </div>

        {/* 3 Niveles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {niveles.map((plan) => {
            const precioMostrado =
              ciclo === 'anual' ? plan.precioMensual * 10 : plan.precioMensual;
            const ahorroAnual = plan.precioMensual * 2;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 flex flex-col justify-between border transition-colors ${
                  plan.destacado
                    ? 'bg-[#131722] border-[#e5b32a]/60 shadow-2xl shadow-[#e5b32a]/5'
                    : 'bg-[#10131b] border-white/[0.08]'
                }`}
              >
                {plan.destacado && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#e5b32a] text-slate-950 text-[10px] font-bold">
                    Más popular
                  </span>
                )}

                <div className="space-y-5">
                  <div>
                    <h3 className="text-base font-semibold text-white">{plan.nombre}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{plan.descripcion}</p>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white tracking-tight">
                        ${precioMostrado.toLocaleString('es-CL')}
                      </span>
                      <span className="text-xs text-slate-400">
                        /{ciclo === 'anual' ? 'año' : 'mes'}
                      </span>
                    </div>
                    {ciclo === 'anual' && (
                      <p className="text-[11px] text-emerald-400 mt-1">
                        Ahorras ${ahorroAnual.toLocaleString('es-CL')} al año
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => abrirCheckout(plan.id)}
                    className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      plan.destacado
                        ? 'bg-[#e5b32a] hover:bg-[#f0c038] text-slate-950'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10'
                    }`}
                  >
                    Pagar {plan.nombre} con Webpay
                  </button>

                  <ul className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="text-[#e5b32a] mt-0.5">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5 mt-5 border-t border-white/[0.06]">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Módulos incluidos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(plan.modulos_activos)
                      .filter(([, activo]) => activo)
                      .map(([key]) => (
                        <span
                          key={key}
                          className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06]"
                        >
                          {ETIQUETAS_MODULOS[key] || key}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-4">
          <Link href="/validar-sindicato" className="text-xs text-slate-400 hover:text-[#e5b32a] transition-colors">
            ¿Ya recibiste tus credenciales en Gmail? Activar sindicato aquí →
          </Link>
        </div>
      </main>

      {/* Modal Checkout conectado a Webpay Plus */}
      {planElegido && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => !redirigiendoWebpay && setPlanElegido(null)}
        >
          <div
            className="w-full max-w-lg bg-[#11141d] border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-white/[0.07] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#e5b32a]">
                  Orden vía Webpay Plus (Transbank)
                </span>
                <h3 className="text-base font-semibold text-white mt-0.5">
                  {planElegido.nombre} —{' '}
                  {planElegido.esTrial
                    ? '$50 validación ($0 mensual / 30 días)'
                    : `$${calcularMontoPlan(planElegido).toLocaleString('es-CL')} CLP (${ciclo})`}
                </h3>
              </div>
              <button
                onClick={() => !redirigiendoWebpay && setPlanElegido(null)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handlePagarConWebpay} className="space-y-3 text-xs">
              <p className="text-[11px] text-slate-400 font-medium">1. Administrador / Presidente</p>
              <input
                required
                placeholder="Nombre completo"
                value={form.usuario_nombre}
                onChange={(e) => setForm({ ...form, usuario_nombre: e.target.value })}
                className="w-full bg-[#090b10] border border-white/10 rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:border-[#e5b32a]"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  required
                  maxLength={12}
                  placeholder="RUT (12.345.678-9)"
                  value={form.usuario_rut}
                  onChange={(e) => setForm({ ...form, usuario_rut: formatearRut(e.target.value) })}
                  className="w-full bg-[#090b10] border border-white/10 rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:border-[#e5b32a]"
                />
                <input
                  required
                  type="email"
                  placeholder="Correo Gmail"
                  value={form.usuario_email}
                  onChange={(e) => setForm({ ...form, usuario_email: e.target.value })}
                  className="w-full bg-[#090b10] border border-white/10 rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:border-[#e5b32a]"
                />
              </div>

              <p className="text-[11px] text-slate-400 font-medium pt-1">2. Organización Sindical</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  required
                  placeholder="Nombre del sindicato"
                  value={form.nombre_sindicato}
                  onChange={(e) => setForm({ ...form, nombre_sindicato: e.target.value })}
                  className="w-full bg-[#090b10] border border-white/10 rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:border-[#e5b32a]"
                />
                <input
                  required
                  maxLength={12}
                  placeholder="RUT Sindicato (76.123.456-K)"
                  value={form.rut_sindicato}
                  onChange={(e) => setForm({ ...form, rut_sindicato: formatearRut(e.target.value) })}
                  className="w-full bg-[#090b10] border border-white/10 rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:border-[#e5b32a]"
                />
              </div>

              {/* Aviso Pasarela Webpay Plus */}
              <div className="p-3.5 rounded-xl bg-[#090b10] border border-white/[0.08] space-y-1.5 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Pasarela Segura Webpay Plus</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                    Transbank API
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Al continuar serás redirigido a <strong className="text-slate-200">Webpay Plus</strong> para pagar con Redcompra, Débito, Crédito o Prepago. Al aprobarse, tu orden llegará al SuperAdmin para emitir tus credenciales por Gmail.
                </p>
              </div>

              <button
                type="submit"
                disabled={redirigiendoWebpay}
                className="w-full py-3 mt-2 rounded-lg bg-[#e5b32a] hover:bg-[#f0c038] disabled:opacity-50 text-slate-950 font-semibold transition-colors cursor-pointer"
              >
                {redirigiendoWebpay
                  ? 'Conectando con Webpay Plus...'
                  : `Ir a Webpay Plus ($${calcularMontoPlan(planElegido).toLocaleString('es-CL')} CLP) →`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlanesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0d12]" />}>
      <PlanesContent />
    </Suspense>
  );
}