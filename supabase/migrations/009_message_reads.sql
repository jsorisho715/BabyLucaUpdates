-- Message reads: tracks which members have seen which messages
create table if not exists public.message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  read_at timestamptz default now(),
  unique (message_id, member_id)
);

create index if not exists idx_message_reads_message_id on public.message_reads(message_id);
create index if not exists idx_message_reads_member_id on public.message_reads(member_id);

alter table public.message_reads enable row level security;

create policy "Anyone can view message reads"
  on public.message_reads for select
  using (true);

create policy "Anyone can insert message reads"
  on public.message_reads for insert
  with check (true);

alter publication supabase_realtime add table public.message_reads;
