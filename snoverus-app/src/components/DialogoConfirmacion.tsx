'use client';

/**
 * DialogoConfirmacion: reemplazo de window.confirm() y window.prompt()
 * con el estilo del proyecto.
 *
 * Confirmación simple (como confirm):
 *   <DialogoConfirmacion abierto={...} titulo="¿Eliminar convenio?" variante="peligro"
 *     textoConfirmar="Eliminar" onConfirmar={...} onCancelar={...} />
 *
 * Con un campo para escribir (como prompt):
 *   <DialogoConfirmacion abierto={...} titulo="Canjear beneficio"
 *     campo={{ etiqueta: 'Correo', tipo: 'email', valorInicial: correo }}
 *     onConfirmar={(valor) => ...} onCancelar={...} />
 *
 * Accesible: se cierra con Escape o clic afuera, enfoca el campo al abrir
 * y se anuncia como diálogo a los lectores de pantalla.
 */

import React, { useEffect, useId, useRef, useState } from 'react';

interface CampoDialogo {
  etiqueta: string;
  valorInicial?: string;
  tipo?: 'text' | 'email';
  placeholder?: string;
  /** Devuelve un mensaje de error, o null si el valor es válido */
  validar?: (valor: string) => string | null;
}

interface Props {
  abierto: boolean;
  titulo: string;
  mensaje?: React.ReactNode;
  icono?: React.ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: 'normal' | 'peligro';
  campo?: CampoDialogo;
  procesando?: boolean;
  onConfirmar: (valor?: string) => void;
  onCancelar: () => void;
}

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validarCorreo = (valor: string) =>
  CORREO_VALIDO.test(valor.trim()) ? null : 'Ingresa un correo electrónico válido.';

export default function DialogoConfirmacion({
  abierto,
  titulo,
  mensaje,
  icono,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'normal',
  campo,
  procesando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const idTitulo = useId();
  const idCampo = useId();
  const idError = useId();
  const [valor, setValor] = useState(campo?.valorInicial ?? '');
  const [error, setError] = useState<string | null>(null);
  const refCampo = useRef<HTMLInputElement>(null);
  const refConfirmar = useRef<HTMLButtonElement>(null);

  // Al abrir: reiniciar el valor y enfocar
  useEffect(() => {
    if (!abierto) return;
    setValor(campo?.valorInicial ?? '');
    setError(null);
    const t = setTimeout(() => (campo ? refCampo.current?.select() : refConfirmar.current?.focus()), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // Escape para cerrar
  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !procesando) onCancelar();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [abierto, procesando, onCancelar]);

  if (!abierto) return null;

  const confirmar = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (procesando) return;
    if (campo) {
      const mensajeError = campo.validar ? campo.validar(valor) : null;
      if (mensajeError) {
        setError(mensajeError);
        refCampo.current?.focus();
        return;
      }
      onConfirmar(valor.trim());
    } else {
      onConfirmar();
    }
  };

  const colorConfirmar =
    variante === 'peligro'
      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40'
      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !procesando) onCancelar();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onSubmit={confirmar}
        className="w-full max-w-md bg-[#121216] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95"
      >
        <div className="p-7 space-y-4">
          <div className="flex items-start gap-4">
            {icono && (
              <div
                className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-xl border ${
                  variante === 'peligro'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                }`}
                aria-hidden="true"
              >
                {icono}
              </div>
            )}
            <div className="min-w-0">
              <h2 id={idTitulo} className="text-lg font-black text-white leading-snug">
                {titulo}
              </h2>
              {mensaje && <div className="text-sm text-slate-400 mt-1.5 leading-relaxed">{mensaje}</div>}
            </div>
          </div>

          {campo && (
            <div className="space-y-2 pt-1">
              <label htmlFor={idCampo} className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {campo.etiqueta}
              </label>
              <input
                ref={refCampo}
                id={idCampo}
                type={campo.tipo ?? 'text'}
                value={valor}
                placeholder={campo.placeholder}
                onChange={(e) => {
                  setValor(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={!!error}
                aria-describedby={error ? idError : undefined}
                className={`w-full bg-black border rounded-2xl px-4 py-3.5 text-sm text-white outline-none transition-colors ${
                  error ? 'border-rose-500/60 focus:border-rose-400' : 'border-white/10 focus:border-blue-500'
                }`}
              />
              {error && (
                <p id={idError} className="text-xs text-rose-300">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-7 pb-7 flex gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {textoCancelar}
          </button>
          <button
            ref={refConfirmar}
            type="submit"
            disabled={procesando}
            className={`flex-1 text-white font-black py-3.5 rounded-2xl shadow-lg text-xs uppercase tracking-wider transition-all disabled:opacity-60 ${colorConfirmar}`}
          >
            {procesando ? 'Procesando...' : textoConfirmar}
          </button>
        </div>
      </form>
    </div>
  );
}
