-- Add new vision board item types
alter type public.board_item_type add value if not exists 'sticker';
alter type public.board_item_type add value if not exists 'wish';
alter type public.board_item_type add value if not exists 'doodle';
alter type public.board_item_type add value if not exists 'star';
