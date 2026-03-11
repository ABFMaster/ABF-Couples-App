# Spark Questions Library — Generation Prompt

Use this prompt in Claude Code to generate the initial question library.

## Claude Code Prompt

Generate a library of 200 Daily Spark questions for ABF, a couples relationship app.

Questions should span four tonal registers — distribute evenly:
1. DEEP: Vulnerable, emotionally resonant, requires genuine reflection
2. PLAYFUL: Light, fun, might make you laugh — think dinner party conversation starter
3. SPICY: Cards Against Humanity energy — a little risky, definitely memorable, not explicit
4. FORWARD: Future-oriented, dreams, plans, aspirations as a couple

Rules for all questions:
- Both partners must be able to answer independently
- Answers should be revealable — the reveal moment should be interesting whether answers match or diverge
- No yes/no questions — every question needs a real answer
- No therapy-speak — nothing that sounds like a worksheet
- Short — under 20 words per question
- The best questions work for couples at month 1 AND year 10

Format as a JSON array:
[
  { "id": "spark_001", "question": "...", "tone": "deep" },
  { "id": "spark_002", "question": "...", "tone": "playful" },
  ...
]

Save to lib/spark-questions.json

Do not create any other files. Do not change any existing files.
