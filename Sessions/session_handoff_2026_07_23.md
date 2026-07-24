# ABF Session Handoff — July 23, 2026

## What Was Built This Session

### Security Audit — COMPLETE
- Next.js upgraded to 16.2.10 on both ABF and Nora Standalone
- ANTHROPIC_API_KEY reference corrected (was NEXT_PUBLIC_ prefixed)
- Nora email/welcome route secured with CRON_SECRET
- All Supabase RLS policies verified
- Hidden 50 messages/day rate limit on Nora chat

### Bug Fixes — COMPLETE
- **Tell Nora** — was bouncing to old conversation. Fixed by capturing isNewSession before URL param stripped, gating checkAuth to run once on mount
- **Weekly Reflection stuck on 6/29** — cron loop lacked try/catch per couple. Fixed. Manually triggered new reflection for week of 7/13
- **Persistent "Photos added" message** — was re-showing on every load because abf_photos_done flag set photoUploadComplete state. Fixed: now hides section entirely when photos exist in DB
- **Timeline photo tap** — was routing to Been section. Fixed: deep links to specific event via eventId URL param. Added Suspense boundary to us/page.js
- **WednesdayCard crash** — isPastReveal not defined. Fixed: added all time variables (isPastReveal, isPastCutoff, isWednesday, pacificHour, pacificDay) to component scope
- **Notice late submission** — Cass blocked at 8pm despite new 10pm window. Root cause: 7pm reveal cron sets status='revealed', UI checked !isRevealed which blocked late submission form. Fixed: check !entry.myNotice instead. Server route also fixed to allow submissions on Wednesday before 10pm even when status=revealed

### Wednesday Notice — EXTENDED
- Submission window extended to 10pm Pacific (was 7pm hard cutoff)
- Evening reminder push at 6pm Pacific to anyone not yet submitted
- New cron entries in vercel.json: 0 1 * * 4 (6pm Pacific) and 0 5 * * 4 (10pm Pacific)
- processWednesdayEveningReminder and processWednesdayCutoff added to scheduled-tasks

### FlirtCard Redesign — SHIPPED
- Front: ChatGPT-generated "Greetings from Always Be Flirting" retro postcard image
- Flip mechanic: 3D CSS rotateY, tap front to flip to back
- Gradient ribbon CTA at bottom of front image: "Send Cass a flirt →" or "Cass sent you a flirt — tap to open" in gold when received
- Back: airmail diagonal stripe border (red/navy), compose inline with type selector
- ABF stamp image (ChatGPT-generated) — coral with sun illustration, "ALWAYS BE FLIRTING" arc, perforated edge
- Stamp activates (full opacity) when type is selected, "tap to mail →" label
- Tap reactions replacing hold mechanic: "this is so you" · "made my day" · "saving this"
- Sent history: clean list with "reacted" (gold) or "delivered" (gray) pill badges
- Old drop view deleted — compose lives entirely in flip card back

**LOGGED ISSUE:** Stamp placement — should be in top-right of header row (above type selector), not inside address column. Layout restructure needed.

### Memory / Photo Feature — SHIPPED
- New /us/add page — unified "Add to our story" flow with three paths:
  - Memory we made (name, date, location with Google Places autocomplete, photos)
  - Something we want (routes to existing /shared/add)
  - Dream trip (stub, routes to /shared/add)
- +Add button on Us page now routes to /us/add
- Timeline event update route now allows partner to append photos (not just creator)
- Nora observation fires automatically when partner adds photos to a memory
- Been card shows "Add your photos →" CTA for partner on memory events
- Event detail view: horizontal scroll photo strip with snap, tap to open full-screen viewer
- Full-screen photo viewer: prev/next arrows, dot nav, tap background to close
- Multi-photo upload in event detail for custom/memory events

### Nora Standalone — COMPLETE
- Simulator tested on iPhone 17 (iOS 26.5) — full flow verified
- New user first-time experience fixed — "This is your space. Say whatever's on your mind — I'm paying attention."
- False memory opener removed for new users

---

## Current Sprint Backlog

### Bugs
- FlirtCard stamp placement — top of header row (logged)
- FlirtCard back — some empty space remaining (logged)

### Polish
- Date Night polish — next priority
- Nora too abstract in responses — voice/prompt tuning needed
- FlirtCard back — content area sizing

### Product Design (discussion needed)
- "Now do this" after each daily activity — real-world execution gap
- Game Room Talk to Nora links — check if exist, add if missing
- Past Reflections collapsed list design
- Sunday Review outcome tracking

### Security (pre-public-launch)
- 57 API routes without explicit auth — ABF only, not blocking App Store

### Nice to have
- Pinch to zoom in photo viewer
- Dream trip path on /us/add — currently stubs to /shared/add
- Photo attribution (who added which photo) in memory events

---

## Key File Paths

### ABF (~/Desktop/abf-app)
- components/FlirtCard.js — postcard redesign, flip mechanic, inline compose
- components/WednesdayCard.js — late submission fix, time variables
- app/us/page.js — photo gallery, memory card, +Add routing, photoViewer state
- app/us/add/page.js — NEW unified add flow
- app/api/timeline/event/update/route.js — partner photo permissions, Nora observation
- app/api/cron/scheduled-tasks/route.js — Wednesday evening reminder, cutoff cron
- app/api/wednesday/send/route.js — 10pm cutoff, Wednesday-only guard
- public/flirt-postcard.png — ChatGPT postcard illustration
- public/abf-stamp.png — ChatGPT stamp illustration
- vercel.json — 6 cron entries

### Nora Standalone (~/Desktop/nora-app)
- app/nora/page.js — new user empty state fix
- app/api/nora/chat/route.js — 50 msg/day hidden rate limit

### Assets (~/Desktop/nora-overview)
- flirt-postcard.png — hosted at abfmaster.github.io/nora-overview/flirt-postcard.png
- abfstamp.png — hosted at abfmaster.github.io/nora-overview/abfstamp.png

---

## Reference
- ABF repo: https://github.com/ABFMaster/ABF-Couples-App
- ABF prod: https://abf-couples-app.vercel.app
- Nora repo: https://github.com/ABFMaster/Nora-App
- Nora prod: https://nora-app-mauve.vercel.app
- Test IDs: Matt fe1e0be6, Cass 7d1ef6c1, Couple 8230e60f
