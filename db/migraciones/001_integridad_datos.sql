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


-- ---------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------
select 'asistencias sin asamblea_id' as revision, count(*) as cantidad
  from public.asistencia_asambleas where asamblea_id is null
union all
select 'tickets sin sindicato_id', count(*) from public.tickets_soporte where sindicato_id is null
union all
select 'solicitudes de beneficios sin sindicato_id', count(*) from public.solicitudes_beneficios where sindicato_id is null
union all
select 'triggers de sindicato_id creados', count(*) from pg_trigger where tgname = 'trg_asignar_sindicato_id';
