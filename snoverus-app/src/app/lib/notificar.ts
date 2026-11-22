/**
 * notificar(): reemplazo de alert() con toasts estilizados (sonner).
 *
 * Uso: notificar('✅ Acta actualizada exitosamente.')
 *
 * Decide el tipo de aviso según el mensaje, así los textos que ya existían
 * en el proyecto funcionan sin cambiarlos:
 *   ✅ ✨ 📦 🗑️  o "exitosamente/con éxito"  → éxito (verde)
 *   ❌  o empieza con "Error"                 → error (rojo)
 *   ⚠️                                        → advertencia (ámbar)
 *   cualquier otro                             → información (cyan)
 *
 * Si el mensaje tiene saltos de línea, la primera línea es el título y el
 * resto la descripción. El emoji del inicio se quita (el toast ya trae ícono).
 */
import { toast } from 'sonner';

type TipoAviso = 'exito' | 'error' | 'advertencia' | 'info';

const EMOJI_INICIAL = /^[\s☀-➿\u{1F300}-\u{1FAFF}️‍]+/u;

function detectarTipo(texto: string): TipoAviso {
  const t = texto.trim();
  const minus = t.toLowerCase();
  if (t.startsWith('❌') || minus.startsWith('error') || minus.includes('error al') || minus.includes('hubo un problema')) {
    return 'error';
  }
  if (t.startsWith('⚠')) return 'advertencia';
  if (/^(✅|✨|📦|🗑)/u.test(t) || minus.includes('exitosamente') || minus.includes('con éxito')) {
    return 'exito';
  }
  return 'info';
}

export function notificar(mensaje: unknown, tipo?: TipoAviso): void {
  const texto = String(mensaje ?? '');
  const tipoFinal = tipo ?? detectarTipo(texto);

  const limpio = texto.replace(EMOJI_INICIAL, '').trim();
  const [titulo, ...resto] = limpio.split('\n');
  const descripcion = resto.join('\n').trim() || undefined;
  const opciones = descripcion ? { description: descripcion } : undefined;

  switch (tipoFinal) {
    case 'exito':
      toast.success(titulo, opciones);
      break;
    case 'error':
      toast.error(titulo, { duration: 7000, ...opciones });
      break;
    case 'advertencia':
      toast.warning(titulo, opciones);
      break;
    default:
      toast.info(titulo, opciones);
  }
}
