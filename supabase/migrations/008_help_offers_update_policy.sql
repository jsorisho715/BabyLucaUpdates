-- Add update policy for help_offers (was missing from 006)
create policy "Anyone can update own help offers"
  on public.help_offers for update using (true);
