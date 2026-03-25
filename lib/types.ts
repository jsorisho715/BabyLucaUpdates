export interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  is_admin: boolean
  avatar_color: string
  joined_at: string
}

export interface Message {
  id: string
  member_id: string
  content: string | null
  type: 'text' | 'image' | 'video' | 'audio' | 'system'
  reply_to_id: string | null
  is_pinned: boolean
  created_at: string
  updated_at: string
  member?: Member
  media?: Media[]
  reactions?: ReactionGroup[]
  reply_to?: Message | null
  mentions?: Mention[]
}

export interface Media {
  id: string
  message_id: string
  url: string
  type: 'image' | 'video' | 'audio'
  thumbnail_url: string | null
  width: number | null
  height: number | null
  size_bytes: number | null
}

export interface Reaction {
  id: string
  message_id: string
  member_id: string
  emoji: string
  created_at: string
  member?: Member
}

export interface ReactionGroup {
  emoji: string
  count: number
  members: { id: string; first_name: string }[]
  hasReacted: boolean
}

export interface Mention {
  id: string
  message_id: string
  mentioned_member_id: string
}

export interface Note {
  id: string
  member_id: string
  content: string
  created_at: string
  member?: Member
}

export interface VisionBoardItem {
  id: string
  member_id: string
  type: 'photo' | 'note'
  content: string
  x: number
  y: number
  rotation: number
  color: string
  width: number
  height: number
  created_at: string
  member?: Member
}

export interface BabyStats {
  id: string
  name: string
  birth_date: string | null
  weight_lbs: number | null
  weight_oz: number | null
  length_inches: number | null
  notes: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
}

export const REACTION_EMOJIS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '😢', label: 'Cry' },
] as const

export const AVATAR_COLORS = [
  '#4BA3E3', '#D96B8F', '#6BCB77', '#FFD166',
  '#EF6461', '#7B68EE', '#FF8C42', '#36D6B5',
  '#C084FC', '#F472B6', '#38BDF8', '#A3E635',
] as const

export const STICKY_NOTE_COLORS = [
  '#FEF3C7', '#DBEAFE', '#FCE7F3', '#D1FAE5',
  '#FDE68A', '#E0E7FF', '#FBCFE8', '#A7F3D0',
] as const

export type TabType = 'chat' | 'notes' | 'board'
