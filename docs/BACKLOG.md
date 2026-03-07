# ABF Product Backlog

Single source of truth for future work, enhancements, and known issues.

**Last Updated:** March 3, 2026

---

## 🌍 Wander World

### Visual Destination Reveal
**Effort:** Medium
**Value:** High — delight moment, very shareable

When Wander picks a destination (Surprise Me path), show a dramatic full-screen reveal before the conversation begins. Large destination name, cinematic fade, location photo behind it. Should feel like opening a gift.

### Real Location Photos
**Effort:** Small
**Value:** High

Pull Unsplash photos of the destination into the Dream Trip detail page. Query by destination name, display 3–4 full-bleed photos in overview tab.

### AI-Generated Couple Photos
**Effort:** Large
**Value:** Very High — serious differentiator
**Monetization:** Premium feature candidate

Use profile photos + DALL-E 3 to place the couple in scenes from their dream destination. Premium feature. Requires photo upload infrastructure.

### Spinning Globe Animation
**Effort:** Small–Medium
**Value:** Medium — polish and delight

Animate the Surprise Me path with a spinning globe that slows to a stop on the destination. CSS animation or lightweight Three.js. Pairs with Visual Destination Reveal.

### Wander Conversation Resumable
**Effort:** Medium
**Value:** High

When returning to a saved Dream Trip, couple can re-open Wander and continue the conversation. Conversation is already saved to DB (`dream_conversation`) but not resumable in the UI.

### Promote to Real — Date Picker
**Effort:** Small
**Value:** High — natural next step in the flow

When promoting a Dream Trip to Real, show a date picker to set actual travel dates instead of just flipping `is_dream`. Otherwise the trip has no real dates.

---

## 🎯 High Priority

### Location Intelligence for Trip Planning
**Status:** Not Started
**Effort:** Medium (~2-3 hours)
**Value:** High - Unlocks multiple features

**What:**
Add Google Places autocomplete for trip destinations with coordinate storage.

**Why:**
- Better UX (autocomplete vs free text)
- Enables weather forecasts
- Enables nearby attractions/hotels/restaurants
- Enables map visualizations
- Enables timezone handling

**Technical:**
- Add columns: `destination_lat`, `destination_lng` to trips table
- Install: `@react-google-maps/api`
- Need: Google Places API key
- Update: `CreateTripModal.js` with autocomplete
- Migration: Existing trips continue to work (nullable columns)

**Dependencies:**
- Google Places API setup
- API key management

**Future Features This Unlocks:**
- Weather widget on trip detail page
- "Hotels near destination" suggestions
- "Things to do" from Google Places
- Distance calculations for itinerary
- Map view of trip location

---

## 🏗️ Core Product

### Push Notifications
**Effort:** Large (~6 month horizon — requires native app)
**Value:** Very High — retention anchor

Native push for: daily check-in reminder, date night reminder, partner sharing a date, new flirt received.

### Monthly Recap
**Effort:** Medium
**Value:** High — long-term retention anchor

AI-generated relationship summary on the 1st of each month. Highlights, patterns, moments. Delivered in-app. Keeps couples coming back even in low-engagement months.

### Year in Review
**Effort:** Medium
**Value:** High — shareable, viral potential

Annual highlight reel of the couple's year. AI-narrated. Shareable as image/video. Inspired by Spotify Wrapped.

### Gottman / Attachment Theory Layer
**Effort:** Large (ongoing, invisible)
**Value:** Very High — the moat

Science powers the engine invisibly. Four Horsemen research shapes check-in questions. Attachment theory informs coach responses. Makes ABF defensible vs. generic AI apps. Save for deep product session with Cass.

### Partner Activation Flow
**Effort:** Medium
**Value:** Very High — #1 growth lever

Frictionless invite → install → connect flow for getting the second partner active. Current flow requires manual code sharing. Needs deep-link support, SMS invite, and onboarding optimized for "my partner sent me here."

---

## 🐛 Known Issues

### Time Input UX (Trip Itinerary)
**Status:** Documented, Not Blocking
**Severity:** Minor UX quirk
**Effort:** Medium

**Issue:**
Native `<input type="time">` requires clicking AM/PM to finalize time selection. Feels clunky.

**Options:**
1. Keep native input (simple, works)
2. Custom time picker component (better UX, more code)
3. Text input with mask (e.g., "2:30 PM")

**Decision:** Document for now. Revisit if user feedback indicates it's frustrating.

---

## 💡 Feature Enhancements

### Trip Planning

#### AI Itinerary Suggestions
**Effort:** Large
**Value:** High
**Monetization:** Premium feature candidate

Use Claude API to generate suggested itineraries based on:
- Destination
- Trip dates
- Trip type (adventure, relaxation, etc.)
- Budget level
- User preferences from profile

#### Budget Tracker with Expense Splitting
**Effort:** Medium
**Value:** Medium
**Monetization:** Premium feature + affiliate revenue

Track trip expenses with:
- Category breakdown
- Who paid what
- Expense splitting calculations
- Export as PDF
- Affiliate links to booking platforms

#### Packing List AI Generation
**Effort:** Small
**Value:** Medium

Generate smart packing list based on:
- Destination weather
- Trip dates
- Trip type
- Activities planned

#### Multi-Couple Trips
**Effort:** Large
**Value:** Medium

Share trips with other couples:
- Invite friends
- Collaborative itinerary
- Shared packing list
- Group expenses

#### Trip PDF Export
**Effort:** Small
**Value:** Medium
**Monetization:** Premium feature candidate

Export full trip itinerary as formatted PDF:
- Cover page with photo
- Day-by-day itinerary
- Packing list
- Confirmation numbers
- Emergency contacts

#### Booking Affiliate Integration
**Effort:** Medium
**Value:** Low (immediate), High (long-term revenue)
**Monetization:** Direct revenue

Integrate affiliate links:
- Booking.com (hotels)
- Airbnb (vacation rentals)
- Viator (activities)
- Skyscanner (flights)

Add "Book Now" buttons throughout itinerary.

---

### Date Night

## Date Night Enhancements
- [ ] Multi-city event source integrations (Eventbrite, Yelp, city-specific calendars)
- [ ] OpenTable reservation integration
- [ ] In-app reminders for scheduled dates
- [ ] Date history stats and insights
- [ ] Community-sourced date ideas
- [ ] Anonymous relationship advice sharing
- [ ] Lifestyle & Intimacy assessment modules

---

### Timeline

*(Placeholder for additional Timeline backlog items)*

---

### Our Space

#### Completed Shows → Timeline
**Effort:** Small
**Value:** Medium

Mark show as watched together → auto-creates a Timeline memory entry. Closes the loop between Our Space and Timeline.

#### Spotify Song Flirts
**Status:** Blocked — developer access
**Effort:** Feature built and ready

Feature is complete and functional. Blocked on Spotify developer account approval. Revisit or explore Apple Music / YouTube as alternative song sources.

---

### AI Coach

#### Coach Persona and Name
**Effort:** Small (naming/writing), Medium (product thinking)
**Value:** High — character and warmth

Needs a name and backstory like Wander. Warm, research-grounded. Save for product session with Cass before implementing.

#### Notable Coach Sessions
**Effort:** Small
**Value:** Medium

Flag meaningful coach conversations → save to Timeline as a memory. Users shouldn't lose insight that came from a breakthrough session.

---

### Dates

#### Date Roulette
**Effort:** Small
**Value:** High — high-frequency engagement

"Surprise me" for dates. Picks a suggestion based on couple's preferences, current weather, and time of day. Lowers decision fatigue.

#### Movie/Show Search in Date Builder
**Effort:** Small
**Status:** OMDB integration already exists in date flow — extend to collaborative date builder

Add OMDB search to the collaborative date builder for at-home movie/show stops.

---

### Biometric Health Integration (Phase 2)
**Status:** Not Started
**Effort:** Large
**Value:** High
**Monetization:** Premium feature candidate + Major differentiator

**Concept:**
Integrate wearable health data (Oura, Fitbit, Whoop, Apple Health) to help couples understand how physical wellness affects their relationship.

**Why It Matters:**
- Makes invisible stress visible ("You seem irritable" -> data shows 3hrs sleep)
- Couples can see patterns: arguments correlate with poor sleep, connection improves with recovery
- Proactive care: "Your partner's readiness is low today - maybe pick up slack on chores"

**Phase 1: Individual Awareness**
- Daily check-in overlays Oura/Fitbit data
- AI Coach references biometrics: "Your sleep was rough - want low-key plans?"

**Phase 2: Couple Patterns**
- Weekly reports: "You both had stressful weeks - plan something restorative"
- Conflict correlation: "Arguments happen when X is under-slept"

**Phase 3: Proactive Suggestions**
- Morning notifications based on partner's recovery scores
- Evening suggestions when both partners show high readiness

**Technical Approach:**
- OAuth integration (similar to Spotify)
- Priority: Oura (best for relationship health) -> Fitbit (widest base) -> Whoop -> Apple Health
- Store daily metrics in Supabase
- Privacy: opt-in, granular sharing controls

**Competitive Advantage:**
First couples app to say "Your relationship isn't just feelings - it's biology, sleep, stress, and recovery."

**Next Steps When Ready:**
1. Sign up for Oura/Fitbit developer accounts
2. Prototype: Daily check-in + Oura overlay
3. Test with Matt & Cass for 2 weeks
4. Analyze if data correlates with relationship patterns

---

## 🔧 Technical Debt

### Wander Destination Extraction
**Severity:** Medium — affects dream trip save quality
**Area:** `components/DreamTripModal.js`, `app/api/trips/wander/route.js`

"Dream Destination" fallback still appearing for some saves. `extract_destination` action parses Wander's opening paragraph but fails on poetic phrasing that doesn't name a city clearly. Needs more robust extraction — try structured JSON response or regex city-name heuristic as fallback.

### Timeline Floating Button Overlap
**Severity:** Minor visual bug
**Area:** `app/timeline/page.js`

The `+` floating action button overlaps photo cards on scroll. Needs `z-index` audit or scroll-aware hide behavior.

### Google Maps API Migration
**Severity:** High — will break for new API keys
**Area:** `app/dates/custom/page.js`
**Deadline:** Deprecated after March 2025

Deprecated Places API still in use. Already migrated most of the app to Places API (New). This file is the remaining stragglers. Will break for new API keys once legacy sunset completes.

### Retention Metrics
**Severity:** Informational — needed before growth push
**Area:** Analytics / Supabase

Track: partner activation %, weekly check-in completion rate, 30-day couple retention. Must instrument these before any growth push so we know what's working.

### Code Quality

*(Add items as they come up)*

### Performance

*(Add items as they come up)*

### Security

*(Add items as they come up)*

---

## 📊 Analytics & Instrumentation

### Usage Tracking
**Status:** Not Started
**Effort:** Medium

Add analytics to understand:
- Which features are used most
- Where users drop off
- What drives engagement
- Conversion to premium

**Tools to Consider:**
- PostHog (self-hosted, privacy-friendly)
- Plausible (simple, privacy-first)
- Mixpanel (full-featured)

---

## 🎨 UI/UX Improvements

### Design System Documentation
**Status:** Not Started
**Effort:** Small

Document the established patterns:
- Color palette (pink/purple gradients)
- Component library
- Spacing system
- Typography scale
- Emoji usage guidelines

---

## 💰 Monetization Ideas

### Premium Features (Tier 1 - $9.99/mo)
- AI Coach unlimited messages
- AI trip itinerary generation
- Budget tracking with expense splitting
- PDF exports
- Advanced analytics

### Premium Features (Tier 2 - $14.99/mo)
- Everything in Tier 1
- Multi-couple trip planning
- Priority support
- Early access to new features

### Affiliate Revenue
- Booking.com (hotels)
- Airbnb (vacation rentals)
- Viator (activities)
- Amazon (date night products, travel gear)

---

## 🤝 Couples Coaching

### Async Couples Session
**Priority:** Sprint 3
**Effort:** Medium
**Value:** Very High — first couples coaching mode

First couples coaching mode. Async, two devices, no real-time sync required.

**Flow:**
- Either partner initiates a Couples Session from Coach tab
- Other partner notified: "Matt started a couples check-in"
- Coach asks one structured question to both partners separately
- Each answers privately — neither sees the other's response
- Once both respond, coach synthesizes and delivers shared insight
- The reveal: "You both said X. Here's what that means for you two."
- Coach suggests follow-up action, date, or next question

**Key decisions locked:**
- Individual responses NEVER shown to other partner verbatim
- Only synthesized insight is shared
- Session history shared; individual responses private forever
- Coach facilitates, never takes sides

**DB requirements:**
- New table: `couples_sessions` (session_id, couple_id, initiated_by, status, question, partner1_response, partner2_response, insight, created_at)
- Status flow: `initiated → p1_answered → p2_answered → insight_generated → complete`

### Live Couples Session
**Priority:** Sprint 4
**Effort:** Large

Real-time synchronized session via Supabase real-time subscriptions. Turn-based, coach facilitates, both partners present simultaneously. Higher complexity, higher intimacy value.

### Structured Session Templates
**Priority:** Sprint 4/5
**Effort:** Large — requires original content writing

In-house designed exercise templates inspired by published relationship research. Written entirely in ABF's own language to avoid licensing issues. Based on academic research concepts: conflict processing, bids for connection, shared meaning, stress-reducing conversation, dreams within conflict.

---

## 🧠 AI Coach Architecture

*Sprint 2 priority. Foundation work before couples mode is possible.*

### Coach Persona Document
**Priority:** Sprint 2 — Cass leads
**Effort:** Small (writing), Medium (product thinking)

Lock name, voice, tone, and boundaries before Sprint 2 build. Coach needs an identity as defined as Wander's. What it will and won't say. How it handles sensitive topics. How it differs between individual vs couples mode.

*(Note: stub item "Coach Persona and Name" already in backlog under Feature Enhancements → AI Coach. This is the full spec and process.)*

### Three-Layer Knowledge Architecture
**Priority:** Sprint 2
**Effort:** Large — requires careful DB and policy design

**Layer 1 — Public profile:** Assessment scores, attachment style, love language, communication style. Both partners can see. Couples coach uses freely.

**Layer 2 — Individual insights:** Coach-generated synthesis of patterns from individual sessions. Never raw quotes. Never shared verbatim. Couples coach uses internally to ask better questions only — never to make statements about either partner.

**Layer 3 — Raw individual session content:** Fully firewalled. Encrypted, individual-scoped only. Couples coach has ZERO access. Technically enforced, not just policy.

### Core Prompt Guardrail (lock permanently into couples coach)
> "You facilitate conversation between partners. You never reveal what one partner shared privately to the other, directly or indirectly. You use private context only to ask better questions, never to make statements about either partner's feelings or needs."

### Proactive Trigger System
**Priority:** Sprint 2
**Effort:** Medium

5–6 moments when coach reaches out unprompted:
- Check-in score drops two weeks in a row
- Assessment just completed
- Dream trip just saved in Wander
- Date or trip just completed
- Partner hasn't activated yet (gentle nudge to inviter)
- Weekly reflection submitted with low scores

### Longitudinal Memory
**Priority:** Sprint 2 — implement before >500 couples
**Effort:** Medium

Compress older session history into rolling profile summary. 500-token profile instead of 5,000 tokens raw history. 10x cost reduction, minimal quality loss.

### Coach Context Bundle
**Priority:** Sprint 2
**Effort:** Small — define spec, then implement

Define exactly what coach receives at session start:
- Assessment scores + attachment style
- Recent check-in data (last 2 weeks)
- Last coach session summary
- Active dream trips
- Recently read articles from Learn tab
- Completed dates/trips (last 30 days)
- Layer 2 individual insights (couples mode only)

### Coach ↔ Learn Connection
Articles read in Learn tab feed coach context. Coach references relevant content naturally. *"You read about anxious attachment yesterday — want to explore how that shows up for you?"*

### Coach ↔ Wander Connection
Dream trips feed coach context. Coach references anticipation as a relationship health signal.

### Coach ↔ Timeline Connection
Completed dates and trips inform coach. Coach acknowledges shared experiences.

---

## 📊 Engagement & Retention

*Design philosophy decisions. Must be locked before retention sprint build.*

### Relationship Mood Model (replaces health score)
Replace current health/score framing with a warmth-based momentum indicator. Soft, directional, not punitive. Individual streaks + couple momentum — separate concepts. Couple momentum goes up when EITHER partner does anything. Never punishes the less-engaged partner. Design change to be fitted into retention sprint.

### Asymmetric Engagement Design
Accept that one partner uses the app more than the other. Heavy user gets depth — assessments, coach, learning. Light user gets delightful low-friction touchpoints. Partner two's first experience must be a delight, not a form. *"Matt planned something for you — what do you think?"* as activation hook for passive partner.

### Gamification Rethink
Rewards should be relationship prizes, not points. Example: unlock new Wander destination after 4 dates this month. The prize always benefits the couple, not a leaderboard. Remove guilt-inducing streak mechanics.

### Timeline as Frictionless Feed
Philosophy shift: everything is a memory by default. Complete date → Timeline. Trip → Timeline. Flirt → Timeline. Article read together → Timeline. Coach breakthrough → Timeline. User shouldn't decide what's worth remembering — app decides everything is; user can delete what isn't. Dashboard shows "12 memories this month" — pride, not notification. Needs design session before build to avoid junk drawer feel.

### Always Something Upcoming
Dashboard must always show something to look forward to. Planned date, dream trip, book being read together. Anticipation is the strongest retention driver for couples. Design pattern to be implemented in retention sprint.

### Progress Visibility Without Clutter
Timeline scrollback is the irreplaceable artifact. 6 months of memories = emotional cost to churn. Surface naturally — not alerts, not badges. "Look how far you've come" moment built into monthly recap.

---

## 📚 Learn Tab — Current Sprint

### Assessment Expansion
**Priority:** Sprint 1 — next after core Learn tab
**Effort:** Medium per assessment (content-heavy)

Assessments to build, in priority order:
1. Attachment Style deep dive *(Tier 1 — build first)*
2. Conflict Style assessment
3. Love Languages deep dive (beyond basic 5)
4. Intimacy Profile
5. Relationship Values inventory
6. Emotional Needs inventory
7. Stress Response Profile
8. Apology Language
9. Self-Expansion Profile
10. Compatibility Report *(premium — both partners' results synthesized)*

All questions written in-house based on published academic research. No licensed content from Gottman, Chapman, or others.

### Book Recommendations
**Priority:** Sprint 1
**Effort:** Medium

Google Books API for free preview chapters. Amazon affiliate links for purchase. Personalized recommendation engine based on assessment profile.

**Initial curated library (20–30 books):**
Attached (Levine & Heller), The 5 Love Languages (Chapman), Hold Me Tight (Johnson), Come As You Are (Nagoski), Seven Principles (Gottman), Mating in Captivity (Perel), Boundaries (Cloud & Townsend), Wired for Love (Tatkin).

Wander-style personalized recommendation card: *"Based on your attachment profile, this book will explain a lot."*

### Podcast Integration
**Priority:** Sprint 1
**Effort:** Medium

Embedded Spotify/Apple player — stays in app, doesn't kick out. 2-sentence personalized relevance explanation per episode. Post-listen reflection prompt feeds coach context. Short clips over full episodes where available.

**Initial sources:** Where Should We Begin (Perel), Gottman podcast, Therapist Uncensored, Secure Love, Dear Sugars.

### Daily Content Card on Dashboard
**Priority:** After Learn tab core
**Effort:** Small

"Today's Read" card on home screen. One article surfaced daily based on profile + recent activity. Creates daily habit loop — reason to open app beyond check-in.

### Article Save / Bookmark
**Priority:** Sprint 1
**Effort:** Small

Heart icon on articles is currently visual only (Learn tab). Build save functionality — saved articles feed coach context and are accessible in Learn tab.

### Content Personalization Engine
**Priority:** Sprint 2
**Effort:** Large

Tag all content (articles, books, podcasts) with relationship themes. Match tags to couple's assessment profile and coach insights. Anxious attachment → surfaces anxious attachment content. Conflict score diverging → surfaces conflict resolution content. AI generates "why this for you" explanation for every recommendation.

---

## 🔐 Security & Privacy

### Security Audit
**Priority:** Before beta launch — non-negotiable
**Effort:** Large ($2–5K external)

Audit all RLS policies in Supabase. Every query scoped to authenticated user's couple_id. No cross-couple data access possible even via client manipulation. Hire security consultant for penetration testing. Do before any growth push.

### Privacy Policy
**Priority:** Before beta launch — non-negotiable
**Effort:** Medium (legal)

Written by a lawyer who understands AI and relationship data. GDPR compliance if any European users. CCPA compliance for California users. Right to deletion — clean process for couple data removal. Explicit statement: conversation data never used for model training, never sold, never shared.

### Coach Data Promise (surface to users)
Visible statement — not buried in settings:
> "Your conversations with your coach are private, encrypted, and never shared. Not with your partner. Not with anyone."

Individual coach sessions are private from partner permanently. This boundary never changes, never gets accidentally overridden.

### AI Cost Architecture
**Current:** ~$0.004 per coach conversation.
- 1K couples daily: ~$4/day — negligible
- 10K couples: ~$1,200/month against $144K ARR — fine
- 100K couples: ~$12,000/month against $1.2M ARR — ~1% revenue

**Mitigation:** Compressed profile summaries (500 tokens vs 5,000). Budget 2–3% of ARR for AI costs at scale.

---

## 🏗️ Partner Activation

*(Broad item already in Core Product section. These are the specific sub-items for Sprint 3.)*

### Invite Flow Redesign
**Priority:** Sprint 3
**Effort:** Medium

Current invite is friction-heavy. Needs radical simplification. Partner two's first experience must be delight not onboarding. Single compelling hook: *"Matt planned something for you two."* Asymmetric onboarding — partner two gets reaction-based entry. Light user path: respond to something, feel good, come back.

### Partner Two Activation Hook
**Priority:** Sprint 3
**Effort:** Medium

Partner one creates date/trip/flirt. Partner two receives notification with preview. First action is a reaction — approve, suggest change, heart it. No form, no assessment, no setup required to feel value. Assessment and profile build progressively after activation.

---

## 🗺️ Sprint Roadmap

### Sprint 1 (NOW): Finish Learn Tab
- [ ] Assessment expansion — Attachment Style first
- [ ] Book recommendations (Google Books API)
- [ ] Podcast section
- [ ] Wire "Today's Read" card into dashboard
- [ ] Fix assessment module description truncation
- [ ] Article save/bookmark functionality

### Sprint 2: Coach Architecture
- [ ] Coach persona document (Cass leads)
- [ ] Context bundle implementation
- [ ] Three-layer knowledge architecture
- [ ] Proactive trigger system
- [ ] Coach ↔ Learn/Wander/Timeline connections
- [ ] Longitudinal memory/summarization

### Sprint 3: Partner Activation + Async Couples Coaching
- [ ] Invite flow redesign
- [ ] Partner two delight-first onboarding
- [ ] Async couples session build
- [ ] `couples_sessions` DB table

### Sprint 4: Retention Mechanics
- [ ] Relationship mood model (replace health score)
- [ ] Timeline auto-population philosophy
- [ ] Dashboard always-upcoming pattern
- [ ] Progress visibility design
- [ ] Gamification rethink
- [ ] Live couples session (real-time)

### Sprint 5: Growth Prep
- [ ] Security audit + penetration test
- [ ] Privacy policy (legal)
- [ ] Analytics instrumentation
- [ ] Friends & family beta plan
- [ ] Pitch deck

---

## 📝 Notes

**How to Use This Document:**
1. Add items as they come up during development
2. Categorize by feature area
3. Tag with effort/value/status
4. Review quarterly for prioritization
5. Move completed items to changelog

**Prioritization Framework:**
- High Priority: High value, low effort
- Medium Priority: High value, high effort OR low value, low effort
- Low Priority: Low value, high effort (needs strong justification)

**Status Values:**
- Not Started
- In Progress
- Blocked (include blocker)
- Completed (move to changelog)
- Cancelled (include reason)

## Session 2026-03-07

### Deferred / Backlog

- **Nora commentary on content** — Nora reacts contextually to user actions within a page (e.g. user adds a movie, Nora comments on the choice with personality). Requires significant knowledge base. High delight potential. Defer to v2.

- **Nora persistent widget** — Let the need reveal itself organically. Revisit once Nora's intelligence layer is more built out. Don't force familiar UI patterns.

- **Feature progression / trial retention arc** — Features visible day 1 but Nora's depth unlocks with engagement. "First date with Nora" framing. Map full progression arc when core experience is solid.

- **Nora knowledge library** — Gottman research, attachment theory depth, love language interaction patterns, culturally informed dynamics. Build the wing when architecture is ready.

- **Couples debrief — test end to end** — Waiting on Cass to retake assessment with new module format. Card is built and waiting on dashboard.

- **Today tab — personalized feed logic** — Wire Nora's data signals to surface the single most relevant action per day per user.

- **Us tab — feature hub** — Date Night, Trips, Timeline need clear entry points from Us tab.