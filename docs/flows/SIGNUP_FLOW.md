# ABF - Signup & Onboarding Flow

## User Journey: First User (User A)

### Step 1: Landing Page
- Hero message: "Stay Connected with Your Partner"
- Subtext: "Meaningful conversations. Deeper connection. One check-in at a time."
- CTA: "Get Started Free"
- Show preview screenshots
- Trust signals: "Privacy-first. Your data stays between you two."

### Step 2: Signup Form
```
┌─────────────────────────────┐
│  Create Your Account        │
│                             │
│  Name: [_____________]      │
│  Email: [_____________]     │
│  Password: [_____________]  │
│                             │
│  [ Continue with Google ]   │
│                             │
│  [Create Account]           │
│                             │
│  Already have account?      │
│  Sign in                    │
└─────────────────────────────┘
```

**Validation:**
- Email format check
- Password minimum 8 characters
- Name required
- Check if email already exists

**Technical:**
- POST to Supabase Auth
- Create profile record
- Redirect to Step 3

### Step 3: Profile Creation
```
┌─────────────────────────────┐
│  Tell Us About Yourself     │
│                             │
│  [Upload Photo] (optional)  │
│                             │
│  Preferred Name:            │
│  [Matt___________]          │
│                             │
│  About You: (optional)      │
│  [__________________]       │
│  [__________________]       │
│                             │
│  [Continue]                 │
└─────────────────────────────┘
```

**Default:**
- Use name from signup
- Generate default avatar (initials)

### Step 4: Connect Your Partner
```
┌─────────────────────────────┐
│  Connect with Your Partner  │
│                             │
│  Share this link with       │
│  your partner:              │
│                             │
│  ┌─────────────────────────┐│
│  │ abf.app/join/abc123xyz  ││
│  │ [Copy Link]             ││
│  └─────────────────────────┘│
│                             │
│  Or send via:               │
│  [Text] [Email] [WhatsApp]  │
│                             │
│  Waiting for partner...     │
│  ⏳                         │
│                             │
│  [I'll do this later]       │
└─────────────────────────────┘
```

**Technical:**
- Generate unique invite code
- Store in `invites` table
- Code expires in 7 days
- One-time use only
- Poll for partner acceptance

### Step 5: Welcome Dashboard
```
┌─────────────────────────────┐
│  Welcome, Matt! 🎉         │
│                             │
│  Partner Status:            │
│  ⏳ Waiting for Cass       │
│                             │
│  Once connected, you'll:    │
│  ✓ Complete weekly check-ins│
│  ✓ Share thoughts & photos  │
│  ✓ Build deeper connection  │
│                             │
│  [Resend Invite]            │
│  [Explore App]              │
└─────────────────────────────┘
```

---

## User Journey: Second User (User B)

### Step 1: Invite Landing Page
URL: `abf.app/join/abc123xyz`

```
┌─────────────────────────────┐
│  Matt invited you to ABF!   │
│                             │
│  [Matt's Photo]             │
│                             │
│  Join Matt on Always Be     │
│  Flirting and strengthen    │
│  your connection together.  │
│                             │
│  [Accept Invite]            │
│                             │
│  What is ABF?               │
└─────────────────────────────┘
```

**Technical:**
- Validate invite code
- Show inviter's name/photo
- Check if code expired/used

### Step 2: Signup Form (Same as User A)
Pre-filled context: "Joining Matt"

### Step 3: Profile Creation (Same as User A)

### Step 4: Confirm Connection
```
┌─────────────────────────────┐
│  Confirm Connection         │
│                             │
│  You're about to connect    │
│  with Matt                  │
│                             │
│  [Matt's Photo]             │
│  Matt                       │
│  matt@example.com           │
│                             │
│  Is this your partner?      │
│                             │
│  [Yes, Connect!]            │
│  [No, Go Back]              │
└─────────────────────────────┘
```

**Security:**
- Show clear identity confirmation
- Prevent accidental wrong connections
- Allow back-out

### Step 5: Success!
```
┌─────────────────────────────┐
│  You're Connected! 💕       │
│                             │
│  [Matt's Photo] [Cass Photo]│
│  Matt & Cass                │
│                             │
│  You can now:               │
│  ✓ Start weekly check-ins   │
│  ✓ Share your thoughts      │
│  ✓ Grow together            │
│                             │
│  [Start First Check-in]     │
└─────────────────────────────┘
```

**Trigger:**
- Both users notified
- User A sees update in real-time
- Redirect both to dashboard

---

## Post-Connection: First Check-in Flow

### Step 1: Check-in Prompt
```
┌─────────────────────────────┐
│  This Week's Check-in       │
│  Theme: Gratitude           │
│                             │
│  Take 5 minutes to reflect  │
│  and share with Cass.       │
│                             │
│  4 questions • ~5 min       │
│                             │
│  [Start Check-in]           │
│                             │
│  Cass hasn't started yet    │
└─────────────────────────────┘
```

### Step 2: Answer Questions
```
┌─────────────────────────────┐
│  Question 1 of 4            │
│  ▓▓▓░░░░░░░ 25%            │
│                             │
│  What made you smile        │
│  this week?                 │
│                             │
│  [___________________]      │
│  [___________________]      │
│  [___________________]      │
│                             │
│  Optional:                  │
│  [📷 Add Photo]             │
│  [🎵 Add Song]              │
│                             │
│  [Next]                     │
└─────────────────────────────┘
```

**UX:**
- Save draft automatically
- Can exit and resume
- Progress indicator
- Optional enrichment

### Step 3: Review & Submit
```
┌─────────────────────────────┐
│  Review Your Responses      │
│                             │
│  Q1: What made you smile?   │
│  Your answer...             │
│  [Edit]                     │
│                             │
│  Q2: Looking forward to?    │
│  Your answer...             │
│  [Edit]                     │
│                             │
│  ...                        │
│                             │
│  [Submit Check-in]          │
│  [Save Draft]               │
└─────────────────────────────┘
```

### Step 4: Waiting for Partner
```
┌─────────────────────────────┐
│  Check-in Submitted! ✓      │
│                             │
│  Waiting for Cass to        │
│  complete her check-in...   │
│                             │
│  You'll see each other's    │
│  responses once both are    │
│  complete.                  │
│                             │
│  [Send Gentle Reminder]     │
│  [View My Responses]        │
└─────────────────────────────┘
```

### Step 5: Both Complete - Reveal!
```
┌─────────────────────────────┐
│  This Week's Check-in 💫    │
│  Completed by both!         │
│                             │
│  Matt's Responses           │
│  Q1: What made you smile?   │
│  "Seeing Larry play..."     │
│                             │
│  Cass's Responses           │
│  Q1: What made you smile?   │
│  "Your playlist for me..."  │
│                             │
│  [See All Responses]        │
│  [Add a Comment]            │
└─────────────────────────────┘
```

**Trigger:**
- Notify both via push/email
- Real-time update if one is online
- Celebrate completion

---

## Edge Cases & Error States

### Invite Code Issues
- **Expired**: "This invite has expired. Ask Matt to send a new one."
- **Already Used**: "This invite has already been used."
- **Invalid**: "This invite code is invalid."

### Email Already Exists
- "This email is already registered. Try signing in instead."
- Show sign-in link

### Partner Disconnection Request
```
┌─────────────────────────────┐
│  Disconnect from Matt?      │
│                             │
│  ⚠️ This will:              │
│  • End your connection      │
│  • Archive your shared data │
│  • Require new invite to    │
│    reconnect                │
│                             │
│  [Cancel]                   │
│  [Yes, Disconnect]          │
└─────────────────────────────┘
```

### Network Errors
- "Connection lost. Retrying..."
- Auto-save drafts locally
- Sync when reconnected

### Incomplete Profile
- Allow progression with minimal info
- Prompt to complete later
- Don't block core features

---

## Technical Implementation Notes

### Database Tables Needed

**users** (handled by Supabase Auth)
- id (uuid)
- email
- created_at

**profiles**
- id (uuid, FK to users.id)
- name (text)
- photo_url (text)
- bio (text)
- created_at
- updated_at

**invites**
- id (uuid)
- code (text, unique)
- inviter_id (uuid, FK to users.id)
- expires_at (timestamp)
- used_at (timestamp, nullable)
- used_by_id (uuid, nullable, FK to users.id)
- created_at

**relationships**
- id (uuid)
- user_a_id (uuid, FK to users.id)
- user_b_id (uuid, FK to users.id)
- status (enum: pending, active, disconnected)
- connected_at (timestamp)
- disconnected_at (timestamp, nullable)

### API Endpoints

- POST `/api/auth/signup` - Create account
- POST `/api/profile` - Create/update profile
- POST `/api/invite/create` - Generate invite code
- GET `/api/invite/:code` - Validate invite
- POST `/api/relationship/connect` - Accept invite
- DELETE `/api/relationship/:id` - Disconnect

### Real-time Subscriptions

```javascript
// User A waiting for User B
supabase
  .channel('relationship-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'relationships',
    filter: `user_a_id=eq.${userId}`
  }, handleConnectionUpdate)
  .subscribe()
```

---

## Design Considerations

### Mobile-First
- Large tap targets (48px minimum)
- Easy one-handed use
- Thumb-friendly button placement
- Fast loading (optimize images)

### Accessibility
- Proper heading hierarchy
- Alt text for images
- Keyboard navigation
- Screen reader support
- Color contrast (WCAG AA)

### Animations
- Celebrate micro-moments
- Connection success: confetti
- Check-in complete: pulse
- Partner viewed: subtle glow
- Keep animations short (<300ms)

### Loading States
- Skeleton screens (not spinners)
- Optimistic UI updates
- Clear error messages
- Retry mechanisms
