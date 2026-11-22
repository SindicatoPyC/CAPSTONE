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

-- ---------------------------------------------------------------------
-- Opcional, solo en dev: asignar planes distintos a los sindicatos de demo
-- para que el gráfico de planes no salga todo en "Básico".
-- ---------------------------------------------------------------------
update public.sindicatos set plan = 'Estándar' where nombre = 'Sindicato Demo PYC'        and plan = 'Básico';
update public.sindicatos set plan = 'Premium'  where nombre = 'Sindicato Minero Sur'      and plan = 'Básico';
