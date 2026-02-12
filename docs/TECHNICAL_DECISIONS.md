# Technical Decisions & Patterns

This document captures key technical decisions, patterns, and architectural choices made during ABF development.

---

## Architecture Overview

### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **AI:** Anthropic Claude API (claude-sonnet-4)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel (planned)

### Project Structure
```
abf-app/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Main dashboard
│   ├── ai-coach/          # AI coach chat
│   ├── timeline/          # Relationship timeline
│   ├── date-night/        # Date planner
│   └── ...
├── components/            # Reusable React components
├── lib/                   # Utility functions & configs
│   ├── supabase.js       # Supabase client
│   └── ai-coach-context.js
└── docs/                  # Documentation
    ├── database/         # SQL schemas
    └── sessions/         # Development session logs
```

---

## Authentication Patterns

### Decision: Token-Based Auth for API Routes

**Problem:** Next.js 15 API routes don't have direct access to cookies in the way older patterns expected. Using `createRouteHandlerClient` or cookie-based auth resulted in 401 errors.

**Solution:** Pass session token from client in Authorization header.

**Client-Side:**
```javascript
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch('/api/ai-coach', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  },
  body: JSON.stringify({ message, conversationId, coupleId }),
});
```

**Server-Side (API Route):**
```javascript
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  // Extract token from Authorization header
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify token and get user
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  // Create client with user's token for RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );

  // Now supabase client respects RLS policies
  // auth.uid() will return the user's ID
}
```

**Why This Works:**
- Token is verified server-side using service role
- Supabase client created with user's token respects RLS
- `auth.uid()` in RLS policies returns correct user

---

## Database Patterns

### Decision: RLS with EXISTS for Couple-Based Access

**Problem:** Need to ensure users can only access data belonging to their couple.

**Solution:** Use EXISTS subquery pattern for RLS policies.

```sql
-- Pattern for couple-based tables
CREATE POLICY "Users can view their couple's data"
  ON some_table
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- For INSERT, also verify created_by
CREATE POLICY "Users can create data for their couple"
  ON some_table
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
    AND created_by = auth.uid()
  );
```

**Why EXISTS Pattern:**
- More efficient than subquery for large datasets
- Works with PostgreSQL query planner optimizations
- Clear and maintainable

### Decision: Separate user_profiles Table

**Problem:** Need extended user profile data (love language, communication style, etc.) beyond what's in auth.users.

**Solution:** Separate `user_profiles` table linked by user_id.

```sql
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id),
  display_name TEXT,
  love_language_primary TEXT,
  love_language_secondary TEXT,
  communication_style TEXT[],
  conflict_style TEXT,
  top_values TEXT[],
  -- ... more fields
  completed_at TIMESTAMP WITH TIME ZONE  -- Track quiz completion
);
```

**Why Separate Table:**
- Keeps auth.users clean (Supabase manages it)
- Allows complex profile data (arrays, etc.)
- Easy to track completion status
- Can add fields without touching auth

---

## Storage Patterns

### Decision: Private Buckets with Couple-Scoped Paths

**Pattern for Photo Storage:**
```javascript
// Path: {couple_id}/{timestamp}-{random}.{ext}
const fileName = `${coupleId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

const { data, error } = await supabase.storage
  .from('timeline-photos')
  .upload(fileName, photo);

// Get public URL for display
const { data: { publicUrl } } = supabase.storage
  .from('timeline-photos')
  .getPublicUrl(fileName);
```

**Storage Bucket Configuration:**
- Bucket: `timeline-photos`
- Public: false (private)
- RLS: Users can only access their couple's photos

**Why This Pattern:**
- Couple ID prefix enables easy cleanup
- Timestamp prevents collisions
- Random suffix adds uniqueness
- Private bucket + RLS for security

---

## AI Integration Patterns

### Decision: Context-Aware AI Coach

**Pattern:** Build context from user profiles before each AI call.

```javascript
// lib/ai-coach-context.js
export async function buildCoachContext(userId, coupleId, supabase) {
  const context = {
    user: { id: userId },
    partner: {},
    relationship: { coupleId },
  };

  // Fetch user profile
  const { data: userDetails } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (userDetails) {
    context.user.name = userDetails.display_name;
    context.user.loveLanguagePrimary = userDetails.love_language_primary;
    // ... more fields
  }

  // Fetch partner profile (with graceful handling if incomplete)
  // ...

  return context;
}
```

**System Prompt Construction:**
```javascript
export function formatContextForPrompt(context) {
  const parts = [];

  parts.push('You are a warm, supportive AI relationship coach...');
  parts.push(`You're chatting with ${context.user.name || 'the user'}.`);

  if (context.user.loveLanguagePrimary) {
    parts.push(`Their primary love language is ${loveLanguageLabels[context.user.loveLanguagePrimary]}.`);
  }

  // Handle missing partner gracefully
  if (context.partner?.profileComplete === false) {
    parts.push("Their partner hasn't completed their profile yet...");
  }

  return parts.join(' ');
}
```

**Why This Pattern:**
- Personalized responses based on actual user data
- Graceful degradation when data missing
- Context stays fresh (rebuilt each request)
- Easy to add more context later

---

## UI Patterns

### Decision: Date-Seeded Random Content

**Problem:** Want different daily quote but same quote all day.

**Solution:** Use date as seed for deterministic random selection.

```javascript
const getDailyQuote = () => {
  const today = new Date();
  // Create seed: 20260209 format
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  // Modulo for index
  const index = seed % dailyQuotes.length;
  return dailyQuotes[index];
};
```

**Why This Works:**
- Same seed all day = same quote
- Different date = different seed = different quote
- No need for database storage
- Works across page refreshes

### Decision: Component-Level Loading States

**Pattern:** Each async operation manages its own loading state.

```javascript
const [saving, setSaving] = useState(false);

const handleSubmit = async () => {
  setSaving(true);
  try {
    // ... async operation
  } finally {
    setSaving(false);
  }
};

// In JSX
<button disabled={saving}>
  {saving ? (
    <span className="animate-spin">...</span>
  ) : (
    'Save'
  )}
</button>
```

**Why This Pattern:**
- Clear user feedback
- Prevents double-submits
- Local to component (no global state)

---

## State Management

### Decision: Local State with Fetch on Mount

**Pattern:** No global state library; fetch data in useEffect, store in useState.

```javascript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  const { data, error } = await supabase
    .from('table')
    .select('*');

  setData(data || []);
  setLoading(false);
};
```

**Why This Approach:**
- Simple and predictable
- No unnecessary complexity
- Data always fresh on page load
- Easy to understand flow

---

## Error Handling

### Decision: Graceful Degradation with User Feedback

**Pattern:** Show error states but don't break the app.

```javascript
// API error handling
if (insertError) {
  console.error('Error:', insertError);
  setError('Failed to create event. Please try again.');
  setSaving(false);
  return;
}

// In JSX
{error && (
  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
    {error}
  </div>
)}
```

**Pattern for Missing Data:**
```javascript
// Handle missing partner profile gracefully
if (partnerDetails) {
  context.partner.name = partnerDetails.display_name;
} else {
  context.partner.profileComplete = false;
}
```

---

## Future Considerations

### Potential Optimizations
1. **React Query** - For better caching and refetching
2. **Optimistic Updates** - For faster perceived performance
3. **Real-time Subscriptions** - For live updates between partners
4. **Service Worker** - For offline support
5. **Edge Functions** - For faster API responses

### Scaling Considerations
1. **Database Indexes** - Already in place for common queries
2. **Image Optimization** - Consider Next.js Image component
3. **CDN** - Vercel handles this automatically
4. **Rate Limiting** - Add for AI endpoint

---

## Debugging Patterns

### Console Logging Strategy

For development, we use structured logging:

```javascript
console.log('=== Feature Name Debug ===');
console.log('Key variable:', value);
console.log('Data being sent:', { field1, field2 });

// After async operation
console.log('Result:', { data, error });
if (error) {
  console.log('Error details:', JSON.stringify(error, null, 2));
}
```

**Best Practices:**
- Section headers with `===`
- Log before and after async operations
- JSON.stringify errors for full details
- Remove or disable in production

---

## Common Issues & Solutions

### Environment Variable Issues

#### Problem: Duplicate .env.local Files

**Symptoms:**
- Environment variables not loading
- API keys undefined despite being set
- Inconsistent behavior between dev and server

**Root Cause:**
Multiple `.env.local` files can exist if created at different times or locations.

**Solution:**
```bash
# Check for duplicate env files
ls -la .env*

# Ensure single .env.local at project root
# Should see only: .env.local (not .env.local.bak, .env.local.old, etc.)

# Verify env is loaded
console.log('API Key exists:', !!process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY);
console.log('API Key length:', process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY?.length);
```

**Prevention:**
- Only one `.env.local` file at project root
- Use `.env.example` as template (committed to git)
- Never commit actual `.env.local` (in .gitignore)

---

#### Problem: NEXT_PUBLIC_ Prefix Missing

**Symptoms:**
- Environment variable works in API routes but undefined on client
- Works on server, fails in browser

**Solution:**
```bash
# For client-side access, must have NEXT_PUBLIC_ prefix
NEXT_PUBLIC_SUPABASE_URL=...      # Works everywhere
SUPABASE_SERVICE_ROLE_KEY=...     # Server-only (good for security)
```

**Pattern:**
- `NEXT_PUBLIC_*` - Safe for client, use for non-sensitive values
- No prefix - Server-only, use for sensitive keys

---

### RLS Policy Patterns

#### Good: EXISTS Pattern for Couple Access
```sql
-- GOOD: Efficient EXISTS subquery
CREATE POLICY "Users can view their couple's data"
  ON timeline_events
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );
```

#### Bad: Multiple Subqueries
```sql
-- BAD: Inefficient, hard to maintain
CREATE POLICY "Users can view their couple's data"
  ON timeline_events
  FOR SELECT
  USING (
    couple_id = (
      SELECT id FROM couples WHERE user1_id = auth.uid()
    )
    OR couple_id = (
      SELECT id FROM couples WHERE user2_id = auth.uid()
    )
  );
```

#### Why EXISTS is Better:
- PostgreSQL optimizes EXISTS to stop at first match
- Single subquery instead of multiple
- Clearer intent
- Easier to add conditions

---

### Storage Bucket Configuration

#### Creating a Secure Bucket

**In Supabase Dashboard:**
1. Go to Storage → New Bucket
2. Name: `timeline-photos` (or appropriate name)
3. Public: **false** (private)
4. File size limit: 5MB (adjust as needed)
5. Allowed MIME types: `image/*`

**RLS Policies for Storage:**
```sql
-- Allow authenticated users to upload to their couple's folder
CREATE POLICY "Users can upload to their couple folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'timeline-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Allow users to view their couple's photos
CREATE POLICY "Users can view their couple's photos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'timeline-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Allow users to delete their couple's photos
CREATE POLICY "Users can delete their couple's photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'timeline-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );
```

**File Path Convention:**
```
{bucket}/
└── {couple_id}/
    ├── {timestamp}-{random}.jpg
    ├── {timestamp}-{random}.png
    └── ...
```

---

### Next.js 15 API Route Patterns

#### Complete API Route Template
```javascript
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // 1. Extract and validate auth token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Verify token with admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // 3. Create RLS-aware client for data operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // 4. Parse request body
    const body = await request.json();
    const { someField } = body;

    // 5. Perform database operations (RLS enforced)
    const { data, error } = await supabase
      .from('some_table')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    // 6. Return success response
    return NextResponse.json({ data });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### Modal Component Pattern

#### Standard Modal Structure
```javascript
export default function SomeModal({ isOpen, onClose, onSuccess, ...props }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setError('');
      // Reset form fields
    }
  }, [isOpen]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      // Perform action
      onSuccess();
      handleClose();
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <h2>Modal Title</h2>
          <button onClick={handleClose}>×</button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && <div className="text-red-500 mb-4">{error}</div>}
          {/* Form content */}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3">
          <button onClick={handleClose}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Performance Tips

### Parallel Data Fetching
```javascript
// GOOD: Fetch in parallel
await Promise.all([
  fetchDailyCheckin(coupleData, user.id),
  fetchFlirts(coupleData.id, user.id),
  fetchTimelineEvents(coupleData.id),
  fetchDatePlans(coupleData.id, user.id),
]);

// BAD: Sequential fetching (slower)
await fetchDailyCheckin(coupleData, user.id);
await fetchFlirts(coupleData.id, user.id);
await fetchTimelineEvents(coupleData.id);
await fetchDatePlans(coupleData.id, user.id);
```

### Conditional Fetching
```javascript
// Only fetch if needed
if (coupleData) {
  await fetchTimelineEvents(coupleData.id);
}

// Early return pattern
if (!user) {
  router.push('/login');
  return; // Don't continue fetching
}
```

### Limit Queries
```javascript
// For previews, limit results
const { data } = await supabase
  .from('timeline_events')
  .select('*')
  .eq('couple_id', coupleId)
  .order('event_date', { ascending: false })
  .limit(3); // Only need 3 for dashboard preview
```
