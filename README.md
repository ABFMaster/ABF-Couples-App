# ABF - Always Be Flirting

A couples relationship app designed to help partners stay connected, communicate better, and nurture their relationship through daily check-ins, shared memories, and thoughtful features.

## Features

### Core Features (Built)
- **Daily Check-ins** - Answer thoughtful questions together, see each other's responses, react with hearts and comments
- **AI Relationship Coach** - Personalized guidance powered by Claude, aware of your love languages and communication styles
- **Flirts** - Send love notes, GIFs, and photos to brighten your partner's day
- **Our Timeline** - A horizontal scrapbook of your relationship milestones and memories
- **Date Night Planner** - 58 curated date ideas with filters, plus custom date planning and partner suggestions
- **Partner Insights** - Understand your partner's love languages, communication style, and values
- **Weekly Reflections** - Review your week together and pick favorite moments
- **Relationship Health Meter** - Track your connection over time

### Onboarding
- **18 Questions** - Comprehensive relationship assessment for compatibility insights
- **Profile Quiz** - Personal preferences including love languages, communication style, hobbies, and more

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL with Row-Level Security)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **AI:** Anthropic Claude API
- **Styling:** Tailwind CSS

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Anthropic API key

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Database Setup

Run the SQL files in `docs/database/` in your Supabase SQL editor:

1. Core tables (profiles, couples, etc.) - already set up
2. `timeline_events.sql` - For the Timeline feature
3. `date_night.sql` - For the Date Night feature (includes 58 curated date ideas)

### Storage Setup

Create a storage bucket in Supabase:
- Name: `timeline-photos`
- Public: false

## Project Structure

```
abf-app/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   └── ai-coach/      # AI coach endpoint
│   ├── dashboard/         # Main dashboard
│   ├── ai-coach/          # AI coach chat interface
│   ├── timeline/          # Relationship timeline
│   ├── date-night/        # Date planner
│   ├── profile-onboarding/ # Profile quiz
│   ├── onboarding/        # 18 Questions
│   ├── connect/           # Partner connection
│   ├── flirts/            # Flirt history
│   ├── partner-insights/  # Partner profile view
│   ├── results/           # Compatibility results
│   ├── settings/          # Account settings
│   └── weekly-reflection/ # Weekly reflection
├── components/            # Reusable React components
├── lib/                   # Utilities
│   ├── supabase.js       # Supabase client
│   └── ai-coach-context.js # AI context builder
└── docs/                  # Documentation
    ├── database/         # SQL schemas
    ├── sessions/         # Development logs
    ├── FEATURES.md       # Feature list & status
    └── TECHNICAL_DECISIONS.md # Architecture docs
```

## Documentation

- [Features List](docs/FEATURES.md) - Complete feature list with status
- [Technical Decisions](docs/TECHNICAL_DECISIONS.md) - Architecture and patterns
- [Session Logs](docs/sessions/) - Development session documentation

## Design Philosophy

### Visual
- Warm pink/purple gradients
- Generous whitespace
- Emoji-rich, playful feel
- Mobile-first responsive design

### Voice & Tone
- Warm and encouraging
- Never judgmental
- Celebrates effort, not perfection
- Gentle reminders, not nagging

## Contributing

This is a personal project for Matt & Cass. If you're interested in similar features for your own use, feel free to fork!

## License

Private project - not for redistribution.

---

Built with love for keeping love alive.
# Force redeploy
