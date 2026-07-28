# ABF + Nora Session Handoff — July 27, 2026

## PROTOCOLS — ENFORCE WITHOUT EXCEPTION
1. Read file before editing
2. One change at a time — test before next
3. Commit after every working change with descriptive message
4. Claude Code prompts / Terminal commands / SQL always in completely separate code blocks
5. Every Claude Code prompt ends with "do not change anything else"
6. Deploy via git push only — never npx vercel
7. git add -A when new files exist — never git add -u (silently excludes new files)
8. Remove debug logs before closing a feature
9. Delete dead code immediately
10. Env vars in .env.local AND Vercel
11. pwd before every git or file op — abf-app and nora-app sit side by side on Desktop
12. Check existing code before writing new code
13. Await ALL async on Vercel — no fire-and-forget, serverless kills unawaited promises
14. ROOT CAUSE RULE: before any fix — state root cause, check if pattern exists elsewhere, confirm fix scope. No bandaid fixes.
15. State machine discipline: for any two-user async feature, full state machine agreed before any code
16. Single source of truth for multiplayer state: all shared state lives in DB, not client refs
17. force-dynamic on every new API route
18. Never use git add -u — silently excludes new files causing 404s in prod

See Sessions/PRODUCT_BACKLOG.md for full feature backlog.

## REPOS
- ABF: ~/Desktop/abf-app → https://github.com/ABFMaster/ABF-Couples-App → https://abf-couples-app.vercel.app
- Nora: ~/Desktop/nora-app → https://github.com/ABFMaster/Nora-App → https://nora-app-mauve.vercel.app
- Test IDs: Matt fe1e0be6, Cass 7d1ef6c1, Couple 8230e60f

## WHAT WAS COMPLETED THIS SESSION

### Security Audit — DONE
- Next.js 16.2.10 on both repos
- ANTHROPIC_API_KEY reference fixed (was NEXT_PUBLIC_)
- Nora email/welcome route secured with CRON_SECRET
- All RLS policies verified
- Hidden 50 msg/day rate limit on Nora chat

### Bug Fixes — DONE
- Tell Nora bouncing to old conversation — fixed
- Weekly Reflection stuck on 6/29 — fixed, cron loop protected with try/catch
- Persistent "Photos added" message — fixed
- Timeline photo tap — deep links to specific event
- WednesdayCard crash — isPastReveal not defined — fixed
- Notice late submission — Cass blocked at 8pm — fixed (isRevealed was blocking form, now checks !entry.myNotice)
- Notice evening reminder push at 6pm Pacific added
- Notice 10pm Pacific cutoff added (was 7pm hard lock)

### FlirtCard Redesign — DONE
- Front: ChatGPT "Greetings from Always Be Flirting" retro postcard image (/public/flirt-postcard.png)
- Flip mechanic: 3D CSS rotateY, tap front to flip to back
- Gradient ribbon CTA at bottom: "Send Cass a flirt →" or "Cass sent you a flirt — tap to open"
- Back: airmail diagonal stripe border, inline compose with type selector (SONG/WORD/PHOTO/GIF/MEMORY)
- ABF stamp image (/public/abf-stamp.png) — activates when type selected, "tap to mail →"
- Tap reactions: "this is so you" · "made my day" · "saving this" (replaced hold mechanic)
- Sent history: "reacted" (gold) or "delivered" (gray) pill badges
- Old drop view deleted — compose lives in flip card back

**LOGGED ISSUE:** Stamp placement — needs to be in top-right of header row above type selector, not inside address column. Layout restructure needed.

### Memory / Photo Feature — DONE
- /us/add page — unified "Add to our story" flow (Memory we made / Something we want / Dream trip)
- +Add button on Us page routes to /us/add
- Memory creation: name, date, Google Places location autocomplete, photo upload
- Partner push notification on memory creation
- Timeline event update route — partner can append photos (not just creator)
- Nora observation fires when partner adds photos to a memory
- Been card: "Add your photos →" CTA for partner on memory events
- Event detail: horizontal scroll photo strip, full-screen viewer with prev/next and dot nav
- Multi-photo upload in event detail for custom/memory events

### Date Night — DONE
- Color palette fixed (was dark navy gradient, now cream/ABF palette)
- Consolidated to custom_dates only — removed all date_plans references from hero route and dates page
- Creator auto-confirmed on date save (user1_approved_at set at insert)
- Mark done guard — prevents double completion
- Next Up stays visible until midnight of the date day
- Conversation starters — fixed fire-and-forget async (Vercel was killing it), fixed key mismatch (before/during/after → personalized/fun/growth)
- Next Up banner now pulls hero photo from stops
- Next Up ordering fixed — uses start of today not now

---

## ACTIVE BACKLOG

### Date Night — Remaining (priority order)
1. **Date History grid ordering** — Saturday showing before Friday in grid. Past dates ordered by created_at not date_time. Fix: order by date_time DESC in pastDates query
2. **Hero image locks to wrong stop** — getHeroPhoto uses seed but picks same stop even as itinerary changes. Fix: store chosen hero_photo_url at save time in custom_dates
3. **List/Map toggle** — does nothing. Needs investigation
4. **Movie/Show stop makes map disappear** — non-location stops break map render
5. **Expanding map hides category pills** — z-index or layout issue
6. **Photo upload in date detail** — not wired. Users want to add photos to a date during/after
7. **Planning flow redesign** — stops should be visible as cards while building, not hidden in bottom bar. Major UX improvement agreed on. Itinerary-first layout.
8. **Ideas For You Two** — not personalized. Should pass Nora's couple knowledge into the search prompt
9. **During-date interactivity** — Game Room integration, location-based prompts, photo capture during date

### FlirtCard — Remaining
10. **Stamp placement** — should be in top-right of header row (above SONG/WORD/PHOTO/GIF/MEMORY row), not inside address column. Currently positioned in address column which starts below the type selector row. Layout restructure needed.
11. **Back card empty space** — content area still has excess whitespace when no type selected

### Nora Standalone — Remaining
12. **Apple Developer account** ($99) — blocks device signing and App Store submission
13. **Nora email domain** — privacy policy uses coggan11@gmail.com, needs proper domain
14. **Welcome email sender** — currently onboarding@resend.dev
15. **nora_conversations table** — safe to deprecate after 30 days from migration

### ABF Security (pre-public-launch)
16. **57 API routes without explicit auth** — real vulnerability, not blocking current users but must fix before public launch

### Product Design (discussion needed)
17. **"Now do this" after daily activities** — flagged, TBD design. Where does it go without cluttering home?
18. **Home page upcoming strip** — show planned date within 48 hours contextually. Agreed: only appears when date is within 48 hours, disappears otherwise. Not built yet.
19. **Dream trip path on /us/add** — currently stubs to /shared/add. Needs proper flow.
20. **Nora voice refinement** — reduce response restatement, vary entry points, cut affirmation formula. System prompt pass needed.
21. **Game Room + Date Night integration** — promote Game Room within date night flow

---

## KEY FILES

### ABF (~/Desktop/abf-app)
- components/FlirtCard.js — postcard redesign, flip mechanic
- components/WednesdayCard.js — late submission, time variables
- app/us/page.js — photo gallery, memory card, photoViewer state, +Add routing
- app/us/add/page.js — unified add flow (Memory/Want/Trip)
- app/dates/page.js — Date Night hub, custom_dates only, hero photo
- app/dates/custom/page.js — planning builder, conversation starters fix
- app/dates/[id]/page.js — date detail, conversation starters display
- app/api/timeline/event/update/route.js — partner photo append, Nora observation
- app/api/dates/complete/route.js — double completion guard
- app/api/dashboard/hero/route.js — custom_dates only
- app/api/cron/scheduled-tasks/route.js — Wednesday evening/cutoff crons
- app/api/wednesday/send/route.js — 10pm cutoff, late submission
- public/flirt-postcard.png — ChatGPT postcard illustration
- public/abf-stamp.png — ChatGPT stamp illustration
- vercel.json — 6 cron entries

### Nora Standalone (~/Desktop/nora-app)
- app/nora/page.js — new user empty state
- app/api/nora/chat/route.js — 50 msg/day hidden rate limit
- capacitor.config.ts — iOS/Android config (Bundle ID: com.mattcoggan.nora)

### Assets (~/Desktop/nora-overview — GitHub Pages)
- flirt-postcard.png → abfmaster.github.io/nora-overview/flirt-postcard.png
- abfstamp.png → abfmaster.github.io/nora-overview/abfstamp.png

---

## START NEXT SESSION WITH

Fix Date Night remaining bugs in this order:
1. Date History grid ordering (order by date_time DESC)
2. Hero image — store at save time
3. List/Map toggle investigation
4. Movie/Show map disappear fix
5. Photo upload in date detail
6. Then: planning flow redesign (itinerary-first, stops visible while building)
