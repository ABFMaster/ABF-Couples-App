# Next Session: Trip Planning Feature

Use this prompt to start the next development session for ABF.

---

## Context: What's Built

ABF (Always Be Flirting) is a couples relationship app with the following features complete:

### Core Features
- **Authentication**: Email/password signup/login with Supabase Auth
- **Partner Connection**: 6-character codes to link couples
- **Daily Check-ins**: Questions, responses, reactions, streaks
- **AI Coach**: Claude-powered relationship guidance with personalized context
- **Flirts**: Love notes, GIFs, photos between partners
- **18 Questions Onboarding**: Compatibility assessment
- **Profile Quiz**: Love languages, communication styles, values
- **Weekly Reflections**: Friday-Sunday review of the week
- **Partner Insights**: View partner's preferences and tips
- **Our Timeline**: Horizontal scrapbook with photo uploads
- **Date Night**: 58 curated ideas, custom planning, partner suggestions

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth (token-based for API routes)
- **Storage**: Supabase Storage (private buckets)
- **AI**: Anthropic Claude API (@anthropic-ai/sdk)
- **Styling**: Tailwind CSS

---

## Key Files to Reference

### Architecture Patterns
- `docs/TECHNICAL_DECISIONS.md` - Auth patterns, RLS patterns, component patterns
- `docs/PRODUCT_PHILOSOPHY.md` - Product vision and monetization strategy
- `docs/FEATURES.md` - Complete feature inventory

### Similar Feature Examples
- `app/date-night/page.js` - Complex feature with filtering, cards, modals
- `app/timeline/page.js` - Horizontal scrolling, photo uploads, stats header
- `components/CreateDateModal.js` - Modal with tabs, form handling
- `docs/database/date_night.sql` - Table design with RLS policies

### Core Utilities
- `lib/supabase.js` - Supabase client setup
- `lib/ai-coach-context.js` - Building personalized AI context

---

## Trip Planning Feature Requirements

### MVP Features

1. **Trip List View**
   - See all trips (upcoming, past)
   - Quick stats (total trips, next trip countdown)
   - Add new trip button

2. **Trip Creation**
   - Destination (city/country)
   - Date range (start/end)
   - Trip type (adventure, relaxation, cultural, romantic, mixed)
   - Budget level (1-4 scale like Date Night)
   - Notes/description
   - Cover photo upload

3. **Trip Detail View**
   - Trip header with photo, destination, dates
   - Countdown to trip (if upcoming)
   - Itinerary section (day-by-day activities)
   - Packing list (shared, checkable)
   - Budget tracker (optional)
   - Photos section (after trip)

4. **Itinerary Builder**
   - Add activities to specific days
   - Activity types: flight, hotel, restaurant, activity, transport
   - Time slots
   - Notes/confirmation numbers
   - Reorder activities

5. **Shared Packing List**
   - Add items
   - Assign to partner (who's packing what)
   - Check off as packed
   - Categories (clothes, toiletries, documents, electronics, etc.)

### Database Schema Needed

```sql
-- Trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  trip_type TEXT CHECK (trip_type IN ('adventure', 'relaxation', 'cultural', 'romantic', 'mixed')),
  budget_level INTEGER CHECK (budget_level BETWEEN 1 AND 4),
  description TEXT,
  cover_photo_url TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'upcoming', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itinerary items
CREATE TABLE trip_itinerary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  day_number INTEGER NOT NULL, -- Day 1, Day 2, etc.
  activity_type TEXT CHECK (activity_type IN ('flight', 'hotel', 'restaurant', 'activity', 'transport', 'other')),
  title TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  confirmation_number TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Packing list
CREATE TABLE trip_packing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  item TEXT NOT NULL,
  category TEXT CHECK (category IN ('clothes', 'toiletries', 'documents', 'electronics', 'medicine', 'other')),
  is_packed BOOLEAN DEFAULT FALSE,
  packed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip photos (post-trip memories)
CREATE TABLE trip_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  photo_url TEXT NOT NULL,
  caption TEXT,
  taken_on DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies (follow EXISTS pattern from date_night.sql)
```

### UI Requirements

1. **Trip List Page** (`app/trips/page.js`)
   - Header with stats (like Timeline)
   - Card grid for trips (cover photo, destination, dates)
   - Status badges (Planning, Upcoming, Active, Completed)
   - Countdown for next trip
   - Empty state with CTA

2. **Trip Detail Page** (`app/trips/[id]/page.js`)
   - Hero section with cover photo
   - Tab navigation: Overview | Itinerary | Packing | Photos
   - Floating action buttons for quick add

3. **Modals**
   - `CreateTripModal.js` - New trip form
   - `AddItineraryItemModal.js` - Add activity to day
   - `AddPackingItemModal.js` - Add packing item

4. **Components**
   - `TripCard.js` - Trip preview card
   - `ItineraryDay.js` - Day section with activities
   - `PackingItem.js` - Checkable packing item
   - `TripPhotoGrid.js` - Photo gallery

---

## Design Patterns to Follow

### Authentication (Token-Based)
```javascript
// Client-side: Include token in API calls
const { data: { session } } = await supabase.auth.getSession()
fetch('/api/...', {
  headers: { 'Authorization': `Bearer ${session?.access_token}` }
})

// Server-side: Create client with token
const supabase = createClient(url, key, {
  global: { headers: { Authorization: `Bearer ${token}` } }
})
```

### RLS Policies (EXISTS Pattern)
```sql
CREATE POLICY "Users can view their couple's trips"
  ON trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = trips.couple_id
      AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
    )
  );
```

### Modal Pattern
```javascript
// Parent manages open state
const [showModal, setShowModal] = useState(false)

// Modal receives onClose and onSuccess
<CreateTripModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onSuccess={(newTrip) => {
    setTrips([...trips, newTrip])
    setShowModal(false)
  }}
  coupleId={coupleId}
/>
```

### Photo Upload Pattern
```javascript
// Upload to Supabase Storage
const filePath = `${coupleId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`
const { data, error } = await supabase.storage
  .from('trip-photos')
  .upload(filePath, file)

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('trip-photos')
  .getPublicUrl(filePath)
```

### Color Scheme
```javascript
// Trip type colors (similar to event types)
const tripTypeColors = {
  adventure: 'bg-orange-100 text-orange-700',
  relaxation: 'bg-blue-100 text-blue-700',
  cultural: 'bg-purple-100 text-purple-700',
  romantic: 'bg-pink-100 text-pink-700',
  mixed: 'bg-green-100 text-green-700'
}

// Activity type icons
const activityIcons = {
  flight: '✈️',
  hotel: '🏨',
  restaurant: '🍽️',
  activity: '🎯',
  transport: '🚗',
  other: '📍'
}
```

---

## Dashboard Integration

Add to `app/dashboard/page.js`:

```javascript
// State
const [upcomingTrip, setUpcomingTrip] = useState(null)

// Fetch
const fetchUpcomingTrip = async () => {
  const { data } = await supabase
    .from('trips')
    .select('*')
    .eq('couple_id', coupleId)
    .gte('start_date', new Date().toISOString().split('T')[0])
    .order('start_date', { ascending: true })
    .limit(1)
    .single()
  setUpcomingTrip(data)
}

// Card
<div className="bg-white rounded-2xl p-6 shadow-sm">
  <h3>🧳 Trip Planning</h3>
  {upcomingTrip ? (
    <div>
      <p>{upcomingTrip.destination}</p>
      <p>{daysUntil(upcomingTrip.start_date)} days away!</p>
    </div>
  ) : (
    <p>Plan your next adventure together</p>
  )}
</div>
```

---

## Storage Bucket Setup

Create in Supabase Dashboard:
- **Bucket name**: `trip-photos`
- **Public**: false
- **Allowed MIME types**: image/jpeg, image/png, image/webp

---

## Monetization Hooks (Future)

- Affiliate links to booking.com, Airbnb, Viator
- Premium feature: AI trip suggestions based on preferences
- Premium feature: Budget tracking with expense splitting
- Premium feature: Export itinerary as PDF

---

## Starter Command

```
Create the Trip Planning feature for ABF. Start by:
1. Creating the database schema (docs/database/trips.sql)
2. Building the trips list page (app/trips/page.js)
3. Creating the trip detail page with tabs (app/trips/[id]/page.js)
4. Building the necessary modals and components

Reference the Date Night feature for patterns. Follow the established
design language with warm pink/purple gradients and emoji-rich UI.
```
