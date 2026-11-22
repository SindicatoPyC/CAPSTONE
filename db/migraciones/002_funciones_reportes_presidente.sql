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
