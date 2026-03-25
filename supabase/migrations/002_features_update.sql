-- Update parent emails and last names
update public.members
  set email = 'johnathan.sorisho@gmail.com', last_name = 'Sorisho'
  where email = 'johnathan@lucaupdates.com';

update public.members
  set email = 'jordyn.stubblefield@gmail.com', last_name = 'Stubblefield'
  where email = 'jordyn@lucaupdates.com';

-- Add audio type to enums
alter type public.message_type add value if not exists 'audio';
alter type public.media_type add value if not exists 'audio';

-- Add pinned column to messages
alter table public.messages add column if not exists is_pinned boolean default false;

-- Notes table (messages for the parents)
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_notes_created_at on public.notes(created_at desc);

alter table public.notes enable row level security;

create policy "Anyone can view notes"
  on public.notes for select using (true);
create policy "Anyone can insert notes"
  on public.notes for insert with check (true);

-- Vision board items table
create type public.board_item_type as enum ('photo', 'note');

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
  created_at timestamptz default now(),
  unique (member_id)
);

alter table public.vision_board_items enable row level security;

create policy "Anyone can view board items"
  on public.vision_board_items for select using (true);
create policy "Anyone can insert board items"
  on public.vision_board_items for insert with check (true);
create policy "Anyone can update own board items"
  on public.vision_board_items for update using (true);
create policy "Anyone can delete own board items"
  on public.vision_board_items for delete using (true);

-- Baby stats table (filled in by parents after birth)
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

alter table public.baby_stats enable row level security;

create policy "Anyone can view baby stats"
  on public.baby_stats for select using (true);
create policy "Anyone can insert baby stats"
  on public.baby_stats for insert with check (true);
create policy "Anyone can update baby stats"
  on public.baby_stats for update using (true);

-- Enable realtime for new tables
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.vision_board_items;

-- Insert default baby stats row
insert into public.baby_stats (name) values ('Luca') on conflict do nothing;
