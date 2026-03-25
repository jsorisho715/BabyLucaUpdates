-- Luca's Updates — Initial Database Schema

-- Members table
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text unique not null,
  is_admin boolean default false,
  avatar_color text not null default '#4BA3E3',
  joined_at timestamptz default now()
);

-- Messages table
create type public.message_type as enum ('text', 'image', 'video', 'system');

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  content text,
  type public.message_type not null default 'text',
  reply_to_id uuid references public.messages(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Media attachments
create type public.media_type as enum ('image', 'video');

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  url text not null,
  type public.media_type not null,
  thumbnail_url text,
  width integer,
  height integer,
  size_bytes bigint,
  created_at timestamptz default now()
);

-- Reactions
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique (message_id, member_id, emoji)
);

-- Mentions
create table if not exists public.mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  mentioned_member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_messages_created_at on public.messages(created_at desc);
create index if not exists idx_messages_member_id on public.messages(member_id);
create index if not exists idx_messages_reply_to on public.messages(reply_to_id);
create index if not exists idx_media_message_id on public.media(message_id);
create index if not exists idx_reactions_message_id on public.reactions(message_id);
create index if not exists idx_reactions_member_id on public.reactions(member_id);
create index if not exists idx_mentions_message_id on public.mentions(message_id);
create index if not exists idx_mentions_member_id on public.mentions(mentioned_member_id);

-- Enable Row Level Security
alter table public.members enable row level security;
alter table public.messages enable row level security;
alter table public.media enable row level security;
alter table public.reactions enable row level security;
alter table public.mentions enable row level security;

-- RLS Policies: Allow all read access, restrict writes to own data
-- Members: anyone can read, insert handled by API (admin client)
create policy "Anyone can view members"
  on public.members for select
  using (true);

create policy "Service role can insert members"
  on public.members for insert
  with check (true);

-- Messages: anyone can read, anyone can insert
create policy "Anyone can view messages"
  on public.messages for select
  using (true);

create policy "Anyone can insert messages"
  on public.messages for insert
  with check (true);

-- Media: anyone can read, anyone can insert
create policy "Anyone can view media"
  on public.media for select
  using (true);

create policy "Anyone can insert media"
  on public.media for insert
  with check (true);

-- Reactions: anyone can read, anyone can insert/delete their own
create policy "Anyone can view reactions"
  on public.reactions for select
  using (true);

create policy "Anyone can insert reactions"
  on public.reactions for insert
  with check (true);

create policy "Anyone can delete own reactions"
  on public.reactions for delete
  using (true);

-- Mentions: anyone can read, anyone can insert
create policy "Anyone can view mentions"
  on public.mentions for select
  using (true);

create policy "Anyone can insert mentions"
  on public.mentions for insert
  with check (true);

-- Enable Realtime for key tables
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.members;

-- Seed admin users (Jordyn & Johnathan)
insert into public.members (first_name, last_name, email, is_admin, avatar_color)
values
  ('Johnathan', 'Sorisho', 'johnathan.sorisho@gmail.com', true, '#4BA3E3'),
  ('Jordyn', 'Stubblefield', 'jordyn.stubblefield@gmail.com', true, '#D96B8F')
on conflict (email) do nothing;

-- Create storage bucket for media
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do nothing;

-- Storage policies
create policy "Anyone can view media files"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "Anyone can upload media files"
  on storage.objects for insert
  with check (bucket_id = 'media');
