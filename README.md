<h1 align="center">claude-sync</h1>

<p align="center">
  <strong>Sync your Claude Code settings, skills, and config across machines</strong>
</p>

<p align="center">
  <a href="https://github.com/danielcregg/claude-sync/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Version-2.0.0-green.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/Claude%20Code-blueviolet.svg" alt="Claude Code">
  <img src="https://img.shields.io/badge/Node.js-informational.svg" alt="Node.js">
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

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/danielcregg/claude-sync/main/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/danielcregg/claude-sync/main/install.ps1 | iex
```

**Manual (any platform — recommended if you prefer to audit the code first):**
```bash
git clone https://github.com/danielcregg/claude-sync.git
node claude-sync/claude-sync.mjs version   # verify it works
```

> **Security note:** The one-liner installers (`curl | bash` and `irm | iex`) download and execute code from GitHub. Both scripts verify the download against a SHA256 checksum. If you prefer to review the code before running it, use the manual install method above.

### First Machine (setup)

```bash
claude-sync init
```

This:
1. Creates a **private** GitHub repo (`claude-sync-config`)
2. Writes a smart `.gitignore` that excludes secrets and ephemeral data
3. Commits your settings, skills, agents, commands, and hooks
4. Pushes to GitHub
5. Installs an auto-sync hook (pushes on session end)

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
| `claude-sync init` | First-time setup — creates repo, pushes, installs auto-sync hook |
| `claude-sync init --no-hook` | Setup without auto-sync hook |
| `claude-sync push` | Commit and push changes |
| `claude-sync push -m "msg"` | Push with custom message |
| `claude-sync pull` | Pull latest from GitHub |
| `claude-sync status` | Show changes and sync state |
| `claude-sync clone [user]` | Set up new machine from existing repo (auto-detects GitHub user) |
| `claude-sync diff` / `preview` | Preview what would change before cloning (safe, read-only) |
| `claude-sync backup` | Back up current config before syncing |
| `claude-sync doctor` | Check sync health, detect issues |
| `claude-sync hook`   | Install the auto-sync hook |
| `claude-sync version` | Show version |

### Flags

| Flag | Works With | What It Does |
|------|-----------|-------------|
| `-m, --message` | push | Custom commit message |
| `-q, --quiet` | push, pull | Minimal output |
| `-n, --dry-run` | push, pull | Preview without changes |
| `--no-hook` | init | Skip auto-sync hook |

---

## Auto-Sync (Enabled by Default)

`claude-sync init` automatically installs a `Stop` hook that pushes your config to GitHub whenever a Claude Code session ends. Your settings stay in sync without you having to remember to run `push`.

To skip this during setup: `claude-sync init --no-hook`

To install it later: `claude-sync hook`

The hook adds this to your `settings.json` (with the absolute path to your install):

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "node /home/you/.local/bin/claude-sync.mjs push -q -m auto-sync",
        "timeout": 30
      }]
    }]
  }
}
```

The path is detected automatically at install time — no manual editing needed.

---

## Syncing to an Existing Machine

Already have Claude Code set up on another machine with settings you want to keep? Don't blindly clone — preview first:

```bash
# 1. See what would change
claude-sync diff

# 2. Back up your current config
claude-sync backup

# 3. Clone the remote config
claude-sync clone

# 4. If you lost something, restore from backup
cp ~/.claude-backup-2026-03-24T23-30-00/skills/my-local-skill ~/.claude/skills/
claude-sync push -m "merged local skill"
```

`diff` is completely read-only — it clones the remote repo to a temp directory, compares, and cleans up. Your local config is never touched.

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

Under the hood, `claude-sync` is a single Node.js script that initializes a git repo inside `~/.claude/`, adds a comprehensive `.gitignore`, and pushes to a private GitHub repo. That's it. No magic. No daemons. No cloud services. Just Node.js and git. Works identically on Windows, macOS, and Linux.

---

## Requirements

- **Node.js** — you already have this (Claude Code requires it)
- **git** — you almost certainly have this
- **gh** (GitHub CLI) — [install here](https://cli.github.com/) if you don't have it
- **A GitHub account** — free tier works fine (unlimited private repos)

---

## Compared to Alternatives

| Feature | claude-sync | dotfiles (manual) | tawanorg/claude-sync | FelixIsaac/claude-code-sync |
|---------|:-----------:|:------------------:|:-------------------:|:---------------------------:|
| One-command setup | Yes | No | Yes | Yes |
| PowerShell support | Yes | No | No | No |
| No compiled binary | Yes | Yes | No (Go) | No (Go) |
| No cloud account | Yes | Yes | No (R2/S3/GCS) | Yes |
| No encryption keys | Yes | Yes | No (passphrase) | No (age keypair) |
| Auto-sync hook | Yes | No | Yes | No |
| Smart .gitignore | Yes | Manual | Hardcoded | Hardcoded |
| Doctor/health check | Yes | No | No | Yes |
| Dependencies | Node.js, git, gh | git | npm + Go binary | Go binary |

---

## Compatibility

| Platform | Status |
|----------|--------|
| macOS (bash/zsh) | Fully supported |
| Linux (bash/zsh) | Fully supported |
| Windows (PowerShell) | Fully supported |
| Windows (cmd) | Fully supported |
| Windows (Git Bash / WSL) | Fully supported |

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

Contributions welcome. This is a single-file Node.js script — keep it simple, no npm dependencies.

1. Fork this repository
2. Create a feature branch
3. Test on macOS, Linux, and Windows (PowerShell + Git Bash)
4. Open a Pull Request

---

## License

[MIT](LICENSE)
