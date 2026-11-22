# Migraciones de base de datos

Cambios a la base de datos de Supabase, hechos y probados primero en **sindicato-dev**.
Se aplican en el **SQL Editor** de Supabase.

## Para producción: un solo archivo

| Archivo | Uso |
|---|---|
| `migracion_produccion.sql` | Junta 001 + 002 + 003 + 004 en una **transacción**: si algo falla, no se aplica nada. No incluye datos de demo. **Este es el que se corre en producción.** |

## Archivos individuales (historial de cambios)

| Archivo | Qué hace |
|---|---|
| `001_integridad_datos.sql` | `asamblea_id` en asistencias, `sindicato_id` en `solicitudes_beneficios`, `created_at` en `votos_encuestas`, `plan` en `sindicatos`. Triggers que completan `sindicato_id` solos. Corrige datos (tickets y encuestas sin sindicato, asistencias sin asamblea, `rol_solicitado` con comillas, nombres con tabuladores). |
| `002_funciones_reportes_presidente.sql` | Funciones `reporte_*` para "Tendencias" del Presidente. Solo devuelven datos del sindicato de quien consulta. |
| `003_funciones_reportes_admin.sql` | Funciones `reporte_admin_*` para el superadmin (crecimiento, planes, cupos, actividad, soporte). |
| `004_fechas_y_cierre_tickets.sql` | `fecha_cierre` en tickets (solo si está "Resuelto"/"Finalizado", con restricciones `CHECK`), `created_at` en 4 tablas, `fecha_resolucion` en 5 tablas, `fecha_lectura` en notificaciones, `fecha_baja` en profiles. |
| `datos_demo_DEV.sql` | Sindicatos, socios y actividad ficticios. **NUNCA en producción, solo sindicato-dev.** |

## Orden para llevarlo a producción

1. Revisar los cambios con el equipo (ver `CAMBIOS.md` en la raíz del repo).
2. Correr `migracion_produccion.sql` en el SQL Editor de **producción**.
   Solo agrega columnas, funciones y triggers: la versión actual de la app sigue funcionando.
3. Revisar la verificación del final del archivo.
4. Recién después, juntar la rama `antonino-dev` con `main` (el panel del Presidente
   usa las funciones nuevas; sin ellas, "Tendencias" muestra un error).

Todos los archivos se pueden volver a correr sin problema.
