-- Allow anon role to upload to media bucket (for direct browser uploads)
-- The existing policy uses with check (true) which already covers anon
-- But we need to make sure the bucket allows unauthenticated uploads

-- Update bucket to allow public uploads
update storage.buckets
  set public = true
  where id = 'media';
