-- TACN Connect database foundation
-- Run this file in a new Supabase project through the SQL Editor.

create extension if not exists pgcrypto;

create type public.account_status as enum ('pending', 'active', 'suspended');
create type public.event_visibility as enum ('public', 'members', 'leaders');
create type public.message_status as enum ('draft', 'scheduled', 'sent', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null,
  phone text,
  date_of_birth date,
  bio text check (char_length(bio) <= 500),
  avatar_url text,
  account_status public.account_status not null default 'pending',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  label text not null,
  description text not null default '',
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  label text not null,
  description text not null default ''
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 140),
  description text not null default '',
  venue text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  visibility public.event_visibility not null default 'members',
  cover_url text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 140),
  body text not null check (char_length(body) between 2 and 5000),
  visibility public.event_visibility not null default 'members',
  is_pinned boolean not null default false,
  published_at timestamptz default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.birthday_messages (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 2 and 600),
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.flyers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  template_name text not null,
  greeting text not null default '',
  image_url text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  link text,
  audience text not null default 'all',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.notification_receipts (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create table public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete set null,
  channel text not null check (channel in ('email', 'sms')),
  subject text,
  body text not null,
  status public.message_status not null default 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  provider_reference text,
  failure_reason text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_birthday_idx on public.profiles (
  extract(month from date_of_birth),
  extract(day from date_of_birth)
);
create index profiles_status_idx on public.profiles(account_status);
create index events_starts_idx on public.events(starts_at);
create index notifications_created_idx on public.notifications(created_at desc);
create index audit_created_idx on public.audit_log(created_at desc);

insert into public.roles (name, label, description) values
  ('general_admin', 'General Admin', 'Complete platform access and role management'),
  ('admin', 'Admin', 'Approved administration access'),
  ('birthday_manager', 'Birthday Manager', 'Manage birthdays, greetings, and flyers'),
  ('event_manager', 'Event Manager', 'Manage church events'),
  ('content_manager', 'Content Manager', 'Manage announcements and public content'),
  ('member_manager', 'Member Manager', 'Review registrations and manage member profiles'),
  ('notification_manager', 'Notification Manager', 'Manage member notifications'),
  ('member', 'Member', 'Standard church member access')
on conflict (name) do nothing;

insert into public.permissions (name, label, description) values
  ('members.read', 'View members', 'View member records allowed by privacy policy'),
  ('members.manage', 'Manage members', 'Approve and update member records'),
  ('birthdays.manage', 'Manage birthdays', 'Create greetings, flyers, and birthday content'),
  ('events.manage', 'Manage events', 'Create and update events'),
  ('content.manage', 'Manage content', 'Create and update announcements'),
  ('notifications.manage', 'Manage notifications', 'Send and manage notifications'),
  ('roles.manage', 'Manage roles', 'Grant and revoke roles and permissions'),
  ('messages.manage', 'Manage messages', 'Create email and SMS messages'),
  ('audit.read', 'View audit records', 'Review sensitive administrator activity')
on conflict (name) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.name = 'general_admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p
  on (r.name = 'admin' and p.name in ('members.read', 'members.manage', 'birthdays.manage', 'events.manage', 'content.manage', 'notifications.manage', 'messages.manage'))
  or (r.name = 'birthday_manager' and p.name in ('members.read', 'birthdays.manage'))
  or (r.name = 'event_manager' and p.name = 'events.manage')
  or (r.name = 'content_manager' and p.name = 'content.manage')
  or (r.name = 'member_manager' and p.name in ('members.read', 'members.manage'))
  or (r.name = 'notification_manager' and p.name = 'notifications.manage')
on conflict do nothing;

create or replace function public.has_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid() and p.name = required_permission
  );
$$;

create or replace function public.is_general_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'general_admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_role_id uuid;
begin
  insert into public.profiles (id, full_name, email, date_of_birth)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    case
      when coalesce(new.raw_user_meta_data ->> 'date_of_birth', '') ~ '^\d{4}-\d{2}-\d{2}$'
      then (new.raw_user_meta_data ->> 'date_of_birth')::date
      else null
    end
  );

  select id into member_role_id from public.roles where name = 'member';
  insert into public.user_roles (user_id, role_id) values (new.id, member_role_id);

  insert into public.notifications (title, body, link, audience)
  values (
    'New Member',
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)) || ' created an account.',
    '/admin/registrations',
    'general_admin'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events
for each row execute function public.set_updated_at();
create trigger announcements_updated_at before update on public.announcements
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.events enable row level security;
alter table public.announcements enable row level security;
alter table public.birthday_messages enable row level security;
alter table public.flyers enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_receipts enable row level security;
alter table public.outbound_messages enable row level security;
alter table public.audit_log enable row level security;

create policy "Members can view approved profiles"
on public.profiles for select to authenticated
using (
  account_status = 'active'
  or id = auth.uid()
  or public.has_permission('members.read')
);

create policy "Members update their own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Member managers update profiles"
on public.profiles for update to authenticated
using (public.has_permission('members.manage'))
with check (public.has_permission('members.manage'));

create policy "Authenticated users view roles"
on public.roles for select to authenticated using (true);
create policy "Authenticated users view permissions"
on public.permissions for select to authenticated using (true);
create policy "Authenticated users view role permissions"
on public.role_permissions for select to authenticated using (true);

create policy "Users view their own roles"
on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.has_permission('roles.manage'));

create policy "General Admin grants roles"
on public.user_roles for insert to authenticated
with check (public.has_permission('roles.manage'));

create policy "General Admin revokes roles"
on public.user_roles for delete to authenticated
using (public.has_permission('roles.manage'));

create policy "Members view relevant events"
on public.events for select
using (
  visibility = 'public'
  or (visibility = 'members' and auth.uid() is not null)
  or public.has_permission('events.manage')
);

create policy "Event managers create events"
on public.events for insert to authenticated
with check (public.has_permission('events.manage') and created_by = auth.uid());

create policy "Event managers update events"
on public.events for update to authenticated
using (public.has_permission('events.manage'))
with check (public.has_permission('events.manage'));

create policy "Event managers delete events"
on public.events for delete to authenticated
using (public.has_permission('events.manage'));

create policy "Members view relevant announcements"
on public.announcements for select
using (
  visibility = 'public'
  or (visibility = 'members' and auth.uid() is not null)
  or public.has_permission('content.manage')
);

create policy "Content managers create announcements"
on public.announcements for insert to authenticated
with check (public.has_permission('content.manage') and created_by = auth.uid());

create policy "Content managers update announcements"
on public.announcements for update to authenticated
using (public.has_permission('content.manage'))
with check (public.has_permission('content.manage'));

create policy "Content managers delete announcements"
on public.announcements for delete to authenticated
using (public.has_permission('content.manage'));

create policy "Members view public birthday messages"
on public.birthday_messages for select to authenticated
using (is_public or author_id = auth.uid() or recipient_id = auth.uid());

create policy "Members create birthday messages"
on public.birthday_messages for insert to authenticated
with check (author_id = auth.uid());

create policy "Authors manage birthday messages"
on public.birthday_messages for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "Authors delete birthday messages"
on public.birthday_messages for delete to authenticated
using (author_id = auth.uid() or public.has_permission('birthdays.manage'));

create policy "Members view relevant flyers"
on public.flyers for select to authenticated
using (member_id = auth.uid() or created_by = auth.uid() or public.has_permission('birthdays.manage'));

create policy "Birthday managers create flyers"
on public.flyers for insert to authenticated
with check (created_by = auth.uid() and (member_id = auth.uid() or public.has_permission('birthdays.manage')));

create policy "Authenticated users view notifications"
on public.notifications for select to authenticated
using (
  audience = 'all'
  or audience = 'members'
  or (audience = 'general_admin' and public.is_general_admin())
);

create policy "Notification managers create notifications"
on public.notifications for insert to authenticated
with check (public.has_permission('notifications.manage'));

create policy "Users manage their notification receipts"
on public.notification_receipts for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Message managers view messages"
on public.outbound_messages for select to authenticated
using (public.has_permission('messages.manage'));

create policy "Message managers create messages"
on public.outbound_messages for insert to authenticated
with check (public.has_permission('messages.manage') and created_by = auth.uid());

create policy "General Admin views audit records"
on public.audit_log for select to authenticated
using (public.has_permission('audit.read'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'flyers',
  'flyers',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public avatar viewing"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users upload their own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users update their own avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users delete their own avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Public flyer viewing"
on storage.objects for select
using (bucket_id = 'flyers');

create policy "Birthday managers upload flyers"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'flyers'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_permission('birthdays.manage')
  )
);

grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.is_general_admin() to authenticated;
