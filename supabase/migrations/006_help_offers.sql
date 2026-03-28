-- Help offers table (postpartum support sign-ups)
create table if not exists public.help_offers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  category text not null,
  available_date date,
  note text,
  created_at timestamptz default now()
);

create index if not exists idx_help_offers_category on public.help_offers(category);
create index if not exists idx_help_offers_member on public.help_offers(member_id);

alter table public.help_offers enable row level security;

create policy "Anyone can view help offers"
  on public.help_offers for select using (true);
create policy "Anyone can insert help offers"
  on public.help_offers for insert with check (true);
create policy "Anyone can delete own help offers"
  on public.help_offers for delete using (true);

alter publication supabase_realtime add table public.help_offers;
