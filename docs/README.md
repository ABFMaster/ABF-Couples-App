# ABF (Always Be Flirting) - Project Documentation

## Project Vision
A couples relationship app that helps partners maintain meaningful conversations and strengthen connections through structured check-ins, relationship assessments, and lifestyle integration.

## Tech Stack
- **Frontend**: Next.js (React framework)
- **Backend**: Supabase (PostgreSQL database, authentication, real-time)
- **Development**: Claude Code for AI-assisted development
- **Deployment**: Vercel (planned)

## Core Philosophy
Based on Gottman Institute relationship research principles:
- Regular, structured communication
- Building love maps (knowing your partner deeply)
- Turning towards instead of away
- Managing conflict constructively
- Creating shared meaning

## Development Approach

### Setup First, Then Build
Since ABF is in early stages:
- ✅ Create clear documentation structure NOW
- ✅ Define features and user flows BEFORE coding
- ✅ Set up Claude Code properly from the start
- ⚠️ Avoid over-optimizing - ship features quickly
- 🎯 Focus: Get signup flow working, then iterate

### Best Practices for ABF Development

#### 1. Documentation Strategy
Create lightweight but clear markdown docs:
- Feature specifications (what, not how)
- User flows (step-by-step journeys)
- Database schema (as it evolves)
- Gottman principles integration notes
- Design decisions log

#### 2. Context Management
- **Keep sessions focused** - One feature per session
- **Document decisions** - Why you chose approach X over Y
- **Reference prior work** - Link to relevant past sessions
- **Start fresh often** - Don't carry cruft between features

#### 3. When to Use Claude Code vs. Web Claude
- **Claude Code**: Building actual features, database work, file creation
- **Web Claude**: Planning, design discussions, brainstorming
- **Switch freely**: Use whichever feels right for the task

#### 4. Development Workflow
```
1. Document feature in /docs/features/
2. Sketch user flow in /docs/flows/
3. Open Claude Code session
4. Reference docs: "See /docs/features/weekly-checkin.md"
5. Build feature
6. Update docs with what actually shipped
```

#### 5. Avoid These Traps
- ❌ Perfecting the setup instead of building
- ❌ Over-engineering for scale you don't need yet
- ❌ Adding features before core loop works
- ❌ Spending hours on styling before functionality works
- ✅ Ship quickly, learn, iterate

## Database Design Principles

### Users & Authentication
- Leverage Supabase Auth (don't reinvent)
- Store minimal extra user data
- Link partners via relationship table

### Relationships
- One user can have one active partner
- Historical data preserved if relationship ends
- Privacy controls: what's shared vs. private

### Check-ins & Assessments
- Flexible schema for different question types
- Store responses separately from questions (allow retakes)
- Track completion and scoring
- Enable comparison over time

### Content & Media
- Store music links, photos, notes
- Tag with context (which check-in, date, theme)
- Enable search and retrieval

## Key Technical Decisions

### Why Next.js
- Server-side rendering for better SEO
- API routes for backend logic
- File-based routing (easy to understand)
- Great developer experience
- Vercel deployment is seamless

### Why Supabase
- PostgreSQL (real database, not NoSQL)
- Built-in auth (Google, email, magic links)
- Real-time subscriptions (both partners see updates)
- Row-level security (data privacy)
- Generous free tier

### Why Start Over from Bubble.io
- Full control over code and data
- Modern tech stack (easier to hire devs later)
- Better performance and user experience
- No platform limitations
- Cheaper at scale

## MVP Success Criteria
Ship these features, nothing more:
1. User signup/login (individual accounts)
2. Partner connection (link two accounts)
3. One type of weekly check-in
4. View your answers and your partner's
5. Basic profile pages

**That's it.** If these work well, add more.

## Long-term Vision

### Phase 1: Core Loop (Current)
- Signup & partner linking
- Weekly check-ins
- View each other's responses

### Phase 2: Rich Content
- Photo sharing
- Music/playlist sharing  
- Free-form notes
- Celebration of milestones

### Phase 3: Assessments
- Initial relationship assessment
- Periodic check-ins (monthly/quarterly)
- Track relationship health over time
- Gottman-based metrics

### Phase 4: Lifestyle Integration
- Calendar integration (date planning)
- Gift/surprise ideas
- Memory journal
- Relationship goals tracking

### Phase 5: Community (Maybe)
- Anonymous community Q&A
- Expert content
- Relationship challenges
- Guided exercises

## Constraints & Principles

### Must Haves
- ✅ Privacy-first (data is sacred)
- ✅ Mobile-friendly (couples use phones)
- ✅ Fast & responsive (no lag between partners)
- ✅ Beautiful UI (this is about connection)
- ✅ No ads (subscription model)

### Must Not Have
- ❌ Gamification that feels manipulative
- ❌ Social comparison (no leaderboards)
- ❌ Surveillance features (no tracking locations)
- ❌ Pressure/guilt (positive reinforcement only)

## Resources
- Gottman Institute: https://www.gottman.com/
- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs
- Feature Specs: `/docs/features/`
- User Flows: `/docs/flows/`
- Database Schema: `/docs/database/`
