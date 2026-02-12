# ABF Product Backlog

Single source of truth for future work, enhancements, and known issues.

**Last Updated:** February 10, 2025

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

*(Placeholder for Date Night backlog items)*

---

### Timeline

*(Placeholder for Timeline backlog items)*

---

### AI Coach

*(Placeholder for AI Coach backlog items)*

---

## 🔧 Technical Debt

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
