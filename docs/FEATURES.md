# ABF Features List

## Current Status Legend
- [x] **Built** - Feature is implemented and functional
- [ ] **Planned** - Feature is planned but not yet built
- [~] **Partial** - Feature is partially implemented

---

## Core Features (Built)

### 1. Authentication & User Management
**Status: Built**

- [x] Email/password signup
- [x] Email/password login
- [x] Basic profile creation (name stored in user metadata)
- [x] Account settings page
- [ ] Google OAuth signup
- [ ] Email verification
- [ ] Password reset flow

**Technical Implementation:**
- Supabase Auth for authentication
- Token-based auth for API routes (Next.js 15 compatible)
- User metadata stored in auth.users
- Extended profile in `user_profiles` table

---

### 2. Partner Connection
**Status: Built**

- [x] Generate unique connect code (6 characters)
- [x] Accept partner connection via code
- [x] View connected status
- [x] Store relationship in `couples` table
- [ ] Disconnect option

**User Flow:**
1. User A creates account
2. User A gets unique connect code on dashboard
3. User A shares code with partner
4. User B enters code on connect page
5. Both users see connected status, access full app

---

### 3. Daily Check-in System
**Status: Built**

- [x] Daily question from curated bank
- [x] Submit text responses (500 char limit)
- [x] View partner's response (after both submit)
- [x] Heart reactions on partner's answer
- [x] Comment on partner's answer
- [x] Streak tracking (consecutive days both answered)
- [x] Smart question selection (avoids recent questions)

**Question Categories:**
- Gratitude, Fun, Meaningful, Reflective, Dreams, Intimacy

---

### 4. Dashboard
**Status: Built**

- [x] Personalized greeting with user's name
- [x] Daily relationship quote (date-seeded, 45 quotes)
- [x] Relationship Health Meter
- [x] Daily check-in card (expandable)
- [x] Profile completion banner (when incomplete)
- [x] 18 Questions onboarding status
- [x] Week in Review card (Fri-Sun)
- [x] Flirts section (send/receive)
- [x] Our Timeline card
- [x] Date Night card
- [x] AI Coach card
- [x] Partner Insights card
- [x] Connect code display

---

### 5. 18 Questions Onboarding
**Status: Built**

- [x] Comprehensive relationship assessment
- [x] 18 curated questions about relationship style
- [x] Progress tracking
- [x] Mutual completion requirement
- [x] Compatibility results when both complete

---

### 6. User Profile Quiz
**Status: Built**

- [x] Extended personality/preference quiz
- [x] Display name setting
- [x] Love language (primary & secondary)
- [x] Communication style (multi-select, max 3)
- [x] Conflict resolution style
- [x] Core values (multi-select)
- [x] Stress response patterns
- [x] Hobbies & interests (multi-select, max 7)
- [x] Date preferences (multi-select, max 7)
- [x] Completion tracking (`completed_at` timestamp)

---

### 7. AI Relationship Coach
**Status: Built**

- [x] Real Claude API integration (claude-sonnet-4)
- [x] Personalized context from user profiles
- [x] Conversation history tracking
- [x] Token-based authentication
- [x] Free tier limit (5 messages/day, currently disabled for dev)
- [x] Graceful handling when partner profile incomplete

**Context Includes:**
- User's name, love language, communication style
- Partner's name, love language (if profile complete)
- Relationship health score

---

### 8. Flirts (Love Notes)
**Status: Built**

- [x] Send text messages to partner
- [x] Send GIFs (Giphy integration)
- [x] Send photos
- [x] Unread badge on dashboard
- [x] Mark as read
- [x] React to received flirts
- [x] Flirt history view

---

### 9. Partner Insights
**Status: Built**

- [x] View partner's love languages
- [x] View partner's communication style
- [x] View partner's values
- [x] Actionable tips based on partner's preferences
- [x] Requires both partners to complete 18 Questions

---

### 10. Weekly Reflection
**Status: Built**

- [x] Available Friday through Sunday
- [x] Review week's check-ins together
- [x] Pick favorite moments
- [x] Both partners submit reflection
- [x] See matched favorites

---

### 11. Our Timeline (Relationship Scrapbook)
**Status: Built**

- [x] Horizontal scrollable timeline
- [x] Stats header (time together, flirts, check-ins)
- [x] Add events (8 types: First Date, Anniversary, Trip, etc.)
- [x] Photo uploads (up to 5 per event)
- [x] Event detail view with photo carousel
- [x] Delete events
- [x] Empty state with CTA
- [x] Dashboard preview card

**Event Types:**
- First Date, First Kiss, Anniversary, Milestone, Trip, Date Night, Achievement, Custom

---

### 12. Date Night Planner
**Status: Built**

- [x] "Our Dates" section with stats
- [x] Upcoming dates display
- [x] Past dates history
- [x] "Get Inspired" with 58 curated date ideas
- [x] Category filters (9 categories)
- [x] Budget slider ($-$$$$)
- [x] Create custom dates
- [x] Plan from curated suggestions
- [x] Suggest date to partner
- [x] Accept/decline partner suggestions
- [x] Tips for each curated idea
- [ ] Affiliate links (placeholder ready)
- [ ] Booking links (placeholder ready)

**Categories:**
- Dinner, Museum/Culture, Music, Outdoor, Activity, Shows, Cozy, Adventure, Creative

---

### 13. Song Flirts with Spotify Integration
**Status: Built**

- [x] Spotify OAuth connection flow
- [x] Search Spotify catalog for songs
- [x] Send songs as flirts to partner
- [x] 30-second song preview playback
- [x] Spotify-styled song cards in feed
- [x] Optional message with song
- [x] Open song in Spotify (deep link)
- [x] Mixtape page (all shared songs)
- [x] Token refresh handling
- [ ] Apple Music integration
- [ ] Shared playlist export
- [ ] Add songs to check-in responses

**Technical Implementation:**
- OAuth 2.0 authorization code flow with Spotify
- Token storage in `user_spotify_connections` table
- Automatic token refresh when expired
- HTML5 Audio API for preview playback
- Song metadata stored in `flirts` table

**Setup Requirements:**
1. Create Spotify Developer App at https://developer.spotify.com/dashboard
2. Set redirect URI to `{your-domain}/api/spotify/callback`
3. Add environment variables:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL`

---

## Date Night & Discovery

### Custom Date Builder (V1.1)
- Search and click-to-add locations to itinerary
- Route mapping with timing estimates
- Conversation topic selector (assessment-based + custom)
- Calendar integration
- Post-date reflection

### Smart Date Suggestions (V1)
- Google Places API integration
- Category-based filtering (romantic, adventure, culture, etc.)
- Weather-aware suggestions
- Assessment-based personalization
- Save favorites

### Community Features (V2)
- Anonymous contribution system (date spots, advice, conversation starters)
- "Couples like you" discovery feed
- Upvote/quality control system
- City-based filtering
- Privacy-preserving (no names, only city/relationship length)

### Learning Algorithm (V2)
- Track completed dates + ratings
- Pattern detection (adventure dates → high connection)
- Adaptive suggestions based on past behavior
- Feed insights to AI Coach

---

## Phase 2 Features (Planned)

### 14. Enhanced Music Features
**Priority: P2**

- [ ] Apple Music integration option
- [ ] Export mixtape to Spotify playlist
- [ ] Add song to check-in response
- [ ] Tag songs with memories/timeline events

---

### 15. Photo Gallery
**Priority: P1**

- [ ] Dedicated photo gallery view
- [ ] Albums by event/date
- [ ] Caption photos
- [ ] Anniversary highlights

---

### 16. Milestone Tracking & Reminders
**Priority: P2**

- [ ] Set custom milestones
- [ ] Anniversary reminders
- [ ] Push notifications for upcoming dates
- [ ] Gift/date suggestions for occasions

---

### 17. Calendar Integration
**Priority: P3**

- [ ] Sync with Google/Apple Calendar
- [ ] Date night scheduling
- [ ] Quality time tracking

---

## Technical Features

### Performance & UX
- [x] Mobile-responsive design
- [x] Smooth animations (CSS transitions)
- [x] Loading states
- [x] Error handling with user feedback
- [ ] Offline support (PWA)
- [ ] Push notifications

### Security & Privacy
- [x] Row-level security (Supabase RLS)
- [x] Token-based API authentication
- [x] Secure photo storage (private buckets)
- [ ] End-to-end encryption for messages
- [ ] Two-factor authentication
- [ ] Data export feature

---

## Database Tables

| Table | Status | Purpose |
|-------|--------|---------|
| `profiles` | Built | Basic user info |
| `user_profiles` | Built | Extended profile (love language, etc.) |
| `couples` | Built | Partner connections |
| `onboarding_responses` | Built | 18 Questions responses |
| `checkin_questions` | Built | Question bank |
| `daily_checkins` | Built | Daily Q&A responses |
| `weekly_reflections` | Built | Weekly reflection data |
| `flirts` | Built | Love notes/messages (incl. song flirts) |
| `ai_conversations` | Built | AI coach conversations |
| `ai_messages` | Built | AI coach messages |
| `relationship_health` | Built | Health scores |
| `relationship_points` | Built | Gamification points |
| `user_spotify_connections` | Built | Spotify OAuth tokens |
| `timeline_events` | Designed | Relationship milestones |
| `date_suggestions` | Designed | Curated date ideas |
| `date_plans` | Designed | Couple's planned dates |
| `trips` | Designed | Couple trip planning |
| `trip_itinerary` | Designed | Trip day activities |
| `trip_packing` | Designed | Trip packing lists |
| `trip_photos` | Designed | Trip photo uploads |

---

## Design Principles

### Visual Language
- Warm pink/purple gradients
- Generous whitespace
- Beautiful typography (Geist font)
- Thoughtful micro-interactions
- Emoji-rich, playful feel

### Voice & Tone
- Warm and encouraging
- Never judgmental
- Celebrates effort, not perfection
- Assumes good intentions
- Gentle, not nagging

### Mobile-First
- Touch-friendly targets
- Horizontal scroll where appropriate
- Fast loading
- Responsive at all breakpoints

---

## Success Metrics

### Engagement Metrics
- Weekly active couples
- Check-in completion rate
- Flirts sent per couple
- Timeline events added
- Date nights planned

### Retention Metrics
- 4-week retention
- 12-week retention
- Feature adoption rates

### Quality Metrics
- User satisfaction (feedback)
- Relationship satisfaction (self-reported)
- Word-of-mouth referrals
