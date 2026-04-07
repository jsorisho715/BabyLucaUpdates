-- =============================================
-- Luca's Updates — Full Schema
-- Paste this into Supabase Dashboard > SQL Editor > New Query > Run
-- =============================================

-- Members
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text unique not null,
  is_admin boolean default false,
  avatar_color text not null default '#4BA3E3',
  joined_at timestamptz default now()
);

-- Message + media types
do $$ begin
  create type public.message_type as enum ('text', 'image', 'video', 'audio', 'system');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.media_type as enum ('image', 'video', 'audio');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.board_item_type as enum ('photo', 'note');
exception when duplicate_object then null;
end $$;

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  content text,
  type public.message_type not null default 'text',
  reply_to_id uuid references public.messages(id) on delete set null,
  is_pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Media
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

-- Notes (for the parents)
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Vision board items
create table if not exists public.vision_board_items (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  type public.board_item_type not null,
  content text not null,
  x float not null default 0.5,
  y float not null default 0.5,
  rotation float not null default 0,
  color text default '#FEF3C7',
  width float default 200,
  height float default 200,
  created_at timestamptz default now()
);

-- Baby stats
create table if not exists public.baby_stats (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Luca',
  birth_date timestamptz,
  weight_lbs float,
  weight_oz float,
  length_inches float,
  notes text,
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Message reads (read receipts)
create table if not exists public.message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  read_at timestamptz default now(),
  unique (message_id, member_id)
);

-- Indexes
create index if not exists idx_messages_created_at on public.messages(created_at desc);
create index if not exists idx_messages_member_id on public.messages(member_id);
create index if not exists idx_messages_reply_to on public.messages(reply_to_id);
create index if not exists idx_media_message_id on public.media(message_id);
create index if not exists idx_reactions_message_id on public.reactions(message_id);
create index if not exists idx_reactions_member_id on public.reactions(member_id);
create index if not exists idx_mentions_message_id on public.mentions(message_id);
create index if not exists idx_mentions_member_id on public.mentions(mentioned_member_id);
create index if not exists idx_notes_created_at on public.notes(created_at desc);
create index if not exists idx_message_reads_message_id on public.message_reads(message_id);
create index if not exists idx_message_reads_member_id on public.message_reads(member_id);

-- Enable RLS
alter table public.members enable row level security;
alter table public.messages enable row level security;
alter table public.media enable row level security;
alter table public.reactions enable row level security;
alter table public.mentions enable row level security;
alter table public.notes enable row level security;
alter table public.vision_board_items enable row level security;
alter table public.baby_stats enable row level security;
alter table public.message_reads enable row level security;

-- RLS Policies (using DO blocks to avoid errors if they already exist)
do $$ begin
  create policy "Anyone can view members" on public.members for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can insert members" on public.members for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can view messages" on public.messages for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can insert messages" on public.messages for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can update messages" on public.messages for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can update messages" on public.messages for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can view media" on public.media for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can insert media" on public.media for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can view reactions" on public.reactions for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can insert reactions" on public.reactions for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can delete own reactions" on public.reactions for delete using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can view mentions" on public.mentions for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can insert mentions" on public.mentions for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can view notes" on public.notes for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can insert notes" on public.notes for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can view board items" on public.vision_board_items for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can insert board items" on public.vision_board_items for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can update own board items" on public.vision_board_items for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can delete own board items" on public.vision_board_items for delete using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can view message reads" on public.message_reads for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can insert message reads" on public.message_reads for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can view baby stats" on public.baby_stats for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can insert baby stats" on public.baby_stats for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can update baby stats" on public.baby_stats for update using (true);
exception when duplicate_object then null; end $$;

-- Enable Realtime
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.reactions;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.members;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notes;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.vision_board_items;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.message_reads;
exception when duplicate_object then null; end $$;

-- Seed parents
insert into public.members (first_name, last_name, email, is_admin, avatar_color)
values
  ('Johnathan', 'Sorisho', 'johnathan.sorisho@gmail.com', true, '#4BA3E3'),
  ('Jordyn', 'Stubblefield', 'jordyn.stubblefield@gmail.com', true, '#D96B8F')
on conflict (email) do nothing;

-- Default baby stats row (only insert if table is empty)
do $$ begin
  if not exists (select 1 from public.baby_stats limit 1) then
    insert into public.baby_stats (name) values ('Luca');
  end if;
end $$;

-- Storage bucket for media uploads
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do nothing;

-- Storage policies
do $$ begin
  create policy "Anyone can view media files" on storage.objects for select using (bucket_id = 'media');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can upload media files" on storage.objects for insert with check (bucket_id = 'media');
exception when duplicate_object then null; end $$;
