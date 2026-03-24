<h1 align="center">claude-sync</h1>

<p align="center">
  <strong>Sync your Claude Code settings, skills, and config across machines</strong>
</p>

<p align="center">
  <a href="https://github.com/danielcregg/claude-sync/blob/master/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Version-1.0.0-green.svg" alt="Version 1.0.0">
  <img src="https://img.shields.io/badge/Claude%20Code-blueviolet.svg" alt="Claude Code">
  <img src="https://img.shields.io/badge/Shell-bash-informational.svg" alt="Bash">
  <img src="https://img.shields.io/badge/Dependencies-git%20%2B%20gh-lightgrey.svg" alt="Dependencies: git + gh">
  <img src="https://img.shields.io/badge/macOS%20%7C%20Linux%20%7C%20Windows-supported-success.svg" alt="Cross-platform">
</p>

<p align="center">
  One command to sync your Claude Code skills, settings, agents, commands, and hooks to a private GitHub repo. One command to pull them on a new machine. Zero config. No encryption keys to manage. No cloud accounts to set up.
</p>

---

## The Problem

You use Claude Code on multiple machines. Every time you set up a new one, you have to:
- Reinstall all your custom skills
- Reconfigure settings.json (plugins, permissions, model preferences)
- Copy over agents, commands, hooks, and keybindings
- Remember what you had and what you didn't

Or worse — you make a great skill on your laptop and forget to copy it to your desktop.

## The Solution

```bash
# On your main machine (once)
claude-sync init

# On any other machine
claude-sync clone

# That's it. Everything syncs.
```

---

## Quick Start

### Install

```bash
curl -fsSL https://raw.githubusercontent.com/danielcregg/claude-sync/master/install.sh | bash
```

Or clone manually:
```bash
git clone https://github.com/danielcregg/claude-sync.git
cp claude-sync/claude-sync ~/.local/bin/
chmod +x ~/.local/bin/claude-sync
```

### First Machine (setup)

```bash
claude-sync init
```

This:
1. Creates a **private** GitHub repo (`claude-sync-config`)
2. Writes a smart `.gitignore` that excludes secrets and ephemeral data
3. Commits your settings, skills, agents, commands, and hooks
4. Pushes to GitHub

### New Machine (clone)

```bash
claude-sync clone
```

Done. All your skills, settings, and config are there.

### Keep in Sync

```bash
claude-sync push              # After making changes
claude-sync pull              # Before starting work on another machine
claude-sync status            # Check what's changed
```

---

## What Gets Synced

<table>
<tr><th>Synced</th><th>Not Synced (excluded by default)</th></tr>
<tr>
<td>

| File/Dir | What |
|----------|------|
| `settings.json` | Plugins, permissions, model prefs |
| `skills/` | All custom skills |
| `agents/` | Custom agents |
| `commands/` | Custom slash commands |
| `hooks/` | Hook definitions |
| `rules/` | Custom rules |
| `CLAUDE.md` | Global instructions |
| `keybindings.json` | Key bindings |
| `statusline-command.sh` | Status line |
| `plugins/installed_plugins.json` | Plugin list |
| `plugins/known_marketplaces.json` | Marketplace config |
| `plugins/blocklist.json` | Blocked plugins |

</td>
<td>

| File/Dir | Why |
|----------|-----|
| `.credentials.json` | Contains secrets |
| `projects/` | 85MB+, machine-specific |
| `local/` | 176MB, node dependencies |
| `telemetry/` | Machine-specific |
| `debug/` | Machine-specific logs |
| `cache/` | Regenerated automatically |
| `shell-snapshots/` | Environment-specific |
| `history.jsonl` | Personal conversations |
| `paste-cache/` | May contain secrets |
| `statsig/` | Session analytics |
| `sessions/`, `ide/` | Process-specific |
| `backups/` | May contain secrets |

</td>
</tr>
</table>

> The `.gitignore` is carefully tuned to sync **everything useful** while excluding **everything sensitive or machine-specific**. Credentials never leave your machine.

---

## Commands

| Command | What It Does |
|---------|-------------|
| `claude-sync init` | First-time setup — creates private repo, initial push |
| `claude-sync init --hook` | Setup + install auto-sync hook |
| `claude-sync push` | Commit and push changes |
| `claude-sync push -m "msg"` | Push with custom message |
| `claude-sync pull` | Pull latest from GitHub |
| `claude-sync status` | Show changes and sync state |
| `claude-sync clone` | Set up new machine from existing repo (auto-detects GitHub user) |
| `claude-sync doctor` | Check sync health, detect issues |
| `claude-sync version` | Show version |

### Flags

| Flag | Works With | What It Does |
|------|-----------|-------------|
| `-m, --message` | push | Custom commit message |
| `-f, --force` | push, pull | Skip confirmation |
| `-q, --quiet` | push, pull | Minimal output |
| `-n, --dry-run` | push, pull | Preview without changes |
| `--hook` | init | Install auto-sync hook |

---

## Auto-Sync (Optional)

Want changes pushed automatically when you exit Claude Code? Add a `Stop` hook to your `settings.json`:

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "claude-sync push -q -m 'auto-sync' 2>/dev/null || true",
        "timeout": 10
      }]
    }]
  }
}
```

Or run `claude-sync init --hook` to get instructions for adding it.

---

## Security

- **Private repo**: `claude-sync init` creates a **private** GitHub repo. Only you can see it.
- **Credentials excluded**: `.credentials.json` and all secret files are in `.gitignore` and never committed.
- **No encryption needed**: Since the repo is private and credentials are excluded, there's nothing sensitive to encrypt.
- **Doctor check**: `claude-sync doctor` verifies that no secrets are accidentally tracked.
- **No third-party services**: Uses only `git` and `gh` (GitHub CLI) — tools you already have.

### What if I have API keys in settings.json?

If you store API keys in the `env` block of `settings.json`, they **will** be synced (since `settings.json` is synced). Options:
1. Move secrets to environment variables on each machine instead
2. Use `settings.local.json` for machine-specific secrets (add it to `.gitignore`)
3. Use your OS keychain for sensitive values

---

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│  Machine A                        Machine B              │
│  ~/.claude/                       ~/.claude/             │
│  ├── settings.json                ├── settings.json      │
│  ├── skills/                      ├── skills/            │
│  ├── agents/                      ├── agents/            │
│  └── ...                          └── ...                │
│       │                                │                 │
│       │ claude-sync push               │ claude-sync pull│
│       ▼                                ▼                 │
│  ┌─────────────────────────────────────────┐             │
│  │  GitHub (private repo)                  │             │
│  │  yourname/claude-sync-config            │             │
│  └─────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────┘
```

Under the hood, `claude-sync` initializes a git repo inside `~/.claude/`, adds a comprehensive `.gitignore`, and pushes to a private GitHub repo. That's it. No magic. No daemons. No cloud services. Just git.

---

## Requirements

- **git** — you almost certainly have this
- **gh** (GitHub CLI) — [install here](https://cli.github.com/) if you don't have it
- **A GitHub account** — free tier works fine (unlimited private repos)

Claude Code itself runs on Node.js, but `claude-sync` is a pure bash script with no runtime dependencies.

---

## Compared to Alternatives

| Feature | claude-sync | dotfiles (manual) |
|---------|:-----------:|:------------------:|
| One-command setup | Yes | No |
| No compiled binary | Yes | Yes | 
| No cloud account | Yes | Yes |
| No encryption keys | Yes | Yes |
| Auto-sync hook | Yes | No |
| Smart .gitignore | Yes | Manual |
| Doctor/health check | Yes | No | 
| Cross-platform | Yes | Partial | 
| Dependencies | git, gh | git |

---

## Compatibility

| Platform | Status |
|----------|--------|
| macOS | Fully supported |
| Linux | Fully supported |
| Windows (Git Bash / WSL) | Fully supported |
| Windows (PowerShell) | Not supported (use Git Bash) |

---

## FAQ

<details>
<summary><strong>Can I use this with an existing dotfiles repo?</strong></summary>

Yes. If you already have a dotfiles repo with a `.claude/` directory, you can either:
1. Continue using your dotfiles repo and skip `claude-sync`
2. Switch to `claude-sync` which creates a dedicated repo just for Claude config

They solve the same problem differently. `claude-sync` is purpose-built for Claude Code and has a smarter `.gitignore`.
</details>

<details>
<summary><strong>What happens if I change settings on two machines without syncing?</strong></summary>

`claude-sync pull` uses git rebase by default. If there's a conflict, it will stash your local changes, pull, and try to re-apply them. If there's a merge conflict, it tells you and you resolve it like any git conflict.
</details>

<details>
<summary><strong>Can multiple people share a sync repo?</strong></summary>

This is designed for personal use (one person, multiple machines). For team config, use a project-level `.claude/settings.json` in your team's repo instead.
</details>

<details>
<summary><strong>How do I stop syncing?</strong></summary>

```bash
rm -rf ~/.claude/.git ~/.claude/.gitignore
```
This removes the git repo from `.claude/` without affecting your config.
</details>

<details>
<summary><strong>Is my conversation history synced?</strong></summary>

No. `history.jsonl` and `projects/` are excluded by default. Conversations stay on the machine where they happened.
</details>

---

## Contributing

Contributions welcome. This is a bash script — keep it simple.

1. Fork this repository
2. Create a feature branch
3. Test on macOS, Linux, and Windows (Git Bash)
4. Open a Pull Request

---

## License

[MIT](LICENSE)
