-- Allow deleting messages (admin enforced at API level, service role bypasses RLS)
create policy "Service role can delete messages"
  on public.messages for delete
  using (true);
