# ABF Product Backlog

Single source of truth for future work, enhancements, and known issues.

**Last Updated:** March 2, 2026

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
