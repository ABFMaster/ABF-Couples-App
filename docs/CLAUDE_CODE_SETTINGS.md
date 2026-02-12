# Claude Code Settings Configuration

## Recommended Settings for Your Projects

### Session History Preservation
**Setting:** `cleanupPeriodDays`  
**Recommended Value:** `99999` (effectively unlimited)  
**Why:** Past sessions contain valuable context about design decisions, bug fixes, and feature implementations. Never know when you'll need to reference them.

**To Set:**
```bash
# Open Claude Code settings
# Set cleanupPeriodDays to 99999
```

---

### Permissions Strategy

**For ABF (Early Stage):**
- **Use:** Default permissions (approve each action)
- **Why:** You're learning the codebase, want to see each step
- **When to change:** After core features work, consider hook system

**For Betty (Mature Product):**
- **Use:** Hook system (auto-approve except dangerous commands)
- **Why:** Speeds up development, protects against accidents
- **Setup:**
```bash
npx claude-code-templates@latest --hook=security/dangerous-command-blocker --yes
```

---

### MCP Tool Search
**Setting:** Enabled by default (as of v2.1.7)  
**Why It Matters:** Automatically loads MCP tools only when needed  
**Impact:** Safe to connect many MCP servers without bloating context

**To Disable (not recommended):**
Add `'MCPSearch'` to `disallowedTools` in settings

---

### Context Management Best Practices

**Start Fresh Often:**
- New feature? New session
- Different bug? New session
- Don't let sessions run too long (>100 messages)

**Use Planning Mode:**
- Automatically clears context when plan accepted
- Great for multi-step features

**Reference Documentation:**
```bash
# Instead of re-explaining, say:
"See /docs/features/weekly-checkin.md for requirements"
"Reference /docs/database/SCHEMA.md for table structure"
```

---

### Project-Specific Configurations

### ABF Project Settings
```json
{
  "cleanupPeriodDays": 99999,
  "defaultModel": "claude-sonnet-4-5",
  "permissions": "approve-each",
  "workingDirectory": "/path/to/abf-project",
  "skills": [
    "/docs/features/",
    "/docs/flows/",
    "/docs/database/",
    "/docs/gottman-principles/"
  ]
}
```

### Betty Project Settings
```json
{
  "cleanupPeriodDays": 99999,
  "defaultModel": "claude-opus-4-5",
  "permissions": "hook-system",
  "workingDirectory": "/path/to/betty-project",
  "skills": [
    "/docs/workflows/",
    "/docs/best-practices/",
    "/docs/compliance/",
    "/docs/test-cases/"
  ],
  "mcpServers": [
    "mortgage-api-connector",
    "document-classification",
    "calendar-integration"
  ]
}
```

---

### Model Selection

**Claude Sonnet 4.5** (Recommended for ABF)
- Smart, efficient for everyday use
- Good for: Feature building, debugging, documentation
- Cost-effective for iteration

**Claude Opus 4.5** (Recommended for Betty)
- Most capable for complex tasks
- Good for: Architecture decisions, multi-agent systems, compliance
- Worth the cost for business-critical app

**When to Switch:**
- Use Opus for complex architecture decisions
- Use Sonnet for implementation and iteration
- Use Haiku for simple, fast tasks (future)

---

### File Organization in Projects

### ABF Structure
```
/abf-project/
├── /docs/              # Documentation (from this setup)
│   ├── README.md
│   ├── FEATURES.md
│   ├── /flows/
│   ├── /database/
│   └── /gottman-principles/
├── /src/               # Next.js source
│   ├── /app/
│   ├── /components/
│   └── /lib/
├── /public/            # Static assets
└── /supabase/          # Supabase migrations
```

### Betty Structure
```
/betty-project/
├── /docs/              # Documentation
│   ├── BEST_PRACTICES.md
│   ├── FEATURES.md
│   ├── /workflows/
│   ├── /compliance/
│   └── /test-cases/
├── /src/               # Application source
├── /agents/            # Multi-agent configs
└── /integrations/      # API connectors
```

---

### Skills Setup

**What Are Skills?**
Skills are folders with SKILL.md files that teach Claude best practices for specific tasks.

**Using Built-in Skills:**
```bash
# For document creation
view /mnt/skills/public/docx/SKILL.md

# For spreadsheets
view /mnt/skills/public/xlsx/SKILL.md

# For presentations
view /mnt/skills/public/pptx/SKILL.md
```

**Creating Custom Skills:**
Place SKILL.md files in your project:
```
/docs/skills/
├── abf-checkin-questions.md  # Guidelines for writing questions
├── database-patterns.md       # RLS policy patterns
└── supabase-best-practices.md
```

**Using Custom Skills:**
```bash
# Tell Claude to read your skill first
"Before implementing, view /docs/skills/abf-checkin-questions.md"
```

---

### Obsidian Integration (Recommended)

**Why Obsidian?**
- Visual navigation of markdown docs
- Quick search across all files
- Easy editing and linking
- Graph view shows connections

**Setup:**
1. Install Obsidian
2. Create vault in your project's `/docs/` folder
3. Keep Claude Code terminal separate
4. Edit docs in Obsidian, reference them in Claude Code

**Benefits:**
- Human-readable documentation
- Easy to browse and update
- Version controlled (Git)
- Portable across tools

---

### VSCode Integration

**Claude Code for VSCode:**
- Now officially shipped
- Drag-and-drop files (hold shift)
- Better UI than terminal
- Diff view for changes

**When to Use:**
- **VSCode Claude Code:** Main development
- **Terminal Claude Code:** Quick tasks, automation
- **Claude.ai Web:** Planning, brainstorming

---

### Backup & Version Control

**Git Configuration:**
```bash
# In both ABF and Betty projects
git init
git add .
git commit -m "Initial commit with documentation"

# Create .gitignore
echo "node_modules/" >> .gitignore
echo ".env.local" >> .gitignore
echo ".next/" >> .gitignore
```

**What to Commit:**
- ✅ All documentation
- ✅ Source code
- ✅ Configuration files
- ✅ Database migrations
- ❌ .env files (secrets)
- ❌ node_modules
- ❌ Build artifacts

---

### Performance Optimization

**When Claude Code Feels Slow:**
1. Start fresh session (context is too large)
2. Be more specific in requests
3. Reference docs instead of re-explaining
4. Use Planning mode for complex tasks
5. Check if MCP servers are overloaded

**Token Usage Awareness:**
- Long sessions = expensive
- Copy-paste large files = expensive
- Better: Reference files by path
- Let Claude read what it needs

---

### Security Settings

**Environment Variables:**
```bash
# Never commit these
# Store in .env.local

# Supabase (ABF)
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# APIs (Betty)
CREDIT_BUREAU_API_KEY=secret
MORTGAGE_API_KEY=secret
```

**Supabase RLS:**
- Always enabled
- Test policies thoroughly
- Never disable in production

---

### Workflow Optimization

**Daily Workflow:**
1. Open project in VSCode
2. Open Obsidian for docs
3. Open Claude Code in terminal
4. Reference docs as you work
5. Update docs as decisions made
6. Commit regularly

**Weekly Workflow:**
1. Review past week's sessions
2. Extract decisions into docs
3. Update FEATURES.md with progress
4. Clean up unused files
5. Plan next week's work

---

### Troubleshooting

**"Claude Code won't start"**
- Check Node.js version (18+)
- Update Claude Code: `npm install -g claude-code@latest`
- Clear cache: `rm -rf ~/.cache/claude-code`

**"Can't access my files"**
- Check working directory setting
- Verify file permissions
- Try absolute paths

**"MCP server not loading"**
- Check server is running
- Verify configuration
- Look at Claude Code logs

**"Supabase connection fails"**
- Check environment variables loaded
- Verify .env.local in right directory
- Test credentials in Supabase dashboard

---

## Quick Reference Commands

```bash
# Update Claude Code
npm install -g claude-code@latest

# Start Claude Code in project
cd /path/to/project
claude-code

# View settings
cat ~/.config/claude-code/settings.json

# Check session history
ls ~/.config/claude-code/sessions/

# Install dangerous command blocker
npx claude-code-templates@latest --hook=security/dangerous-command-blocker --yes

# View available skills
ls /mnt/skills/public/
ls /mnt/skills/examples/
```

---

## Resources

**Official Docs:**
- Claude Code: https://docs.claude.ai/en/docs/code
- Supabase: https://supabase.com/docs
- Next.js: https://nextjs.org/docs

**Community:**
- Claude Code GitHub: https://github.com/anthropics/claude-code
- Claude Discord: [invite link]
- X/Twitter: @claudeai

**Zvi's Articles:**
- Claude Codes #1, #2, #3 on Don't Worry About the Vase
- Keep up with latest tips and tricks
