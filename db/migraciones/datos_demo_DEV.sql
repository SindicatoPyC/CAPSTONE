-- =====================================================================
-- DATOS DE DEMOSTRACIÓN · Correr SOLO en sindicato-dev (SQL Editor)
-- Todos los nombres, RUT, correos y teléfonos son ficticios.
--
-- Usa las 3 cuentas creadas en Authentication:
--   admin@testing.com       → superadmin (Master SaaS)
--   presidente@testing.com  → presidente (rol 'admin') del Sindicato Demo PYC
--   socio@testing.com       → socio del Sindicato Demo PYC
--
-- Crea 3 sindicatos ficticios, 30 socios ficticios y 6 meses de actividad
-- con fechas relativas a hoy, para que los gráficos se vean actuales.
-- Se puede volver a correr: primero borra los datos de demo anteriores.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funciones temporales (solo existen mientras corre este script)
-- ---------------------------------------------------------------------
-- RUT con dígito verificador válido, sin puntos ni guion (123456789),
-- que es el formato que usa el login de la app
create or replace function pg_temp.rut(n int) returns text language plpgsql as $$
declare s int := 0; m int := 2; x int := n; r int;
begin
  while x > 0 loop
    s := s + (x % 10) * m; x := x / 10; m := case when m = 7 then 2 else m + 1 end;
  end loop;
  r := 11 - (s % 11);
  return n::text || case r when 11 then '0' when 10 then 'K' else r::text end;
end $$;

create or replace function pg_temp.mes_es(d timestamptz) returns text language sql as $$
  select (array['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto',
                'Septiembre','Octubre','Noviembre','Diciembre'])[extract(month from d)::int]
$$;

-- ---------------------------------------------------------------------
-- 1. Limpieza de datos de demo anteriores
-- ---------------------------------------------------------------------
do $$
declare ids int[];
begin
  select array_agg(id) into ids from public.sindicatos
  where nombre in ('Sindicato Demo PYC', 'Sindicato Comercial Norte', 'Sindicato Minero Sur');

  delete from public.solicitudes_beneficios
  where user_id in (select id from auth.users where email like '%@demo-pyc.cl'
                                               or email in ('admin@testing.com', 'presidente@testing.com', 'socio@testing.com'))
     or beneficio_id in (select id from public.beneficios where sindicato_id = any(coalesce(ids, '{}')));

  if ids is not null then
    delete from public.historial_asambleas where sindicato_id = any(ids);
    delete from public.profiles where sindicato_id = any(ids);
    delete from public.sindicatos where id = any(ids);   -- borra en cascada el resto de sus datos
  end if;

  delete from public.profiles where email in ('admin@testing.com', 'presidente@testing.com', 'socio@testing.com');
  delete from auth.users where email like '%@demo-pyc.cl';
end $$;

-- ---------------------------------------------------------------------
-- 2. Datos de demostración
-- ---------------------------------------------------------------------
do $$
declare
  s1 int; s2 int; s3 int;
  u_admin uuid; u_pres uuid; u_socio uuid;
  nombres   text[] := array['Camila','Matías','Valentina','Benjamín','Javiera','Vicente','Catalina','Joaquín',
                            'Fernanda','Tomás','Constanza','Diego','Francisca','Felipe','Daniela','Sebastián',
                            'Antonia','Cristóbal','Paula','Ignacio','Macarena','Nicolás','Josefa','Martín',
                            'Carolina','Pablo','Isidora','Rodrigo','Florencia','Gonzalo'];
  apellidos text[] := array['González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva','Martínez','Sepúlveda',
                            'Morales','Rodríguez','López','Fuentes','Hernández','Torres','Araya','Flores','Espinoza','Valenzuela'];
  i int; j int; n int; k int; uid uuid; sid int; fecha timestamptz; alta timestamptz; nombre text; correo text;
  titulos_asamblea text[] := array['Asamblea ordinaria de junio','Asamblea ordinaria de julio','Asamblea extraordinaria: bono de invierno',
                                   'Asamblea ordinaria de septiembre','Votación del petitorio','Asamblea ordinaria de noviembre'];
  tasas numeric[] := array[0.55, 0.45, 0.72, 0.38, 0.82, 0.60];
  enc_id bigint; vot_id uuid; neg_id int;
begin
  perform setseed(0.42);

  select id into u_admin from auth.users where email = 'admin@testing.com';
  select id into u_pres  from auth.users where email = 'presidente@testing.com';
  select id into u_socio from auth.users where email = 'socio@testing.com';
  if u_admin is null or u_pres is null or u_socio is null then
    raise exception 'Falta crear alguna de las 3 cuentas en Authentication (admin, presidente, socio @testing.com)';
  end if;

  -- Sindicatos -------------------------------------------------------
  insert into public.sindicatos (nombre, rut_sindicato, estado, created_at)
  values ('Sindicato Demo PYC', pg_temp.rut(65000001), 'Activo', now() - interval '8 months') returning id into s1;
  insert into public.sindicatos (nombre, rut_sindicato, estado, created_at)
  values ('Sindicato Comercial Norte', pg_temp.rut(65000002), 'Activo', now() - interval '5 months') returning id into s2;
  insert into public.sindicatos (nombre, rut_sindicato, estado, created_at)
  values ('Sindicato Minero Sur', pg_temp.rut(65000003), 'Activo', now() - interval '2 months') returning id into s3;

  -- Perfiles de las 3 cuentas para iniciar sesión ----------------------
  -- El superadmin queda asociado al sindicato demo igual que en producción.
  insert into public.profiles (id, rut, email, full_name, role, sindicato_id, estado, created_at) values
    (u_admin, pg_temp.rut(10000001), 'admin@testing.com',      'Administrador Plataforma', 'superadmin', s1, 'activo', now() - interval '8 months'),
    (u_pres,  pg_temp.rut(10000002), 'presidente@testing.com', 'Presidente Demo',          'admin',      s1, 'activo', now() - interval '8 months'),
    (u_socio, pg_temp.rut(10000003), 'socio@testing.com',      'Socio Demo',               'socio',      s1, 'activo', now() - interval '7 months');

  -- 30 socios ficticios: 20 en el demo, 6 en Comercial Norte, 4 en Minero Sur
  for i in 1..30 loop
    uid := gen_random_uuid();
    sid := case when i <= 20 then s1 when i <= 26 then s2 else s3 end;
    -- en el demo, las altas crecen mes a mes
    alta := case when i <= 20 then now() - ((230 - i * 10) + floor(random() * 6)) * interval '1 day'
                 when i <= 26 then now() - (40 + floor(random() * 100)) * interval '1 day'
                 else now() - (10 + floor(random() * 40)) * interval '1 day' end;
    nombre := nombres[i] || ' ' || apellidos[1 + (i * 7) % 20] || ' ' || apellidos[1 + (i * 3) % 20];
    correo := 'socio' || lpad(i::text, 2, '0') || '@demo-pyc.cl';

    -- Usuario de Auth sin contraseña: existe para el padrón, pero no puede iniciar sesión
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', correo, '', alta,
            alta, alta, '{"provider":"email","providers":["email"]}', '{}', '', '', '', '');

    insert into public.profiles (id, rut, email, full_name, role, sindicato_id, estado, created_at)
    values (uid, pg_temp.rut(15000000 + i * 37), correo, nombre, 'socio', sid, 'activo', alta);
  end loop;

  -- Asambleas y asistencia (Sindicato Demo PYC) ------------------------
  for k in 1..6 loop
    fecha := least(date_trunc('month', now()) - make_interval(months => 6 - k) + interval '9 days 18 hours 30 minutes',
                   now() - interval '1 day');
    insert into public.historial_asambleas (sindicato_id, titulo, link_reunion, created_at, created_by, creador_nombre)
    values (s1, titulos_asamblea[k], 'https://meet.jit.si/sindicato-demo-' || k, fecha - interval '7 days', u_pres, 'Presidente Demo');

    insert into public.asistencia_asambleas (asamblea_titulo, usuario_rut, fecha_asistencia, user_id, estado, hora_entrada,
                                             hora_salida, sindicato_id, usuario_nombre, usuario_rol, operador_nombre, usuario_email)
    select titulos_asamblea[k], p.rut, fecha + (random() * 20) * interval '1 minute', p.id, 'Presente',
           fecha + (random() * 20) * interval '1 minute', fecha + interval '2 hours', s1,
           p.full_name, p.role, 'Presidente Demo', p.email
    from public.profiles p
    where p.sindicato_id = s1 and p.role in ('socio', 'admin') and p.created_at < fecha
      and random() < tasas[k];
  end loop;

  -- Algo de asistencia en los otros sindicatos (para el reporte del Admin)
  insert into public.historial_asambleas (sindicato_id, titulo, created_at, creador_nombre)
  values (s2, 'Asamblea constitutiva Comercial Norte', now() - interval '20 days', 'Directiva Comercial Norte');
  insert into public.asistencia_asambleas (asamblea_titulo, usuario_rut, fecha_asistencia, user_id, estado, sindicato_id, usuario_nombre, usuario_rol, usuario_email)
  select 'Asamblea constitutiva Comercial Norte', p.rut, now() - interval '20 days', p.id, 'Presente', s2, p.full_name, p.role, p.email
  from public.profiles p where p.sindicato_id = s2 and random() < 0.7;

  -- Encuestas con votos ----------------------------------------------
  for k in 1..4 loop
    insert into public.encuestas_clima (titulo, categoria, opcion_a, opcion_b, created_at, sindicato_id)
    values ((array['¿Prefieres jornada de verano con salida a las 16:00?','¿Renovamos el convenio dental?',
                   '¿Celebramos la fiesta de fin de año en diciembre?','¿Te parece adecuado el horario de las asambleas?'])[k],
            (array['Jornada laboral','Beneficios','Actividades','Participación'])[k],
            'Sí', 'No', now() - ((5 - k) * 35 + 5) * interval '1 day', s1)
    returning id into enc_id;

    insert into public.votos_encuestas (encuesta_id, user_id, opcion, sindicato_id)
    select enc_id, p.id, case when random() < 0.65 then 'A' else 'B' end, s1
    from public.profiles p
    where p.sindicato_id = s1 and p.role in ('socio', 'admin')
      and random() < (array[0.85, 0.70, 0.60, 0.75])[k];

    update public.encuestas_clima e set
      votos_a = (select count(*) from public.votos_encuestas v where v.encuesta_id = e.id and v.opcion = 'A'),
      votos_b = (select count(*) from public.votos_encuestas v where v.encuesta_id = e.id and v.opcion = 'B')
    where e.id = enc_id;
  end loop;

  -- Votaciones en asamblea --------------------------------------------
  for k in 1..3 loop
    insert into public.asambleas_votaciones (titulo, estado, fecha_cierre, sindicato_id)
    values ((array['Aprobación del petitorio 2026','Elección del delegado de seguridad','Uso del fondo para actividad de fin de año'])[k],
            case when k < 3 then 'Cerrada' else 'Abierta' end,
            now() - ((3 - k) * 30 + 3) * interval '1 day' + case when k = 3 then interval '10 days' else interval '0' end, s1)
    returning id into vot_id;

    insert into public.votos_registrados (asamblea_id, usuario_rut, opcion_elegida, fecha_voto, sindicato_id)
    select vot_id, p.rut,
           case when random() < 0.7 then 'Apruebo' when random() < 0.7 then 'Rechazo' else 'Abstención' end,
           now() - ((3 - k) * 30 + 4) * interval '1 day', s1
    from public.profiles p
    where p.sindicato_id = s1 and p.role in ('socio', 'admin') and random() < (array[0.80, 0.65, 0.40])[k];
  end loop;

  -- Tickets de soporte -----------------------------------------------
  for i in 1..24 loop
    sid := case when i <= 18 then s1 when i <= 22 then s2 else s3 end;
    j := case when i <= 18 then i when i <= 22 then i - 18 else i - 22 end;
    n := case when i <= 18 then 18 when i <= 22 then 4 else 2 end;
    fecha := now() - ((n - j) * (170.0 / n) + floor(random() * 4)) * interval '1 day';
    insert into public.tickets_soporte (created_at, usuario_rut, asunto, mensaje, estado, respuesta_admin, sindicato_id)
    select fecha, p.rut,
           (array['Consulta convenio dental','No puedo descargar el acta','Duda sobre descuento de cuota',
                  'Problema con mi credencial QR','Consulta sobre días de vacaciones','Solicitud de certificado de afiliación'])[1 + i % 6],
           'Mensaje de prueba generado para la demostración.',
           case when fecha < now() - interval '30 days' then 'Resuelto'
                when j % 2 = 0 then 'Pendiente' else 'En Revisión' end,
           case when fecha < now() - interval '30 days' then 'Respuesta de prueba de la directiva.' end,
           sid
    from public.profiles p
    where p.sindicato_id = sid and p.role = 'socio'
    order by random() limit 1;
  end loop;

  -- Postulaciones ----------------------------------------------------
  for i in 1..22 loop
    sid := case when i <= 16 then s1 when i <= 19 then s2 else s3 end;
    j := case when i <= 16 then i when i <= 19 then i - 16 else i - 19 end;
    n := case when i <= 16 then 16 else 3 end;
    fecha := now() - ((n - j) * (170.0 / n) + floor(random() * 4)) * interval '1 day';
    insert into public.postulaciones (rut, full_name, email, estado, created_at, telefono, sindicato_id, rol_solicitado)
    values (pg_temp.rut(18000000 + i * 53),
            nombres[1 + (i * 5) % 30] || ' ' || apellidos[1 + (i * 11) % 20],
            'postulante' || lpad(i::text, 2, '0') || '@demo-pyc.cl',
            case when fecha > now() - interval '20 days' then 'Pendiente'
                 when random() < 0.78 then 'Aprobada' else 'Rechazada' end,
            fecha, '+56 9 0000 00' || lpad(i::text, 2, '0'), sid, 'socio');
  end loop;

  -- Cuotas de los últimos 6 meses (Sindicato Demo PYC) ----------------
  -- Revisar en producción cómo se guarda "mes" (select distinct mes from cuotas_sindicales);
  -- aquí se usa el nombre del mes en español: 'Junio', 'Julio', ...
  for k in 0..5 loop
    fecha := date_trunc('month', now()) - make_interval(months => k) + interval '5 days';
    insert into public.cuotas_sindicales (usuario_rut, mes, anio, monto, estado, fecha_pago, comprobante_url, sindicato_id)
    select p.rut, pg_temp.mes_es(fecha), extract(year from fecha)::int, 8000,
           case when k = 0 then (case when random() < 0.45 then 'Pagado' when random() < 0.5 then 'En Revisión' else 'Pendiente' end)
                else (case when random() < 0.80 then 'Pagado' when random() < 0.6 then 'Aprobado' else 'Pendiente' end) end,
           least(fecha + (random() * 10) * interval '1 day', now()), null, s1
    from public.profiles p
    where p.sindicato_id = s1 and p.role in ('socio', 'admin') and p.created_at < fecha + interval '1 month';
  end loop;

  -- Fondo solidario --------------------------------------------------
  -- fondo_meta usa id = 1 fijo, así que solo un sindicato puede tener meta (bug conocido).
  insert into public.fondo_meta (id, monto_meta, sindicato_id) values (1, 1500000, s1)
  on conflict (id) do update set monto_meta = excluded.monto_meta, sindicato_id = excluded.sindicato_id;

  insert into public.fondo_aportes (user_id, rut, nombre, monto, comprobante_url, estado, created_at, sindicato_id)
  select p.id, p.rut, p.full_name, (5 + floor(random() * 6) * 5) * 1000, null,
         case when random() < 0.8 then 'Aprobado' else 'Pendiente' end,
         now() - (floor(random() * 150) + 1) * interval '1 day', s1
  from public.profiles p
  where p.sindicato_id = s1 and p.role in ('socio', 'admin')
  order by random() limit 14;

  insert into public.fondo_solidario (usuario_rut, tipo_beneficio, monto_solicitado, descripcion, estado, created_at, sindicato_id)
  select p.rut,
         (array['Fallecimiento de familiar','Enfermedad grave','Nacimiento','Catástrofe en el hogar'])[1 + (row_number() over ()) % 4],
         (100 + floor(random() * 4) * 50) * 1000,
         'Solicitud de prueba para la demostración.',
         (array['Aprobado','Aprobado','En Revisión','Rechazado','Aprobado','En Revisión'])[row_number() over ()],
         now() - (row_number() over ()) * 25 * interval '1 day', s1
  from (select * from public.profiles where sindicato_id = s1 and role = 'socio' order by random() limit 6) p;

  -- Negociación colectiva --------------------------------------------
  insert into public.negociacion_info (titulo, descripcion, petitorio_url, estado, sindicato_id)
  values ('Negociación Colectiva 2026', 'Proceso de negociación del contrato colectivo 2026-2028.', null, 'Activa', s1)
  returning id into neg_id;

  insert into public.hitos_negociacion (titulo, descripcion, fecha, estado, negociacion_id, sindicato_id) values
    ('Aprobación del petitorio en asamblea', 'Los socios aprobaron el petitorio.',         (now() - interval '50 days')::date, 'Completado', neg_id, s1),
    ('Entrega del petitorio a la empresa',   'Se entregó el petitorio a gerencia.',         (now() - interval '35 days')::date, 'Completado', neg_id, s1),
    ('Respuesta de la empresa',              'La empresa revisa la propuesta.',             (now() - interval '5 days')::date,  'Actual',     neg_id, s1),
    ('Mesas de negociación',                 'Reuniones entre directiva y empresa.',        (now() + interval '15 days')::date, 'Pendiente',  neg_id, s1),
    ('Firma del contrato colectivo',         'Firma del nuevo contrato.',                   (now() + interval '45 days')::date, 'Pendiente',  neg_id, s1);

  -- Comunicados ------------------------------------------------------
  insert into public.comunicados (autor_id, titulo, contenido, fecha_creacion, sindicato_id)
  select u_pres, t.titulo, 'Comunicado de prueba generado para la demostración.', now() - t.dias * interval '1 day', s1
  from (values ('Convocatoria a asamblea ordinaria', 3), ('Avances de la negociación colectiva', 12),
               ('Nuevo convenio con óptica', 28), ('Resultados de la encuesta de verano', 45),
               ('Recordatorio: actualiza tus datos', 70), ('Bienvenida a los nuevos socios', 110)) as t(titulo, dias);

  insert into public.comunicados (autor_id, titulo, contenido, fecha_creacion, sindicato_id)
  values (null, 'Bienvenidos a Comercial Norte', 'Comunicado de prueba.', now() - interval '10 days', s2);

  -- Beneficios y solicitudes -----------------------------------------
  insert into public.beneficios (titulo, categoria, descripcion, descuento, sindicato_id) values
    ('Convenio dental',          'Salud',      'Atención dental con descuento para socios y cargas.', '30%', s1),
    ('Óptica',                   'Salud',      'Descuento en lentes ópticos y de sol.',               '20%', s1),
    ('Gimnasio',                 'Bienestar',  'Plan mensual con precio preferente.',                 '25%', s1),
    ('Bono de escolaridad',      'Educación',  'Aporte anual por hijo en edad escolar.',              NULL,  s1),
    ('Cine',                     'Recreación', 'Entradas a precio preferente.',                       '2x1', s1);

  insert into public.solicitudes_beneficios (user_id, beneficio_id, rut, email, estado, created_at)
  select p.id, b.id, p.rut, p.email,
         case when random() < 0.7 then 'Aprobado' else 'Pendiente' end,
         now() - (floor(random() * 120) + 1) * interval '1 day'
  from public.profiles p
  join lateral (select id from public.beneficios
                where sindicato_id = s1 and p.id is not null
                order by random() limit 1) b on true
  where p.sindicato_id = s1 and p.role = 'socio' and random() < 0.75;

  -- Agenda legal -----------------------------------------------------
  insert into public.agenda_legal (usuario_rut, motivo, fecha_reserva, hora_reserva, estado, created_at, sindicato_id)
  select p.rut,
         (array['Despido','Vacaciones','Licencia médica','Horas extra','Contrato de trabajo'])[1 + (row_number() over ()) % 5],
         (now() - (row_number() over ()) * 14 * interval '1 day' + interval '30 days')::date,
         (array['10:00','11:30','15:00','16:30'])[1 + (row_number() over ()) % 4],
         case when (row_number() over ()) <= 2 then 'Pendiente' else 'Confirmada' end,
         now() - (row_number() over ()) * 14 * interval '1 day', s1
  from (select * from public.profiles where sindicato_id = s1 and role = 'socio' order by random() limit 9) p;

  -- Libro de actas ---------------------------------------------------
  insert into public.libro_actas (titulo, tipo_asamblea, fecha_reunion, resumen_acuerdos, created_at, sindicato_id)
  select h.titulo, case when h.titulo ilike '%extraordinaria%' then 'Extraordinaria' else 'Ordinaria' end,
         (h.created_at + interval '7 days')::date, 'Acta de prueba generada para la demostración.',
         h.created_at + interval '8 days', s1
  from public.historial_asambleas h
  where h.sindicato_id = s1 and h.created_at + interval '8 days' < now();

  -- Si ya se aplicó la migración 001, dar fecha de respuesta a los tickets resueltos
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tickets_soporte' and column_name = 'fecha_respuesta') then
    execute $q$update public.tickets_soporte
               set fecha_respuesta = created_at + (2 + floor(random() * 70)) * interval '1 hour'
               where estado = 'Resuelto' and fecha_respuesta is null and respuesta_admin is not null$q$;
  end if;

  raise notice 'Listo. Sindicato Demo PYC = id %, Comercial Norte = id %, Minero Sur = id %', s1, s2, s3;
end $$;

-- ---------------------------------------------------------------------
-- 3. Resumen de lo que quedó cargado
-- ---------------------------------------------------------------------
select s.id, s.nombre,
  (select count(*) from public.profiles p where p.sindicato_id = s.id)               as usuarios,
  (select count(*) from public.asistencia_asambleas a where a.sindicato_id = s.id)   as asistencias,
  (select count(*) from public.tickets_soporte t where t.sindicato_id = s.id)        as tickets,
  (select count(*) from public.postulaciones x where x.sindicato_id = s.id)          as postulaciones,
  (select count(*) from public.votos_encuestas v where v.sindicato_id = s.id)        as votos_encuestas,
  (select count(*) from public.cuotas_sindicales c where c.sindicato_id = s.id)      as cuotas
from public.sindicatos s
order by s.id;

-- RUT de las 3 cuentas (en el login se pueden escribir con guion: 10000002-4)
select email, rut, role from public.profiles
where email in ('admin@testing.com', 'presidente@testing.com', 'socio@testing.com')
order by role;
