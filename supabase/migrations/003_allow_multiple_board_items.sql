-- Allow multiple vision board items per user (up to 3, enforced in API)
alter table public.vision_board_items drop constraint if exists vision_board_items_member_id_key;
