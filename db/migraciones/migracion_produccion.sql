-- =====================================================================
-- MIGRACIÓN PARA PRODUCCIÓN · Sindicato PYC
-- Junta, en orden, las migraciones 001, 002, 003 y 004 ya probadas en
-- sindicato-dev. NO incluye datos de demostración.
--
-- Cómo aplicar (cuando el equipo lo acuerde):
--   1. Abrir el SQL Editor del proyecto de PRODUCCIÓN.
--   2. Pegar este archivo completo y ejecutarlo.
--   3. Todo corre dentro de una transacción: si algo falla, no se aplica
--      nada y la base queda exactamente como estaba.
--   4. Revisar la verificación del final.
--
-- Qué hace (resumen):
--   - Columnas nuevas: asistencia_asambleas.asamblea_id,
--     tickets_soporte.fecha_cierre, solicitudes_beneficios.sindicato_id,
--     votos_encuestas.created_at, sindicatos.plan, created_at en 4 tablas,
--     fecha_resolucion en 5 tablas, notificaciones.fecha_lectura,
--     profiles.fecha_baja.
--   - Triggers que completan sindicato_id y las fechas automáticamente.
--   - Corrige datos existentes (tickets sin sindicato, asistencias sin
--     asamblea, rol_solicitado con comillas, nombres con tabuladores).
--   - Funciones reporte_* (Presidente) y reporte_admin_* (superadmin).
-- Solo agrega cosas: la versión actual de la app sigue funcionando.
-- =====================================================================

begin;


-- #####################################################################
-- 001_integridad_datos.sql
-- #####################################################################
-- =====================================================================
-- Migración 001 · Integridad de datos
-- Probar primero en sindicato-dev. Solo AGREGA columnas, índices y
-- triggers, y corrige datos; no borra tablas ni columnas.
-- Se puede correr más de una vez sin problema.
--
-- Qué arregla:
--   1. Asistencias ligadas a su asamblea por ID (corrige "quórum 0%").
--   2. sindicato_id se completa solo al insertar (corrige tickets sin sindicato).
--   3. Tickets guardan cuándo se respondieron (tiempo de respuesta).
--   4. solicitudes_beneficios tiene sindicato_id como el resto de las tablas.
--   5. votos_encuestas guarda la fecha del voto.
--   6. Detalles: rol_solicitado con comillas, nombres de sindicato con
--      espacios o tabuladores, columna plan en sindicatos.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Asistencias ligadas a su asamblea por ID
-- ---------------------------------------------------------------------
alter table public.asistencia_asambleas
  add column if not exists asamblea_id integer references public.historial_asambleas(id) on delete set null;

create index if not exists idx_asistencia_asamblea_id on public.asistencia_asambleas(asamblea_id);

-- Completar las asistencias existentes: busca la asamblea con el mismo
-- título y sindicato, la más cercana en fecha.
update public.asistencia_asambleas a
set asamblea_id = (
  select h.id from public.historial_asambleas h
  where h.titulo = a.asamblea_titulo
    and h.sindicato_id is not distinct from a.sindicato_id
  order by abs(extract(epoch from (coalesce(a.fecha_asistencia, now()) - h.created_at)))
  limit 1)
where a.asamblea_id is null;

-- Las asistencias nuevas se ligan solas, aunque el frontend siga
-- enviando solo el título.
create or replace function public.asignar_asamblea_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.asamblea_id is null and new.asamblea_titulo is not null then
    select h.id into new.asamblea_id
    from public.historial_asambleas h
    where h.titulo = new.asamblea_titulo
      and h.sindicato_id is not distinct from new.sindicato_id
    order by h.created_at desc
    limit 1;
  end if;
  return new;
end $$;

drop trigger if exists trg_asignar_asamblea_id on public.asistencia_asambleas;


-- ---------------------------------------------------------------------
-- 2. sindicato_id automático
-- Si el frontend inserta sin sindicato_id, se toma el del perfil del
-- usuario que inserta. Si el frontend ya lo envía, no se toca.
-- ---------------------------------------------------------------------
create or replace function public.asignar_sindicato_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.sindicato_id is null then
    select p.sindicato_id into new.sindicato_id
    from public.profiles p
    where p.id = auth.uid();
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'agenda_legal', 'asambleas_votaciones', 'asistencia_asambleas', 'beneficios', 'comunicados',
    'cuotas_sindicales', 'documentos_oficiales', 'encuestas_clima', 'fondo_aportes', 'fondo_solidario',
    'historial_asambleas', 'hitos_negociacion', 'libro_actas', 'negociacion_info', 'notificaciones',
    'notificaciones_sindicato', 'tickets_soporte', 'votos_encuestas', 'votos_registrados']
  loop
    execute format('drop trigger if exists trg_asignar_sindicato_id on public.%I', t);
    execute format('create trigger trg_asignar_sindicato_id before insert on public.%I
                    for each row execute function public.asignar_sindicato_id()', t);
  end loop;
end $$;

-- En asistencias, primero se asigna el sindicato y después la asamblea
-- (los triggers corren en orden alfabético: trg_asignar_a... < trg_asignar_s...,
--  por eso este se llama trg_z_ para correr al final).
drop trigger if exists trg_z_asignar_asamblea_id on public.asistencia_asambleas;
create trigger trg_z_asignar_asamblea_id before insert on public.asistencia_asambleas
  for each row execute function public.asignar_asamblea_id();

-- Completar registros antiguos sin sindicato usando el RUT del perfil.
-- (En dev no cambia nada; en producción arregla los 52 tickets, etc.)
create or replace function pg_temp.rut_limpio(r text) returns text language sql immutable as $$
  select upper(replace(replace(coalesce(r, ''), '.', ''), '-', ''))
$$;

update public.tickets_soporte x set sindicato_id = p.sindicato_id
from public.profiles p
where x.sindicato_id is null and pg_temp.rut_limpio(x.usuario_rut) = pg_temp.rut_limpio(p.rut);

update public.asistencia_asambleas x set sindicato_id = p.sindicato_id
from public.profiles p
where x.sindicato_id is null and pg_temp.rut_limpio(x.usuario_rut) = pg_temp.rut_limpio(p.rut);

update public.cuotas_sindicales x set sindicato_id = p.sindicato_id
from public.profiles p
where x.sindicato_id is null and pg_temp.rut_limpio(x.usuario_rut) = pg_temp.rut_limpio(p.rut);

update public.fondo_solidario x set sindicato_id = p.sindicato_id
from public.profiles p
where x.sindicato_id is null and pg_temp.rut_limpio(x.usuario_rut) = pg_temp.rut_limpio(p.rut);

update public.agenda_legal x set sindicato_id = p.sindicato_id
from public.profiles p
where x.sindicato_id is null and pg_temp.rut_limpio(x.usuario_rut) = pg_temp.rut_limpio(p.rut);

update public.votos_registrados x set sindicato_id = p.sindicato_id
from public.profiles p
where x.sindicato_id is null and pg_temp.rut_limpio(x.usuario_rut) = pg_temp.rut_limpio(p.rut);

update public.fondo_aportes x set sindicato_id = p.sindicato_id
from public.profiles p
where x.sindicato_id is null and pg_temp.rut_limpio(x.rut) = pg_temp.rut_limpio(p.rut);

update public.votos_encuestas x set sindicato_id = p.sindicato_id
from public.profiles p
where x.sindicato_id is null and x.user_id = p.id;

-- Encuestas sin sindicato: se asigna el sindicato de quienes votaron en ellas
update public.encuestas_clima e
set sindicato_id = (
  select v.sindicato_id from public.votos_encuestas v
  where v.encuesta_id = e.id and v.sindicato_id is not null
  group by v.sindicato_id order by count(*) desc limit 1)
where e.sindicato_id is null;

-- Segunda pasada de asamblea_id: las asistencias que recién obtuvieron
-- sindicato_id ahora sí pueden ligarse a su asamblea
update public.asistencia_asambleas a
set asamblea_id = (
  select h.id from public.historial_asambleas h
  where h.titulo = a.asamblea_titulo
    and h.sindicato_id is not distinct from a.sindicato_id
  order by abs(extract(epoch from (coalesce(a.fecha_asistencia, now()) - h.created_at)))
  limit 1)
where a.asamblea_id is null;


-- ---------------------------------------------------------------------
-- 3. Tickets: fecha de respuesta
-- Se llena sola cuando la directiva escribe la respuesta o marca
-- el ticket como Resuelto.
-- ---------------------------------------------------------------------
alter table public.tickets_soporte add column if not exists fecha_respuesta timestamptz;

create or replace function public.registrar_fecha_respuesta()
returns trigger language plpgsql as $$
begin
  if new.fecha_respuesta is null
     and ((new.respuesta_admin is not null and new.respuesta_admin is distinct from old.respuesta_admin)
          or (new.estado = 'Resuelto' and new.estado is distinct from old.estado)) then
    new.fecha_respuesta := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_fecha_respuesta on public.tickets_soporte;
create trigger trg_fecha_respuesta before update on public.tickets_soporte
  for each row execute function public.registrar_fecha_respuesta();


-- ---------------------------------------------------------------------
-- 4. solicitudes_beneficios con sindicato_id
-- ---------------------------------------------------------------------
alter table public.solicitudes_beneficios
  add column if not exists sindicato_id integer references public.sindicatos(id) on delete cascade;

update public.solicitudes_beneficios s set sindicato_id = b.sindicato_id
from public.beneficios b
where s.sindicato_id is null and b.id = s.beneficio_id;

create or replace function public.asignar_sindicato_solicitud()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.sindicato_id is null then
    select b.sindicato_id into new.sindicato_id from public.beneficios b where b.id = new.beneficio_id;
  end if;
  if new.sindicato_id is null then
    select p.sindicato_id into new.sindicato_id from public.profiles p where p.id = auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists trg_asignar_sindicato_id on public.solicitudes_beneficios;
create trigger trg_asignar_sindicato_id before insert on public.solicitudes_beneficios
  for each row execute function public.asignar_sindicato_solicitud();


-- ---------------------------------------------------------------------
-- 5. votos_encuestas con fecha
-- Los votos que ya existen quedan con la fecha de hoy (no se sabe la real).
-- ---------------------------------------------------------------------
alter table public.votos_encuestas add column if not exists created_at timestamptz default now();


-- ---------------------------------------------------------------------
-- 6. Detalles
-- ---------------------------------------------------------------------
-- 6a. rol_solicitado se guardaba con comillas: 'socio' en vez de socio
alter table public.postulaciones alter column rol_solicitado set default 'socio';
update public.postulaciones set rol_solicitado = btrim(rol_solicitado, '''')
where rol_solicitado like '''%''';

-- 6b. Nombres de sindicato sin espacios ni tabuladores al inicio o al final
update public.sindicatos set nombre = btrim(nombre, e' \t\r\n')
where nombre <> btrim(nombre, e' \t\r\n');

create or replace function public.limpiar_nombre_sindicato()
returns trigger language plpgsql as $$
begin
  new.nombre := btrim(new.nombre, e' \t\r\n');
  return new;
end $$;

drop trigger if exists trg_limpiar_nombre on public.sindicatos;
create trigger trg_limpiar_nombre before insert or update of nombre on public.sindicatos
  for each row execute function public.limpiar_nombre_sindicato();

-- 6c. Plan contratado, para el reporte de planes del Admin
alter table public.sindicatos add column if not exists plan text default 'Básico';


-- #####################################################################
-- 002_funciones_reportes_presidente.sql
-- #####################################################################
-- =====================================================================
-- Migración 002 · Funciones de reporte para el Presidente
-- Requiere la migración 001. Probar primero en sindicato-dev.
--
-- El frontend las llama así:
--   const { data, error } = await supabase.rpc('reporte_socios_por_mes', { p_meses: 6 })
--
-- Seguridad: cada función averigua el sindicato de quien la llama
-- (auth.uid()) y solo devuelve datos de ese sindicato. Solo pueden
-- usarlas la directiva (admin) y el superadmin. El superadmin puede
-- pedir otro sindicato con p_sindicato_id. Devuelven solo conteos y
-- porcentajes, sin datos personales.
-- Se puede correr más de una vez.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Ayudantes
-- ---------------------------------------------------------------------
-- Devuelve el sindicato que se puede consultar, o da error si no tiene permiso
create or replace function public.reporte_sindicato_permitido(p_sindicato_id integer default null)
returns integer language plpgsql stable security definer set search_path = public as $$
declare v_rol text; v_sindicato integer;
begin
  select lower(p.role), p.sindicato_id into v_rol, v_sindicato
  from public.profiles p where p.id = auth.uid();

  if v_rol is null then
    raise exception 'Debes iniciar sesión para ver reportes';
  end if;
  if v_rol = 'superadmin' then
    return coalesce(p_sindicato_id, v_sindicato);
  end if;
  if v_rol in ('admin', 'administrador', 'directiva') then
    return v_sindicato;            -- la directiva solo ve su propio sindicato
  end if;
  raise exception 'Solo la directiva puede ver los reportes del sindicato';
end $$;

-- Nombre corto del mes en español para las etiquetas de los gráficos
create or replace function public.reporte_etiqueta_mes(d date)
returns text language sql immutable as $$
  select (array['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'])[extract(month from d)::int]
$$;


-- ---------------------------------------------------------------------
-- 1. Indicadores de arriba (una sola fila)
-- ---------------------------------------------------------------------
create or replace function public.reporte_resumen(p_sindicato_id integer default null)
returns table (
  socios_activos             bigint,
  postulaciones_pendientes   bigint,
  asistencia_promedio        numeric,   -- % promedio de las últimas 6 asambleas
  tickets_abiertos           bigint,
  horas_respuesta_promedio   numeric,   -- tickets respondidos en los últimos 90 días
  participacion_encuestas    numeric    -- % promedio de las últimas 5 encuestas
)
language plpgsql stable security definer set search_path = public as $$
declare v_sid integer := public.reporte_sindicato_permitido(p_sindicato_id);
begin
  return query
  select
    (select count(*) from profiles p
      where p.sindicato_id = v_sid and lower(p.role) <> 'superadmin' and lower(coalesce(p.estado, 'activo')) = 'activo'),
    (select count(*) from postulaciones x where x.sindicato_id = v_sid and x.estado = 'Pendiente'),
    (select round(avg(a.porcentaje), 1) from public.reporte_asistencia_por_asamblea(6, v_sid) a),
    (select count(*) from tickets_soporte t where t.sindicato_id = v_sid and t.estado in ('Pendiente', 'En Revisión')),
    (select round(avg(extract(epoch from (t.fecha_respuesta - t.created_at)) / 3600)::numeric, 1)
       from tickets_soporte t
      where t.sindicato_id = v_sid and t.fecha_respuesta is not null and t.created_at > now() - interval '90 days'),
    (select round(avg(e.porcentaje), 1) from (select * from public.reporte_participacion_encuestas(v_sid) limit 5) e);
end $$;


-- ---------------------------------------------------------------------
-- 2. Socios por mes (gráfico de línea)
-- ---------------------------------------------------------------------
create or replace function public.reporte_socios_por_mes(p_meses integer default 6, p_sindicato_id integer default null)
returns table (mes date, etiqueta text, socios bigint, nuevos bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_sid integer := public.reporte_sindicato_permitido(p_sindicato_id);
begin
  return query
  select m.mes::date,
         public.reporte_etiqueta_mes(m.mes::date),
         (select count(*) from profiles p
           where p.sindicato_id = v_sid and lower(p.role) <> 'superadmin'
             and p.created_at < m.mes + interval '1 month'),
         (select count(*) from profiles p
           where p.sindicato_id = v_sid and lower(p.role) <> 'superadmin'
             and p.created_at >= m.mes and p.created_at < m.mes + interval '1 month')
  from generate_series(date_trunc('month', now()) - make_interval(months => greatest(p_meses, 1) - 1),
                       date_trunc('month', now()), interval '1 month') as m(mes)
  order by m.mes;
end $$;


-- ---------------------------------------------------------------------
-- 3. Asistencia por asamblea (barras + línea de quórum)
-- El padrón de cada asamblea cuenta solo a quienes ya eran socios ese día.
-- ---------------------------------------------------------------------
create or replace function public.reporte_asistencia_por_asamblea(p_limite integer default 6, p_sindicato_id integer default null)
returns table (asamblea_id integer, titulo text, fecha date, asistentes bigint, padron bigint, porcentaje numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_sid integer := public.reporte_sindicato_permitido(p_sindicato_id);
begin
  return query
  select r.asamblea_id, r.titulo, r.fecha, r.asistentes, r.padron,
         case when r.padron > 0 then round(100.0 * r.asistentes / r.padron, 1) else 0 end
  from (
    select h.id as asamblea_id, h.titulo::text as titulo,
           coalesce(min(a.fecha_asistencia), h.created_at)::date as fecha,
           count(distinct coalesce(a.user_id::text, a.usuario_rut)) as asistentes,
           (select count(*) from profiles p
             where p.sindicato_id = v_sid and lower(p.role) <> 'superadmin'
               and p.created_at <= coalesce(min(a.fecha_asistencia), h.created_at)) as padron
    from historial_asambleas h
    left join asistencia_asambleas a on a.asamblea_id = h.id
    where h.sindicato_id = v_sid
    group by h.id, h.titulo, h.created_at
    order by coalesce(min(a.fecha_asistencia), h.created_at) desc
    limit greatest(p_limite, 1)
  ) r
  order by r.fecha;
end $$;


-- ---------------------------------------------------------------------
-- 4. Postulaciones por mes (barras apiladas)
-- ---------------------------------------------------------------------
create or replace function public.reporte_postulaciones_por_mes(p_meses integer default 6, p_sindicato_id integer default null)
returns table (mes date, etiqueta text, aprobadas bigint, rechazadas bigint, pendientes bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_sid integer := public.reporte_sindicato_permitido(p_sindicato_id);
begin
  return query
  select m.mes::date, public.reporte_etiqueta_mes(m.mes::date),
         count(x.id) filter (where x.estado in ('Aprobada', 'Aceptada')),   -- el panel guarda 'Aceptada'; datos antiguos 'Aprobada'
         count(x.id) filter (where x.estado = 'Rechazada'),
         count(x.id) filter (where x.estado = 'Pendiente')
  from generate_series(date_trunc('month', now()) - make_interval(months => greatest(p_meses, 1) - 1),
                       date_trunc('month', now()), interval '1 month') as m(mes)
  left join postulaciones x
    on x.sindicato_id = v_sid and x.created_at >= m.mes and x.created_at < m.mes + interval '1 month'
  group by m.mes
  order by m.mes;
end $$;


-- ---------------------------------------------------------------------
-- 5. Participación en encuestas (barras horizontales), más recientes primero
-- ---------------------------------------------------------------------
create or replace function public.reporte_participacion_encuestas(p_sindicato_id integer default null)
returns table (encuesta_id bigint, titulo text, fecha date, votantes bigint, padron bigint, porcentaje numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_sid integer := public.reporte_sindicato_permitido(p_sindicato_id);
begin
  return query
  select r.id, r.titulo, r.fecha, r.votantes, r.padron,
         case when r.padron > 0 then least(100, round(100.0 * r.votantes / r.padron, 1)) else 0 end
  from (
    select e.id, e.titulo, e.created_at::date as fecha,
           count(distinct v.user_id) as votantes,
           -- padrón actual: cualquier socio de hoy pudo haber votado mientras estuvo abierta
           (select count(*) from profiles p
             where p.sindicato_id = v_sid and lower(p.role) <> 'superadmin'
               and lower(coalesce(p.estado, 'activo')) = 'activo') as padron
    from encuestas_clima e
    left join votos_encuestas v on v.encuesta_id = e.id
    where e.sindicato_id = v_sid
    group by e.id, e.titulo, e.created_at
  ) r
  order by r.fecha desc;
end $$;


-- ---------------------------------------------------------------------
-- 6. Tickets por mes (barras apiladas) + horas promedio de respuesta
-- ---------------------------------------------------------------------
create or replace function public.reporte_tickets_por_mes(p_meses integer default 6, p_sindicato_id integer default null)
returns table (mes date, etiqueta text, pendientes bigint, en_revision bigint, resueltos bigint, horas_respuesta_promedio numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_sid integer := public.reporte_sindicato_permitido(p_sindicato_id);
begin
  return query
  select m.mes::date, public.reporte_etiqueta_mes(m.mes::date),
         count(t.id) filter (where t.estado = 'Pendiente'),
         count(t.id) filter (where t.estado = 'En Revisión'),
         count(t.id) filter (where t.estado = 'Resuelto'),
         round((avg(extract(epoch from (t.fecha_respuesta - t.created_at))) / 3600)::numeric, 1)
  from generate_series(date_trunc('month', now()) - make_interval(months => greatest(p_meses, 1) - 1),
                       date_trunc('month', now()), interval '1 month') as m(mes)
  left join tickets_soporte t
    on t.sindicato_id = v_sid and t.created_at >= m.mes and t.created_at < m.mes + interval '1 month'
  group by m.mes
  order by m.mes;
end $$;


-- ---------------------------------------------------------------------
-- Permisos: solo usuarios con sesión iniciada (y la función revisa el rol)
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'reporte_sindicato_permitido(integer)', 'reporte_resumen(integer)',
    'reporte_socios_por_mes(integer, integer)', 'reporte_asistencia_por_asamblea(integer, integer)',
    'reporte_postulaciones_por_mes(integer, integer)', 'reporte_participacion_encuestas(integer)',
    'reporte_tickets_por_mes(integer, integer)']
  loop
    execute format('revoke execute on function public.%s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function public.%s from anon', f);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('grant execute on function public.%s to authenticated', f);
    end if;
  end loop;
end $$;


-- #####################################################################
-- 003_funciones_reportes_admin.sql
-- #####################################################################
-- =====================================================================
-- Migración 003 · Funciones de reporte para el Admin (superadmin)
-- Requiere la migración 001 (columna plan en sindicatos).
-- Probar primero en sindicato-dev.
--
-- El frontend las llama así:
--   const { data, error } = await supabase.rpc('reporte_admin_crecimiento', { p_meses: 6 })
--
-- Privacidad: solo el superadmin puede usarlas, y devuelven solo
-- conteos por organización. Ningún nombre, RUT, correo ni contenido de
-- tickets o votos de socios.
-- Se puede correr más de una vez.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Ayudantes
-- ---------------------------------------------------------------------
create or replace function public.reporte_exigir_superadmin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) = 'superadmin') then
    raise exception 'Solo el superadmin puede ver los reportes de la plataforma';
  end if;
end $$;

-- Precio y límite de socios de cada plan (CLP). Editar aquí si cambian.
-- Se compara sin mayúsculas ni tildes: 'Básico' = 'basico'.
create or replace function public.reporte_planes_config()
returns table (plan_clave text, plan_nombre text, precio_mensual integer, limite_socios integer)
language sql immutable as $$
  values ('basico',   'Básico',   4990,  25),
         ('estandar', 'Estándar', 9990,  50),
         ('premium',  'Premium',  14990, null)   -- null = sin límite
$$;

create or replace function public.reporte_clave_plan(p text)
returns text language sql immutable as $$
  select translate(lower(btrim(coalesce(p, 'basico'))), 'áéíóú', 'aeiou')
$$;


-- ---------------------------------------------------------------------
-- 1. Indicadores de la plataforma (una sola fila)
-- ---------------------------------------------------------------------
create or replace function public.reporte_admin_resumen()
returns table (
  organizaciones            bigint,
  organizaciones_activas    bigint,
  usuarios                  bigint,   -- sin contar superadmins
  presidentes               bigint,
  socios                    bigint,
  postulaciones_pendientes  bigint,
  tickets_abiertos          bigint,
  sin_actividad_30_dias     bigint,
  ingreso_mensual_estimado  bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.reporte_exigir_superadmin();
  return query
  select
    (select count(*) from sindicatos),
    (select count(*) from sindicatos s where lower(coalesce(s.estado, 'activo')) = 'activo'),
    (select count(*) from profiles p where lower(p.role) <> 'superadmin'),
    (select count(*) from profiles p where lower(p.role) in ('admin', 'administrador', 'directiva', 'presidente')),
    (select count(*) from profiles p where lower(p.role) = 'socio'),
    (select count(*) from postulaciones x where x.estado = 'Pendiente'),
    (select count(*) from tickets_soporte t where t.estado in ('Pendiente', 'En Revisión')),
    (select count(*) from public.reporte_admin_actividad(30) a where a.dias_sin_actividad is null or a.dias_sin_actividad > 30),
    (select coalesce(sum(c.precio_mensual), 0)::bigint
       from sindicatos s
       join public.reporte_planes_config() c on c.plan_clave = public.reporte_clave_plan(s.plan)
      where lower(coalesce(s.estado, 'activo')) = 'activo');
end $$;


-- ---------------------------------------------------------------------
-- 2. Crecimiento: organizaciones y usuarios acumulados por mes
-- (dos líneas con la misma escala de "cantidad"; se pueden mostrar
--  juntas o en dos gráficos chicos)
-- ---------------------------------------------------------------------
create or replace function public.reporte_admin_crecimiento(p_meses integer default 6)
returns table (mes date, etiqueta text, organizaciones bigint, usuarios bigint, usuarios_nuevos bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.reporte_exigir_superadmin();
  return query
  select m.mes::date,
         (array['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'])[extract(month from m.mes)::int],
         (select count(*) from sindicatos s where s.created_at < m.mes + interval '1 month'),
         (select count(*) from profiles p where lower(p.role) <> 'superadmin' and p.created_at < m.mes + interval '1 month'),
         (select count(*) from profiles p where lower(p.role) <> 'superadmin'
            and p.created_at >= m.mes and p.created_at < m.mes + interval '1 month')
  from generate_series(date_trunc('month', now()) - make_interval(months => greatest(p_meses, 1) - 1),
                       date_trunc('month', now()), interval '1 month') as m(mes)
  order by m.mes;
end $$;


-- ---------------------------------------------------------------------
-- 3. Organizaciones por plan e ingreso estimado
-- ---------------------------------------------------------------------
create or replace function public.reporte_admin_planes()
returns table (plan text, organizaciones bigint, precio_mensual integer, ingreso_mensual_estimado bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.reporte_exigir_superadmin();
  return query
  select c.plan_nombre,
         count(s.id),
         c.precio_mensual,
         (count(s.id) * c.precio_mensual)::bigint
  from public.reporte_planes_config() c
  left join sindicatos s
    on public.reporte_clave_plan(s.plan) = c.plan_clave
   and lower(coalesce(s.estado, 'activo')) = 'activo'
  group by c.plan_clave, c.plan_nombre, c.precio_mensual
  order by c.precio_mensual;
end $$;


-- ---------------------------------------------------------------------
-- 4. Uso de cupos: socios frente al límite del plan
-- ---------------------------------------------------------------------
create or replace function public.reporte_admin_uso_cupos()
returns table (sindicato_id integer, sindicato text, plan text, usuarios bigint, limite integer, porcentaje numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.reporte_exigir_superadmin();
  return query
  select s.id, s.nombre::text, coalesce(c.plan_nombre, s.plan),
         count(p.id) filter (where lower(p.role) <> 'superadmin'),
         c.limite_socios,
         case when c.limite_socios > 0
              then round(100.0 * count(p.id) filter (where lower(p.role) <> 'superadmin') / c.limite_socios, 1)
         end
  from sindicatos s
  left join public.reporte_planes_config() c on c.plan_clave = public.reporte_clave_plan(s.plan)
  left join profiles p on p.sindicato_id = s.id
  group by s.id, s.nombre, s.plan, c.plan_nombre, c.limite_socios
  order by 6 desc nulls last, s.nombre;
end $$;


-- ---------------------------------------------------------------------
-- 5. Actividad por organización en los últimos N días
-- (solo conteos; incluye la última fecha de actividad para detectar
--  organizaciones inactivas)
-- ---------------------------------------------------------------------
create or replace function public.reporte_admin_actividad(p_dias integer default 30)
returns table (
  sindicato_id        integer,
  sindicato           text,
  asistencias         bigint,
  tickets             bigint,
  comunicados         bigint,
  postulaciones       bigint,
  votos               bigint,
  total               bigint,
  ultima_actividad    timestamptz,
  dias_sin_actividad  integer
)
language plpgsql stable security definer set search_path = public as $$
declare desde timestamptz := now() - make_interval(days => greatest(p_dias, 1));
begin
  perform public.reporte_exigir_superadmin();
  return query
  with eventos as (
    select a.sindicato_id as sid, 'asistencias' as tipo, coalesce(a.fecha_asistencia, a.hora_entrada) as fecha from asistencia_asambleas a
    union all select t.sindicato_id, 'tickets', t.created_at from tickets_soporte t
    union all select c.sindicato_id, 'comunicados', c.fecha_creacion from comunicados c
    union all select x.sindicato_id, 'postulaciones', x.created_at from postulaciones x
    union all select v.sindicato_id, 'votos', v.fecha_voto from votos_registrados v
    union all select v.sindicato_id, 'votos', v.created_at from votos_encuestas v
  )
  select s.id, s.nombre::text,
         count(*) filter (where e.tipo = 'asistencias'   and e.fecha >= desde),
         count(*) filter (where e.tipo = 'tickets'       and e.fecha >= desde),
         count(*) filter (where e.tipo = 'comunicados'   and e.fecha >= desde),
         count(*) filter (where e.tipo = 'postulaciones' and e.fecha >= desde),
         count(*) filter (where e.tipo = 'votos'         and e.fecha >= desde),
         count(*) filter (where e.fecha >= desde),
         max(e.fecha),
         (extract(day from now() - max(e.fecha)))::integer
  from sindicatos s
  left join eventos e on e.sid = s.id
  group by s.id, s.nombre
  order by 8 desc, s.nombre;
end $$;


-- ---------------------------------------------------------------------
-- 6. Soporte por organización: volumen y tiempo de respuesta (sin contenido)
-- ---------------------------------------------------------------------
create or replace function public.reporte_admin_soporte(p_dias integer default 90)
returns table (sindicato_id integer, sindicato text, tickets bigint, abiertos bigint, horas_respuesta_promedio numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.reporte_exigir_superadmin();
  return query
  select s.id, s.nombre::text,
         count(t.id),
         count(t.id) filter (where t.estado in ('Pendiente', 'En Revisión')),
         round((avg(extract(epoch from (t.fecha_respuesta - t.created_at))) / 3600)::numeric, 1)
  from sindicatos s
  left join tickets_soporte t
    on t.sindicato_id = s.id and t.created_at >= now() - make_interval(days => greatest(p_dias, 1))
  group by s.id, s.nombre
  order by 3 desc, s.nombre;
end $$;


-- ---------------------------------------------------------------------
-- Permisos: solo usuarios con sesión iniciada (y cada función exige superadmin)
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'reporte_exigir_superadmin()', 'reporte_admin_resumen()', 'reporte_admin_crecimiento(integer)',
    'reporte_admin_planes()', 'reporte_admin_uso_cupos()', 'reporte_admin_actividad(integer)',
    'reporte_admin_soporte(integer)']
  loop
    execute format('revoke execute on function public.%s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function public.%s from anon', f);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('grant execute on function public.%s to authenticated', f);
    end if;
  end loop;
end $$;


-- #####################################################################
-- 004_fechas_y_cierre_tickets.sql
-- #####################################################################
-- =====================================================================
-- Migración 004 · Fechas para graficar y cierre de tickets
-- Requiere 001, 002 y 003. Probar primero en sindicato-dev.
-- Se puede correr más de una vez.
--
-- A. Tickets: la segunda fecha pasa a ser la FECHA DE CIERRE y solo
--    existe cuando el ticket está finalizado ("Resuelto" o "Finalizado").
--    Si el ticket se reabre, la fecha de cierre se borra.
-- B. Fecha de creación en las tablas que no la tenían.
-- C. Fecha de resolución en solicitudes que se aprueban o rechazan
--    (para medir cuánto se demora la directiva en responder).
-- D. Fecha de lectura de notificaciones y fecha de baja de socios.
-- =====================================================================


-- =====================================================================
-- A. TICKETS: fecha de cierre solo cuando está finalizado
-- =====================================================================

-- A1. La columna fecha_respuesta (migración 001) pasa a llamarse fecha_cierre
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tickets_soporte' and column_name = 'fecha_respuesta')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tickets_soporte' and column_name = 'fecha_cierre') then
    alter table public.tickets_soporte rename column fecha_respuesta to fecha_cierre;
  end if;
end $$;

alter table public.tickets_soporte add column if not exists fecha_cierre timestamptz;

-- A2. Estados que cuentan como "finalizado". Si el equipo usa otro nombre, agregarlo aquí
create or replace function public.ticket_estado_final(e text)
returns boolean language sql immutable as $$
  select coalesce(e, '') in ('Resuelto', 'Finalizado')
$$;

-- A3. El trigger anterior (llenaba la fecha al responder) se reemplaza
drop trigger if exists trg_fecha_respuesta on public.tickets_soporte;
drop function if exists public.registrar_fecha_respuesta();

create or replace function public.registrar_fecha_cierre()
returns trigger language plpgsql as $$
begin
  if public.ticket_estado_final(new.estado) then
    -- se cierra ahora (o se crea ya cerrado): guardar la fecha una sola vez
    if new.fecha_cierre is null
       or (tg_op = 'UPDATE' and not public.ticket_estado_final(old.estado)) then
      new.fecha_cierre := now();
    end if;
  else
    -- abierto o reabierto: no puede tener fecha de cierre
    new.fecha_cierre := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_fecha_cierre on public.tickets_soporte;
create trigger trg_fecha_cierre before insert or update of estado, fecha_cierre on public.tickets_soporte
  for each row execute function public.registrar_fecha_cierre();

-- A4. Limpiar datos que ya no cumplen la regla (tickets abiertos con fecha)
update public.tickets_soporte set fecha_cierre = null
where fecha_cierre is not null and not public.ticket_estado_final(estado);

-- A5. Restricciones: la base rechaza cualquier dato que rompa la regla,
--     aunque venga del frontend o de un update manual
alter table public.tickets_soporte drop constraint if exists chk_ticket_cierre_solo_finalizado;
alter table public.tickets_soporte add constraint chk_ticket_cierre_solo_finalizado
  check (fecha_cierre is null or public.ticket_estado_final(estado));

alter table public.tickets_soporte drop constraint if exists chk_ticket_cierre_despues_creacion;
alter table public.tickets_soporte add constraint chk_ticket_cierre_despues_creacion
  check (fecha_cierre is null or created_at is null or fecha_cierre >= created_at);

-- A6. Las funciones de reporte ahora miden el tiempo hasta el cierre.
--     Se mantienen los nombres de las columnas que devuelven para no romper el frontend.
create or replace function public.reporte_resumen(p_sindicato_id integer default null)
returns table (
  socios_activos             bigint,
  postulaciones_pendientes   bigint,
  asistencia_promedio        numeric,
  tickets_abiertos           bigint,
  horas_respuesta_promedio   numeric,   -- horas desde la creación hasta el cierre (últimos 90 días)
  participacion_encuestas    numeric
)
language plpgsql stable security definer set search_path = public as $$
declare v_sid integer := public.reporte_sindicato_permitido(p_sindicato_id);
begin
  return query
  select
    (select count(*) from profiles p
      where p.sindicato_id = v_sid and lower(p.role) <> 'superadmin' and lower(coalesce(p.estado, 'activo')) = 'activo'),
    (select count(*) from postulaciones x where x.sindicato_id = v_sid and x.estado = 'Pendiente'),
    (select round(avg(a.porcentaje), 1) from public.reporte_asistencia_por_asamblea(6, v_sid) a),
    (select count(*) from tickets_soporte t where t.sindicato_id = v_sid and not public.ticket_estado_final(t.estado)),
    (select round(avg(extract(epoch from (t.fecha_cierre - t.created_at)) / 3600)::numeric, 1)
       from tickets_soporte t
      where t.sindicato_id = v_sid and t.fecha_cierre is not null and t.created_at > now() - interval '90 days'),
    (select round(avg(e.porcentaje), 1) from (select * from public.reporte_participacion_encuestas(v_sid) limit 5) e);
end $$;

create or replace function public.reporte_tickets_por_mes(p_meses integer default 6, p_sindicato_id integer default null)
returns table (mes date, etiqueta text, pendientes bigint, en_revision bigint, resueltos bigint, horas_respuesta_promedio numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_sid integer := public.reporte_sindicato_permitido(p_sindicato_id);
begin
  return query
  select m.mes::date, public.reporte_etiqueta_mes(m.mes::date),
         count(t.id) filter (where t.estado = 'Pendiente'),
         count(t.id) filter (where t.estado = 'En Revisión'),
         count(t.id) filter (where public.ticket_estado_final(t.estado)),
         round((avg(extract(epoch from (t.fecha_cierre - t.created_at))) / 3600)::numeric, 1)
  from generate_series(date_trunc('month', now()) - make_interval(months => greatest(p_meses, 1) - 1),
                       date_trunc('month', now()), interval '1 month') as m(mes)
  left join tickets_soporte t
    on t.sindicato_id = v_sid and t.created_at >= m.mes and t.created_at < m.mes + interval '1 month'
  group by m.mes
  order by m.mes;
end $$;

create or replace function public.reporte_admin_soporte(p_dias integer default 90)
returns table (sindicato_id integer, sindicato text, tickets bigint, abiertos bigint, horas_respuesta_promedio numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.reporte_exigir_superadmin();
  return query
  select s.id, s.nombre::text,
         count(t.id),
         count(t.id) filter (where not public.ticket_estado_final(t.estado)),
         round((avg(extract(epoch from (t.fecha_cierre - t.created_at))) / 3600)::numeric, 1)
  from sindicatos s
  left join tickets_soporte t
    on t.sindicato_id = s.id and t.created_at >= now() - make_interval(days => greatest(p_dias, 1))
  group by s.id, s.nombre
  order by 3 desc, s.nombre;
end $$;


-- =====================================================================
-- B. FECHA DE CREACIÓN donde faltaba
-- A los registros que ya existen se les pone la mejor fecha disponible.
-- =====================================================================
alter table public.asambleas_votaciones add column if not exists created_at timestamptz;
update public.asambleas_votaciones set created_at = coalesce(fecha_cierre - interval '7 days', now()) where created_at is null;
alter table public.asambleas_votaciones alter column created_at set default now();

alter table public.cuotas_sindicales add column if not exists created_at timestamptz;
update public.cuotas_sindicales set created_at = coalesce(fecha_pago, now()) where created_at is null;
alter table public.cuotas_sindicales alter column created_at set default now();

alter table public.negociacion_info add column if not exists created_at timestamptz;
update public.negociacion_info set created_at = now() where created_at is null;
alter table public.negociacion_info alter column created_at set default now();

alter table public.hitos_negociacion add column if not exists created_at timestamptz;
update public.hitos_negociacion set created_at = coalesce(fecha::timestamptz, now()) where created_at is null;
alter table public.hitos_negociacion alter column created_at set default now();


-- =====================================================================
-- C. FECHA DE RESOLUCIÓN: cuándo la directiva aprobó o rechazó
-- Se llena sola cuando el estado deja de ser "Pendiente"/"En Revisión";
-- si vuelve a pendiente, se borra.
-- =====================================================================
create or replace function public.estado_abierto(e text)
returns boolean language sql immutable as $$
  select coalesce(e, 'Pendiente') in ('Pendiente', 'En Revisión')
$$;

create or replace function public.registrar_fecha_resolucion()
returns trigger language plpgsql as $$
begin
  if public.estado_abierto(new.estado) then
    new.fecha_resolucion := null;
  elsif new.fecha_resolucion is null
     or (tg_op = 'UPDATE' and public.estado_abierto(old.estado)) then
    new.fecha_resolucion := now();
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['postulaciones', 'fondo_solidario', 'fondo_aportes', 'solicitudes_beneficios', 'cuotas_sindicales'] loop
    execute format('alter table public.%I add column if not exists fecha_resolucion timestamptz', t);
    execute format('drop trigger if exists trg_fecha_resolucion on public.%I', t);
    execute format('create trigger trg_fecha_resolucion before insert or update of estado on public.%I
                    for each row execute function public.registrar_fecha_resolucion()', t);
  end loop;
end $$;


-- =====================================================================
-- D. NOTIFICACIONES LEÍDAS y BAJAS DE SOCIOS
-- =====================================================================
-- D1. Fecha en que el socio leyó la notificación (tasa y tiempo de lectura)
alter table public.notificaciones add column if not exists fecha_lectura timestamptz;

create or replace function public.registrar_fecha_lectura()
returns trigger language plpgsql as $$
begin
  if coalesce(new.leido, false) and new.fecha_lectura is null then
    new.fecha_lectura := now();
  elsif not coalesce(new.leido, false) then
    new.fecha_lectura := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_fecha_lectura on public.notificaciones;
create trigger trg_fecha_lectura before insert or update of leido on public.notificaciones
  for each row execute function public.registrar_fecha_lectura();

-- D2. Fecha de baja: cuándo un socio dejó de estar activo (suspendido, retirado...)
--     Permite graficar altas y bajas por mes.
alter table public.profiles add column if not exists fecha_baja timestamptz;

create or replace function public.registrar_fecha_baja()
returns trigger language plpgsql as $$
begin
  if lower(coalesce(new.estado, 'activo')) = 'activo' then
    new.fecha_baja := null;
  elsif new.fecha_baja is null
     or (tg_op = 'UPDATE' and lower(coalesce(old.estado, 'activo')) = 'activo') then
    new.fecha_baja := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_fecha_baja on public.profiles;
create trigger trg_fecha_baja before update of estado on public.profiles
  for each row execute function public.registrar_fecha_baja();


commit;


-- =====================================================================
-- VERIFICACIÓN (correr después; solo lee)
-- =====================================================================
select 'asistencias sin asamblea_id' as revision, count(*) as cantidad
  from public.asistencia_asambleas where asamblea_id is null
union all select 'tickets sin sindicato_id (solo si el RUT no existe en profiles)', count(*) from public.tickets_soporte where sindicato_id is null
union all select 'tickets abiertos con fecha_cierre (debe ser 0)', count(*)
  from public.tickets_soporte where fecha_cierre is not null and not public.ticket_estado_final(estado)
union all select 'triggers trg_asignar_sindicato_id (debe ser 20)', count(*) from pg_trigger where tgname = 'trg_asignar_sindicato_id'
union all select 'triggers trg_fecha_resolucion (debe ser 5)', count(*) from pg_trigger where tgname = 'trg_fecha_resolucion'
union all select 'funciones reporte_* (debe ser 17 o más)', count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'reporte_%';
