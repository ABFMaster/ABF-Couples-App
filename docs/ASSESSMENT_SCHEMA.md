# Relationship Assessment Database Schema

## Overview

This document describes the database schema for the 5-module relationship assessment system.

## Tables

### `relationship_assessments`

Stores individual assessment attempts and results.

```sql
CREATE TABLE relationship_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,

  -- Raw answers stored as JSONB
  -- Format: { "question_id": value, ... }
  -- value can be: number (for scale/choice), object (for ranking)
  answers JSONB DEFAULT '{}',

  -- Computed results stored as JSONB
  -- Format: {
  --   modules: [{ moduleId, title, score, percentage, strengthLevel, insights }],
  --   overallPercentage: number,
  --   completedAt: timestamp
  -- }
  results JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT unique_active_assessment UNIQUE (user_id, couple_id, completed_at)
);

-- Indexes for common queries
CREATE INDEX idx_assessments_user ON relationship_assessments(user_id);
CREATE INDEX idx_assessments_couple ON relationship_assessments(couple_id);
CREATE INDEX idx_assessments_completed ON relationship_assessments(completed_at) WHERE completed_at IS NOT NULL;
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE relationship_assessments ENABLE ROW LEVEL SECURITY;

-- Users can view their own assessments
CREATE POLICY "Users can view own assessments"
  ON relationship_assessments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view partner's completed assessments (for comparison)
CREATE POLICY "Users can view partner completed assessments"
  ON relationship_assessments FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
    AND completed_at IS NOT NULL
  );

-- Users can insert their own assessments
CREATE POLICY "Users can insert own assessments"
  ON relationship_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own incomplete assessments
CREATE POLICY "Users can update own incomplete assessments"
  ON relationship_assessments FOR UPDATE
  USING (auth.uid() = user_id AND completed_at IS NULL);
```

## Data Structures

### Answer Format

Answers are stored as JSONB with question IDs as keys:

```json
{
  "kp_1": 4,
  "kp_2": 3,
  "kp_3": 5,
  "le_1": {
    "words": 1,
    "time": 3,
    "touch": 2,
    "service": 4,
    "gifts": 5
  },
  "cp_1": 4,
  "as_1": 5,
  "sv_1": 3
}
```

### Results Format

Results are computed when assessment is completed:

```json
{
  "modules": [
    {
      "moduleId": "know_your_partner",
      "title": "Know Your Partner",
      "score": 4.2,
      "percentage": 84,
      "strengthLevel": "strong",
      "insights": {
        "headline": "Deep Emotional Connection",
        "description": "You've built a rich understanding...",
        "tips": [
          "Keep nurturing your curiosity...",
          "Share your own inner world...",
          "Use this knowledge to surprise..."
        ]
      }
    }
  ],
  "overallPercentage": 72,
  "completedAt": "2024-01-15T10:30:00Z"
}
```

### Strength Levels

| Level | Percentage Range | Description |
|-------|-----------------|-------------|
| `strong` | 80-100% | Area of strength |
| `good` | 60-79% | Solid foundation |
| `developing` | 40-59% | Room for growth |
| `growth_area` | 0-39% | Priority focus area |

## Modules

| Module ID | Title | Questions |
|-----------|-------|-----------|
| `know_your_partner` | Know Your Partner | kp_1 to kp_6 |
| `love_expressions` | How You Give & Receive Love | le_1 to le_6 |
| `communication` | Communication Patterns | cp_1 to cp_6 |
| `attachment_security` | Attachment & Security | as_1 to as_6 |
| `shared_vision` | Shared Vision | sv_1 to sv_6 |

## Query Examples

### Get user's latest completed assessment

```sql
SELECT * FROM relationship_assessments
WHERE user_id = $1
  AND couple_id = $2
  AND completed_at IS NOT NULL
ORDER BY completed_at DESC
LIMIT 1;
```

### Get both partners' assessments for comparison

```sql
SELECT
  ra.*,
  p.first_name as user_name
FROM relationship_assessments ra
JOIN profiles p ON ra.user_id = p.id
WHERE ra.couple_id = $1
  AND ra.completed_at IS NOT NULL
ORDER BY ra.completed_at DESC;
```

### Get assessment completion status for couple

```sql
SELECT
  c.id as couple_id,
  COUNT(CASE WHEN ra.user_id = c.user1_id AND ra.completed_at IS NOT NULL THEN 1 END) > 0 as user1_completed,
  COUNT(CASE WHEN ra.user_id = c.user2_id AND ra.completed_at IS NOT NULL THEN 1 END) > 0 as user2_completed
FROM couples c
LEFT JOIN relationship_assessments ra ON ra.couple_id = c.id
WHERE c.id = $1
GROUP BY c.id;
```

## Migration

To add this table to an existing database:

```sql
-- Run this migration in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS relationship_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}',
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_assessments_user ON relationship_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_couple ON relationship_assessments(couple_id);
CREATE INDEX IF NOT EXISTS idx_assessments_completed ON relationship_assessments(completed_at) WHERE completed_at IS NOT NULL;

ALTER TABLE relationship_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessments"
  ON relationship_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view partner completed assessments"
  ON relationship_assessments FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
    AND completed_at IS NOT NULL
  );

CREATE POLICY "Users can insert own assessments"
  ON relationship_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own incomplete assessments"
  ON relationship_assessments FOR UPDATE
  USING (auth.uid() = user_id AND completed_at IS NULL);
```

## Attribution

This assessment system is informed by relationship research including work by Dr. John Gottman, Dr. Gary Chapman, and attachment theory (Bowlby/Ainsworth). All questions are original.
