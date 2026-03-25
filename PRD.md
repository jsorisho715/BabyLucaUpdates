# PRD: Luca's Updates — Real-Time Baby Updates Chat

## Overview
A real-time family chat app where friends and family follow along as Baby Luca
(son of Jordyn & Johnathan) makes his grand entrance. Think of a simple,
elegant Slack room -- but for one special occasion.

## Users
- **Parents (Admin):** Johnathan & Jordyn — primary posters, "Parent" badge
- **Family & Friends:** Anyone with the invite link and password (Luca26)

## Core Features
1. **Join Page** — Landing with watercolor ultrasound hero, join form
   (first name, last name, email, password = Luca26)
2. **Real-Time Chat** — Single channel, persistent history, auto-scroll,
   Supabase Realtime subscriptions
3. **Media Sharing** — Upload photos and videos (supports high-res Android
   Pixel), client-side image compression, Supabase Storage
4. **Reactions** — Like, Love, Laugh, Wow, Celebrate, Cry on any message
5. **Inline Replies** — Reply to specific messages with quoted preview
6. **@Mentions** — Type @ to autocomplete and mention a member
7. **Celebration Animations** — Confetti burst across all clients
   (broadcast via Supabase Realtime)
8. **Member List** — See who's online, who has joined
9. **Media Viewer** — Full-screen lightbox for photos, native video player

## Design
- Baby blue theme (primary: #4BA3E3)
- Elegant, modern, smooth -- Apple-like feel
- Mobile-first (375px min), desktop responsive
- Watercolor-styled ultrasound as hero image on join page

## Tech Stack
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui, Framer Motion
- Supabase (PostgreSQL, Realtime, Storage)
- canvas-confetti for celebrations
- browser-image-compression for media uploads

## Security
- Shared password: Luca26
- JWT session cookies (jose library)
- RLS on all Supabase tables
- No Supabase Auth (lightweight custom session)
