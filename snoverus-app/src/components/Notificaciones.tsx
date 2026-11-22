'use client';

/**
 * Contenedor global de toasts (sonner) con el estilo del proyecto.
 * Se agrega UNA sola vez en src/app/layout.tsx, dentro de <body>.
 */
import { Toaster } from 'sonner';

export default function Notificaciones() {
  return (
    <Toaster
      position="top-right"
      theme="dark"
      closeButton
      duration={4000}
      offset={20}
      toastOptions={{
        classNames: {
          toast:
            '!bg-[#131c2e]/95 !backdrop-blur-xl !border !border-slate-700 !rounded-2xl !shadow-2xl !text-slate-100 !font-sans !gap-3 !p-4',
          title: '!text-[13px] !font-bold !leading-snug',
          description: '!text-xs !text-slate-400 !whitespace-pre-line',
          closeButton: '!bg-slate-800 !border-slate-700 !text-slate-300 hover:!bg-slate-700',
          success: '!border-emerald-500/40 [&_[data-icon]]:!text-emerald-400',
          error: '!border-rose-500/40 [&_[data-icon]]:!text-rose-400',
          warning: '!border-amber-500/40 [&_[data-icon]]:!text-amber-300',
          info: '!border-cyan-500/40 [&_[data-icon]]:!text-cyan-400',
        },
      }}
    />
  );
}
