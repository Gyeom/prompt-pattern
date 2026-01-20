# Prompt Pattern Plugin

[한국어](README.ko.md)

> Detect repeated prompts and suggest automation for Claude Code

## Introduction

When using Claude Code, you often repeat similar requests:
- "Commit the changes"
- "Run the tests"
- "Build and check for errors"

**Prompt Pattern** detects these repetitions and helps you automate them as Skills.

```
💡 You've made "commit-related requests" 12 times!
   Create /commit to use it faster.
```

## Installation

```bash
# Add marketplace
claude plugin marketplace add Gyeom/prompt-pattern

# Install plugin
claude plugin install prompt-pattern
```

## Usage

### Automatic Detection

After installation, you don't need to do anything. The plugin automatically:

1. Silently collects all prompts
2. Analyzes repetition patterns
3. Suggests at session start (once per day)

### /patterns Command

To check patterns manually:

```
You: /patterns

Claude:
🔍 Repeated Prompt Patterns (last 14 days)

1. "Commit-related requests" - 12 times
   Examples: "commit the changes", "write commit message..."
   💡 Create as /commit Skill?

2. "Test execution requests" - 8 times
   Examples: "run tests", "execute npm test"
   💡 Create as /test Skill?

Which pattern would you like to make into a Skill?

You: Make #1

Claude: ✅ /commit Skill has been created!
        📍 Location: .claude/skills/commit.md
        🚀 Usage: /commit
```

### Dismissing Suggestions

You can dismiss patterns you're not interested in:

```
You: I'm not interested in the test pattern

Claude: Got it! I won't suggest this pattern anymore.
```

## How It Works

### Data Collection

- **UserPromptSubmit Hook**: Captures all prompts
- Storage: `~/.prompt-pattern/prompts.json`
- Keeps max 1000 entries (auto-deletes old ones)
- Slash commands (`/xxx`) are not stored

### Pattern Analysis

- **LLM Semantic Analysis**: Claude analyzes prompt meanings directly
- Groups prompts with similar intent/purpose (no hardcoded mappings)
- Requires minimum 3 repetitions to be recognized as pattern
- Only analyzes last 14 days of data

### Suggestion Timing

- **SessionStart Hook**: Suggests at session start
- Once per 24 hours only (minimize interruption)
- Starts suggesting after collecting minimum 5 prompts

## Configuration

Create `~/.prompt-pattern/config.json` to customize:

```json
{
  "minPatternCount": 3,
  "daysToAnalyze": 14,
  "suggestCooldownHours": 24,
  "minPromptsBeforeSuggest": 5,
  "maxStoredPrompts": 1000
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `minPatternCount` | 3 | Minimum repetitions |
| `daysToAnalyze` | 14 | Analysis period (days) |
| `suggestCooldownHours` | 24 | Suggestion interval (hours) |
| `minPromptsBeforeSuggest` | 5 | Min prompts before suggesting |
| `maxStoredPrompts` | 1000 | Max stored prompts |

## File Structure

```
prompt-pattern/
├── .claude-plugin/
│   └── marketplace.json      # Marketplace metadata
├── plugins/
│   └── prompt-pattern/
│       ├── .claude-plugin/
│       │   └── plugin.json   # Plugin metadata
│       ├── hooks/
│       │   ├── hooks.json    # Hook configuration
│       │   └── scripts/
│       │       ├── config.js           # Config loader
│       │       ├── capture-prompt.js   # Prompt capture
│       │       └── suggest-pattern.js  # Session start suggestion
│       ├── commands/
│       │   └── patterns.md   # /patterns command
│       └── skills/
│           └── create-pattern-skill.md  # Skill creation helper
├── README.md
└── README.ko.md
```

## Data & Privacy

- All data stored **locally** only (`~/.prompt-pattern/`)
- Never sent to external servers
- Delete anytime: `rm -rf ~/.prompt-pattern`

## Troubleshooting

### Patterns not detected

- Minimum 5 prompts required
- Slash commands (`/xxx`) are not collected
- Check if data exists in `~/.prompt-pattern/prompts.json`

### No suggestions appearing

- Suggestions appear once per 24 hours
- Reset cooldown: `rm ~/.prompt-pattern/last-suggest.json`

### Errors occurring

- Check `~/.prompt-pattern/error.log`
- Report issues: [GitHub Issues](https://github.com/Gyeom/prompt-pattern/issues)

## License

MIT

## Contributing

PRs welcome!
