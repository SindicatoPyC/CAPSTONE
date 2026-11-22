'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function RetornoWebpayContent() {
  const params = useSearchParams();
  const status = params.get('status') || 'error';
  const orden = params.get('orden') || 'N/A';
  const auth = params.get('auth') || '';
  const last4 = params.get('last4') || '';
  const monto = Number(params.get('monto') || 0);
  const marca = params.get('marca') || 'Webpay Plus';

  const ok = status === 'aprobado';

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#11141d] border border-white/10 rounded-2xl p-7 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div
            className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl border ${
              ok
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}
          >
            {ok ? '✓' : '✕'}
          </div>

          <span
            className={`text-[10px] font-mono uppercase tracking-widest block ${
              ok ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {ok
              ? 'Pago Autorizado por Webpay Plus'
              : status === 'anulado'
              ? 'Transacción Anulada'
              : 'Pago Rechazado'}
          </span>

          <h1 className="text-xl font-semibold text-white">
            {ok ? `Orden ${orden}` : 'No se pudo completar el pago'}
          </h1>
        </div>

        {ok ? (
          <>
            <div className="bg-[#090b10] border border-white/[0.08] rounded-xl p-4 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400">N° de Orden:</span>
                <span className="text-white font-mono font-semibold">{orden}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cód. Autorización TBK:</span>
                <span className="text-emerald-400 font-mono">{auth || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Medio de Pago:</span>
                <span className="text-white font-mono">
                  {marca} {last4 ? `•••• ${last4}` : ''}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/[0.06] pt-2.5">
                <span className="text-slate-400">Monto Webpay:</span>
                <span className="text-[#e5b32a] font-mono font-semibold">
                  ${monto.toLocaleString('es-CL')} CLP
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#e5b32a]/10 border border-[#e5b32a]/25 text-xs text-slate-300 leading-relaxed">
              <strong className="text-[#f3c64f] block mb-1">¿Qué sigue ahora?</strong>
              Tu orden ya quedó registrada en el panel del <strong>SuperAdmin</strong>. Apenas valide la transacción, recibirás un correo en tu Gmail con:
              <ul className="mt-2 space-y-1 text-slate-400 list-disc list-inside">
                <li>Credenciales de tu Sindicato (ID y Código)</li>
                <li>Credenciales de tu cuenta Administrador</li>
                <li>Enlace único para activar tu plataforma</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className="w-full py-2.5 rounded-lg bg-[#e5b32a] hover:bg-[#f0c038] text-slate-950 font-semibold text-xs text-center transition-colors"
              >
                Volver al Inicio
              </Link>
              <Link
                href="/validar-sindicato"
                className="w-full py-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs text-center transition-colors"
              >
                ¿Ya te llegó el correo? Ir a Validar Sindicato →
              </Link>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              {status === 'anulado'
                ? 'Anulaste el pago antes de finalizar en Webpay. No se generó ningún cobro.'
                : 'El emisor de la tarjeta rechazó la transacción. Puedes reintentar con otra tarjeta.'}
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/planes"
                className="w-full py-2.5 rounded-lg bg-[#e5b32a] hover:bg-[#f0c038] text-slate-950 font-semibold text-xs text-center transition-colors"
              >
                Intentar nuevamente en Planes
              </Link>
              <Link
                href="/"
                className="w-full py-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs text-center transition-colors"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RetornoWebpayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090b10]" />}>
      <RetornoWebpayContent />
    </Suspense>
  );
}