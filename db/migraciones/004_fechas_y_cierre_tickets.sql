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


-- =====================================================================
-- Verificación
-- =====================================================================
select 'tickets abiertos con fecha_cierre (debe ser 0)' as revision,
       count(*) as cantidad
  from public.tickets_soporte where fecha_cierre is not null and not public.ticket_estado_final(estado)
union all
select 'restricciones de cierre en tickets (debe ser 2)', count(*)
  from pg_constraint where conname in ('chk_ticket_cierre_solo_finalizado', 'chk_ticket_cierre_despues_creacion')
union all
select 'triggers de fecha_resolucion (debe ser 5)', count(*)
  from pg_trigger where tgname = 'trg_fecha_resolucion';
