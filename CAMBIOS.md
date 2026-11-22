# Cambios de la rama `antonino-dev`

Resumen de lo que agregué al proyecto, para revisarlo antes de juntarlo con `main`.
Todo se probó en **sindicato-dev** (copia de la base de producción con datos ficticios);
producción no se ha tocado.

## 1. Frontend

| Cambio | Archivos |
|---|---|
| **Tendencias del Presidente**: 4 indicadores y 5 gráficos (socios por mes, asistencia por asamblea con línea de quórum, postulaciones por mes, tickets por mes, participación en encuestas), con filtro de 3/6/12 meses. | `src/app/dashboard/admin/TendenciasSindicato.tsx` (nuevo), `src/app/dashboard/admin/page.tsx` |
| **Fix "quórum 0%"**: las asistencias se cuentan por `asamblea_id` (si un registro antiguo no lo tiene, compara por título como antes). | `src/app/dashboard/admin/page.tsx` |
| **Fix "Aprobadas (0)"**: el panel guarda `Aceptada` y los datos antiguos `Aprobada`; ahora cuenta ambos. | `src/app/dashboard/admin/page.tsx` |
| **52 `alert()` reemplazados por toasts** (sonner) con el estilo del proyecto: verde éxito, rojo error, ámbar advertencia, cyan información. | `src/app/lib/notificar.ts` (nuevo), `src/components/Notificaciones.tsx` (nuevo), `src/app/layout.tsx`, 11 páginas del dashboard, `Navbar.tsx` |
| **Diálogo de confirmación estilizado** (reemplaza `confirm()`/`prompt()`). Usado en Beneficios: canje con el correo del socio ya completo (antes venía fijo `contacto@sindicatopyc.cl`) y eliminación de convenio. | `src/components/DialogoConfirmacion.tsx` (nuevo), `src/app/dashboard/beneficios/page.tsx` |
| Dependencia nueva: `sonner`. | `package.json`, `package-lock.json` |

## 2. Base de datos (carpeta `db/migraciones`)

**Columnas nuevas**

| Tabla | Columna | Cómo se llena |
|---|---|---|
| `asistencia_asambleas` | `asamblea_id` | Trigger: busca la asamblea por título y sindicato |
| `tickets_soporte` | `fecha_cierre` | Trigger: solo al pasar a "Resuelto"/"Finalizado"; se borra si se reabre. Restricciones `CHECK` lo garantizan |
| `solicitudes_beneficios` | `sindicato_id` | Trigger: desde el beneficio |
| `votos_encuestas` | `created_at` | Valor por defecto `now()` |
| `sindicatos` | `plan` | Por defecto `'Básico'` |
| `asambleas_votaciones`, `cuotas_sindicales`, `negociacion_info`, `hitos_negociacion` | `created_at` | Valor por defecto `now()` |
| `postulaciones`, `fondo_solidario`, `fondo_aportes`, `solicitudes_beneficios`, `cuotas_sindicales` | `fecha_resolucion` | Trigger: al dejar de estar "Pendiente"/"En Revisión" |
| `notificaciones` | `fecha_lectura` | Trigger: al marcar como leída |
| `profiles` | `fecha_baja` | Trigger: al dejar de estar "activo" |

**Además**
- Trigger en 20 tablas que completa `sindicato_id` desde el perfil de quien inserta, si el frontend no lo envía.
- Funciones de reporte: `reporte_*` (Presidente, solo su sindicato) y `reporte_admin_*` (superadmin).
- Corrección de datos existentes: tickets y encuestas sin sindicato, asistencias sin asamblea, `rol_solicitado` guardado con comillas, nombres de sindicato con tabuladores.

**Para producción:** `db/migraciones/migracion_produccion.sql` (todo junto, en una transacción). Instrucciones en `db/migraciones/README.md`.

## 3. Bugs encontrados en producción (pendientes)

1. **Políticas RLS con `using (true)`** que anulan el aislamiento entre sindicatos. Ejemplos: cualquier usuario con sesión puede editar cualquier perfil (incluso cambiarse el rol); las postulaciones (RUT, correo, teléfono) se pueden leer sin sesión.
2. **Políticas "Bloquear si suspendido" creadas como permisivas** (deberían ser restrictivas): hoy dan acceso a todo a cualquier usuario activo.
3. **`asistencia_asambleas` y `solicitudes_beneficios` sin RLS activado.**
4. **Buckets de Storage**: `beneficios` permite subir/borrar a cualquiera; `comprobantes` es público.
5. **"Sindicato Comercial" duplicado** (uno con tabulador en el nombre; la migración lo limpia).
6. **`fondo_meta` usa `id = 1` fijo**: solo un sindicato puede tener meta.
7. **El superadmin está asignado a "Sindicato PYC"**.

## 4. Cómo probar (sindicato-dev)

Cambiar `.env.local` a la URL y clave de sindicato-dev. Cuentas de prueba:

| Rol | RUT |
|---|---|
| Socio | 10000003-2 |
| Presidente | 10000002-4 |
| Superadmin | 10000001-6 |

(Contraseñas por interno.)

## 5. Pendiente

- Componente de gráficos del superadmin (las funciones `reporte_admin_*` ya están).
- Corregir las políticas RLS (bugs 1 a 4) antes de prometer privacidad en los términos y condiciones.
- Reemplazar los `confirm()` que quedan por `DialogoConfirmacion`.
- Versión para celular y rediseño del portal Socio.
