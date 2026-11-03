create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_type text not null check (entity_type in ('vehicle', 'preview_session')),
  entity_id text not null,
  entity_label text,
  changed_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log
  add column if not exists actor_email text;

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
alter table public.admin_audit_log force row level security;

revoke all on public.admin_audit_log from public, anon, authenticated;
grant select on public.admin_audit_log to authenticated;

drop policy if exists "Authenticated users can read admin audit log"
  on public.admin_audit_log;
create policy "Authenticated users can read admin audit log"
  on public.admin_audit_log
  for select
  to authenticated
  using (auth.uid() is not null);

create or replace function public.log_vehicle_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_record jsonb;
  new_record jsonb;
  changed jsonb := '{}'::jsonb;
  field_name text;
  vehicle_record jsonb;
begin
  if tg_op <> 'INSERT' then
    old_record := to_jsonb(old);
  end if;
  if tg_op <> 'DELETE' then
    new_record := to_jsonb(new);
  end if;

  foreach field_name in array array[
    'make_model',
    'year',
    'fuel',
    'km',
    'price',
    'description',
    'image_url',
    'is_visible',
    'is_test'
  ]
  loop
    if old_record -> field_name is distinct from new_record -> field_name then
      changed := changed || jsonb_build_object(
        field_name,
        jsonb_build_object(
          'before', old_record -> field_name,
          'after', new_record -> field_name
        )
      );
    end if;
  end loop;

  if changed = '{}'::jsonb then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  vehicle_record := coalesce(new_record, old_record);
  insert into public.admin_audit_log (
    actor_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    entity_label,
    changed_fields
  )
  values (
    auth.uid(),
    auth.jwt() ->> 'email',
    lower(tg_op),
    'vehicle',
    vehicle_record ->> 'id',
    coalesce(new_record ->> 'make_model', old_record ->> 'make_model'),
    changed
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.log_vehicle_audit_event() from public, anon, authenticated;

drop trigger if exists vehicles_admin_audit on public.vehicles;
create trigger vehicles_admin_audit
  after insert or update or delete on public.vehicles
  for each row execute function public.log_vehicle_audit_event();

create or replace function public.log_preview_session_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_record jsonb;
  new_record jsonb;
  changed jsonb;
  session_record jsonb;
begin
  if tg_op <> 'INSERT' then
    old_record := to_jsonb(old);
  end if;
  if tg_op <> 'DELETE' then
    new_record := to_jsonb(new);
  end if;

  if old_record -> 'is_active' is not distinct from new_record -> 'is_active' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  changed := jsonb_build_object(
    'is_active',
    jsonb_build_object(
      'before', old_record -> 'is_active',
      'after', new_record -> 'is_active'
    )
  );
  session_record := coalesce(new_record, old_record);

  insert into public.admin_audit_log (
    actor_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    entity_label,
    changed_fields
  )
  values (
    auth.uid(),
    auth.jwt() ->> 'email',
    lower(tg_op),
    'preview_session',
    session_record ->> 'id',
    'Development preview',
    changed
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.log_preview_session_audit_event() from public, anon, authenticated;

drop trigger if exists preview_sessions_admin_audit on public.preview_sessions;
create trigger preview_sessions_admin_audit
  after insert or update or delete on public.preview_sessions
  for each row execute function public.log_preview_session_audit_event();
