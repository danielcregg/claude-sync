#!/usr/bin/env node
// claude-sync — Sync Claude Code settings, skills, and config across machines
// https://github.com/danielcregg/claude-sync
// MIT License — Daniel Cregg

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir, tmpdir } from "os";
import { randomUUID } from "crypto";

const VERSION = "2.0.0";
const REPO_NAME = "claude-sync-config";
const GITIGNORE_MARKER = "# managed by claude-sync";

// ─────────────────────────────────────────────
// Cross-platform helpers
// ─────────────────────────────────────────────

const CLAUDE_DIR =
  process.env.CLAUDE_HOME || join(homedir(), ".claude");

const isTTY = process.stdout.isTTY;
const c = {
  red: isTTY ? "\x1b[31m" : "",
  green: isTTY ? "\x1b[32m" : "",
  yellow: isTTY ? "\x1b[33m" : "",
  bold: isTTY ? "\x1b[1m" : "",
  reset: isTTY ? "\x1b[0m" : "",
};

function log(msg) {
  console.log(`${c.green}[claude-sync]${c.reset} ${msg}`);
}
function warn(msg) {
  console.log(`${c.yellow}[claude-sync]${c.reset} ${msg}`);
}
function error(msg) {
  console.error(`${c.red}[claude-sync]${c.reset} ${msg}`);
}
function bold(msg) {
  console.log(`${c.bold}${msg}${c.reset}`);
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: opts.silent ? "pipe" : ["pipe", "pipe", "pipe"],
      ...opts,
    }).trim();
  } catch (e) {
    if (opts.ignoreError) return "";
    throw e;
  }
}

function git(args, opts = {}) {
  return run(`git -C "${CLAUDE_DIR}" ${args}`, opts);
}

// ─────────────────────────────────────────────
// .gitignore content
// ─────────────────────────────────────────────

const GITIGNORE = `# managed by claude-sync
# This file controls what gets synced across machines.
# Files NOT listed here will be synced. Files listed here are excluded.

# ── Credentials & Secrets (NEVER sync) ──
.credentials.json
credentials.json
settings.local.json
client_secret_*.json
*.pem
*.key

# ── Large ephemeral data (machine-specific) ──
projects/
local/
telemetry/
debug/
cache/
.cache/
usage-data/
sessionStorage/
shell-snapshots/
paste-cache/
file-history/
downloads/

# ── Session-specific (not portable) ──
sessions/
ide/
todos/
tasks/
plans/
*.lock

# ── Stats & analytics ──
statsig/
stats-cache.json

# ── Plugin caches (reinstalled automatically) ──
plugins/cache/
plugins/marketplaces/
plugins/.install-manifests/
plugins/install-counts-cache.json
plugins/data/

# ── Conversation history (large, personal) ──
history.jsonl

# ── Backups (may contain secrets) ──
backups/

# ── Temporary files ──
*.log
*.tmp
*.cache

# ── OS files ──
.DS_Store
Thumbs.db
desktop.ini

# ── Git internals in skill subdirectories ──
skills/*/.git/
`;

// ─────────────────────────────────────────────
// Preflight checks
// ─────────────────────────────────────────────

function checkGit() {
  try {
    run("git --version", { silent: true });
  } catch {
    error("git is not installed. Install git first.");
    process.exit(1);
  }
}

function checkGh() {
  try {
    run("gh --version", { silent: true });
  } catch {
    error("GitHub CLI (gh) is not installed.");
    error("Install it: https://cli.github.com/");
    process.exit(1);
  }
  try {
    run("gh auth status", { silent: true });
  } catch {
    error("Not logged into GitHub. Run: gh auth login");
    process.exit(1);
  }
}

function checkClaudeDir() {
  if (!existsSync(CLAUDE_DIR)) {
    error(`Claude directory not found at ${CLAUDE_DIR}`);
    error("Is Claude Code installed?");
    process.exit(1);
  }
}

function isRepo() {
  try {
    git("rev-parse --git-dir", { silent: true });
    return true;
  } catch {
    return false;
  }
}

function getGhUser() {
  const user = run('gh api user --jq ".login"', { silent: true, ignoreError: true });
  if (user && !/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(user)) {
    error(`Invalid GitHub username: ${user}`);
    process.exit(1);
  }
  return user;
}

// ─────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────

function cmdInit(args) {
  const skipHook = args.includes("--no-hook");
  const installHook = !skipHook;

  checkGit();
  checkGh();
  checkClaudeDir();

  if (isRepo()) {
    warn("Already initialized. Use 'claude-sync push' to sync.");
    return;
  }

  const ghUser = getGhUser();
  if (!ghUser) {
    error("Could not detect GitHub username.");
    process.exit(1);
  }
  log(`GitHub user: ${c.bold}${ghUser}${c.reset}`);

  // Create private repo if it doesn't exist
  try {
    run(`gh repo view ${ghUser}/${REPO_NAME}`, { silent: true });
    log(`Repo ${ghUser}/${REPO_NAME} already exists.`);
  } catch {
    log(`Creating private repo: ${ghUser}/${REPO_NAME}`);
    run(
      `gh repo create ${REPO_NAME} --private --description "Claude Code settings, skills, and config — synced by claude-sync"`,
      { ignoreError: true }
    );
  }

  // Initialize git
  log(`Initializing git in ${CLAUDE_DIR}`);
  try { git("init -b main --quiet"); } catch { git("init --quiet"); git("checkout -b main"); }

  // Write .gitignore
  log("Writing .gitignore (smart defaults)");
  writeFileSync(join(CLAUDE_DIR, ".gitignore"), GITIGNORE);

  // Write README
  writeFileSync(
    join(CLAUDE_DIR, "README.md"),
    `# Claude Code Config

This repo is managed by [claude-sync](https://github.com/danielcregg/claude-sync). It contains your Claude Code settings, skills, and configuration — synced across machines via a private GitHub repo.

## What's in here

| File/Dir | Purpose |
|----------|---------|
| \`settings.json\` | Plugins, permissions, model preferences |
| \`skills/\` | Custom skills (invoked with \`/skill-name\`) |
| \`agents/\` | Custom agent definitions |
| \`commands/\` | Custom slash commands |
| \`hooks/\` | Hook definitions |
| \`rules/\` | Custom rules |
| \`CLAUDE.md\` | Global instructions for Claude |
| \`plugins/\` | Plugin list and marketplace config |

## How to use

\`\`\`bash
# Push changes after editing skills or settings
claude-sync push

# Pull latest on another machine
claude-sync pull

# Set up a new machine
claude-sync clone

# Check sync status
claude-sync status
\`\`\`

## Important

- **Credentials are excluded** — \`.credentials.json\` and secrets never leave your machine
- **Conversations are excluded** — \`projects/\` and \`history.jsonl\` stay local
- This repo is **private** — only you can see it

## More info

See [claude-sync](https://github.com/danielcregg/claude-sync) for full documentation.
`
  );

  // Add remote
  try {
    git(`remote add origin https://github.com/${ghUser}/${REPO_NAME}.git`);
  } catch {
    git(
      `remote set-url origin https://github.com/${ghUser}/${REPO_NAME}.git`
    );
  }

  // Initial commit and push
  log("Committing and pushing...");
  git("add -A");
  git(`commit -m "Initial sync via claude-sync v${VERSION}" --quiet`);
  try {
    git("push -u origin main --quiet");
  } catch {
    warn("Remote has existing content — force pushing initial sync.");
    git("push -u origin main --force --quiet");
  }

  if (installHook) {
    cmdInstallHook();
  }

  console.log("");
  log("Sync initialized!");
  bold(`  Repo:   https://github.com/${ghUser}/${REPO_NAME} (private)`);
  bold(`  Config: ${CLAUDE_DIR}`);
  console.log("");
  log("Commands:");
  console.log("  claude-sync push     — push changes");
  console.log("  claude-sync pull     — pull on another machine");
  console.log("  claude-sync clone    — set up a new machine");
  if (skipHook) {
    console.log("");
    log("Auto-sync hook skipped. Run 'claude-sync hook' to install it later.");
  }
}

function cmdClone(args) {
  let ghUser = args[0] || "";

  checkGit();
  checkGh();
  checkClaudeDir();

  // Auto-detect GitHub username if not provided
  if (!ghUser) {
    ghUser = getGhUser();
    if (!ghUser) {
      error("Could not detect GitHub username.");
      error("Usage: claude-sync clone [github-username]");
      process.exit(1);
    }
    log(`Detected GitHub user: ${c.bold}${ghUser}${c.reset}`);
  }

  if (isRepo()) {
    warn("Already initialized. Use 'claude-sync pull' instead.");
    return;
  }

  const repo = `${ghUser}/${REPO_NAME}`;
  try {
    run(`gh repo view ${repo}`, { silent: true });
  } catch {
    error(
      `Repo ${repo} not found. Did you run 'claude-sync init' on your other machine?`
    );
    process.exit(1);
  }

  log(`Cloning config from ${repo}...`);

  try { git("init -b main --quiet"); } catch { git("init --quiet"); git("checkout -b main"); }
  git(`remote add origin https://github.com/${repo}.git`);
  git("fetch origin main --quiet");
  git("reset --hard origin/main --quiet");
  try { git("branch --set-upstream-to=origin/main main"); } catch { /* ok */ }

  console.log("");
  log(`Config synced from ${repo}!`);
  log("Your skills, settings, and config are ready.");
}

function cmdDiff(args) {
  let ghUser = args[0] || "";

  checkGit();
  checkGh();
  checkClaudeDir();

  // Auto-detect GitHub username if not provided
  if (!ghUser) {
    ghUser = getGhUser();
    if (!ghUser) {
      error("Could not detect GitHub username.");
      process.exit(1);
    }
    log(`Detected GitHub user: ${c.bold}${ghUser}${c.reset}`);
  }

  const repo = `${ghUser}/${REPO_NAME}`;
  try {
    run(`gh repo view ${repo}`, { silent: true });
  } catch {
    error(`Repo ${repo} not found. Did you run 'claude-sync init' on your other machine?`);
    process.exit(1);
  }

  // Clone to temp directory for comparison
  const tmpDir = join(tmpdir(), `claude-sync-diff-${randomUUID()}`);
  log("Fetching remote config for comparison...");
  run(`git clone --quiet https://github.com/${repo}.git "${tmpDir}"`);

  // Compare key files
  const filesToCompare = [
    "settings.json",
    ".gitignore",
  ];

  let differences = 0;

  // Compare individual files
  for (const file of filesToCompare) {
    const localPath = join(CLAUDE_DIR, file);
    const remotePath = join(tmpDir, file);
    const localExists = existsSync(localPath);
    const remoteExists = existsSync(remotePath);

    if (!localExists && remoteExists) {
      log(`${c.green}+ ${file}${c.reset} (new — will be added)`);
      differences++;
    } else if (localExists && !remoteExists) {
      log(`${c.yellow}~ ${file}${c.reset} (local only — will be kept)`);
    } else if (localExists && remoteExists) {
      const localContent = readFileSync(localPath, "utf8");
      const remoteContent = readFileSync(remotePath, "utf8");
      if (localContent !== remoteContent) {
        log(`${c.yellow}~ ${file}${c.reset} (differs — will be overwritten)`);
        // Show a summary of what's different
        try {
          const diff = run(`git diff --no-index --stat "${localPath}" "${remotePath}"`, { ignoreError: true });
          if (diff) console.log("  " + diff.split("\n").pop());
        } catch { /* ok */ }
        differences++;
      }
    }
  }

  // Compare skills directories
  const localSkillsDir = join(CLAUDE_DIR, "skills");
  const remoteSkillsDir = join(tmpDir, "skills");

  if (existsSync(remoteSkillsDir)) {
    // Find remote skills
    const remoteSkills = new Set();
    try {
      const entries = run(`git -C "${tmpDir}" ls-files`, { ignoreError: true }).split("\n").filter(Boolean);
      for (const entry of entries) {
        if (entry.startsWith("skills/")) {
          const skillName = entry.split("/")[1];
          if (skillName) remoteSkills.add(skillName);
        }
      }
    } catch { /* ok */ }

    // Find local skills
    const localSkills = new Set();
    if (existsSync(localSkillsDir)) {
      try {
        const dirs = run(`ls "${localSkillsDir}"`, { ignoreError: true }).split("\n").filter(Boolean);
        for (const d of dirs) localSkills.add(d);
      } catch { /* ok */ }
    }

    // Skills only in remote (will be added)
    for (const skill of remoteSkills) {
      if (!localSkills.has(skill)) {
        log(`${c.green}+ skills/${skill}/${c.reset} (new skill — will be added)`);
        differences++;
      }
    }

    // Skills in both (may differ)
    for (const skill of remoteSkills) {
      if (localSkills.has(skill)) {
        const localSkill = join(localSkillsDir, skill, "SKILL.md");
        const remoteSkill = join(remoteSkillsDir, skill, "SKILL.md");
        if (existsSync(localSkill) && existsSync(remoteSkill)) {
          const l = readFileSync(localSkill, "utf8");
          const r = readFileSync(remoteSkill, "utf8");
          if (l !== r) {
            log(`${c.yellow}~ skills/${skill}/${c.reset} (differs — will be overwritten)`);
            differences++;
          }
        }
      }
    }

    // Skills only local (will be kept — not in remote gitignore)
    for (const skill of localSkills) {
      if (!remoteSkills.has(skill)) {
        log(`  skills/${skill}/ (local only — will be kept)`);
      }
    }
  }

  // Compare commands
  const localCmdsDir = join(CLAUDE_DIR, "commands");
  const remoteCmdsDir = join(tmpDir, "commands");
  if (existsSync(remoteCmdsDir)) {
    try {
      const remoteCmds = run(`ls "${remoteCmdsDir}"`, { ignoreError: true }).split("\n").filter(Boolean);
      for (const cmd of remoteCmds) {
        const localCmd = join(localCmdsDir, cmd);
        if (!existsSync(localCmd)) {
          log(`${c.green}+ commands/${cmd}${c.reset} (new command — will be added)`);
          differences++;
        }
      }
    } catch { /* ok */ }
  }

  // Cleanup
  try { run(`rm -rf "${tmpDir}"`, { ignoreError: true }); } catch { /* ok */ }

  console.log("");
  if (differences === 0) {
    log("No differences found. Your local config matches the remote.");
  } else {
    log(`${differences} difference(s) found.`);
    console.log("");
    log("To sync: claude-sync clone");
    log("To back up first: claude-sync backup");
    log("To back up then sync: claude-sync backup && claude-sync clone");
  }
}

function cmdBackup() {
  checkClaudeDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupDir = `${CLAUDE_DIR}-backup-${timestamp}`;

  log(`Backing up ${CLAUDE_DIR} to ${backupDir}...`);

  // Copy the key files, not the entire directory (skip huge dirs like projects/, local/)
  const toCopy = [
    "settings.json",
    "settings.local.json",
    "keybindings.json",
    "CLAUDE.md",
    "statusline-command.sh",
    ".gitignore",
  ];

  const dirsToCopy = ["skills", "commands", "agents", "hooks", "rules"];

  run(`mkdir -p "${backupDir}"`);

  for (const file of toCopy) {
    const src = join(CLAUDE_DIR, file);
    if (existsSync(src)) {
      run(`cp "${src}" "${backupDir}/"`, { ignoreError: true });
    }
  }

  for (const dir of dirsToCopy) {
    const src = join(CLAUDE_DIR, dir);
    if (existsSync(src)) {
      run(`cp -r "${src}" "${backupDir}/"`, { ignoreError: true });
    }
  }

  log(`Backup complete: ${backupDir}`);
  log("To restore: cp -r " + backupDir + "/* ~/.claude/");
}

function cmdPush(args) {
  let message = "";
  let quiet = false;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "-m" || args[i] === "--message") && args[i + 1]) {
      message = args[++i];
    } else if (args[i] === "-q" || args[i] === "--quiet") {
      quiet = true;
    } else if (args[i] === "-n" || args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  checkClaudeDir();
  if (!isRepo()) {
    error("Not initialized. Run 'claude-sync init' first.");
    process.exit(1);
  }

  // Check for changes
  git("add -A", { ignoreError: true });
  try {
    git("diff --cached --quiet", { silent: true });
    if (!quiet) log("Nothing to sync — already up to date.");
    return;
  } catch {
    // there are changes — continue
  }

  if (!quiet) {
    log("Changes to sync:");
    console.log(git("diff --cached --stat"));
    console.log("");
  }

  if (dryRun) {
    log("(dry run — no changes made)");
    return;
  }

  const ts = new Date().toISOString().replace("T", " ").slice(0, 16);
  message = message || `sync: ${ts}`;
  // Write commit message to a temp file to avoid all shell injection issues.
  // Uses OS temp dir with random name to prevent race conditions.
  const tmpFile = join(tmpdir(), `.claude-sync-commit-${randomUUID()}.tmp`);
  writeFileSync(tmpFile, message);
  try {
    git(`commit --file "${tmpFile}" --quiet`);
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ok */ }
  }
  git("push --quiet");
  if (!quiet) log("Pushed to GitHub.");
}

function cmdPull(args) {
  let quiet = false;
  let dryRun = false;

  for (const arg of args) {
    if (arg === "-q" || arg === "--quiet") quiet = true;
    if (arg === "-n" || arg === "--dry-run") dryRun = true;
  }

  checkClaudeDir();
  if (!isRepo()) {
    error(
      "Not initialized. Run 'claude-sync init' or 'claude-sync clone' first."
    );
    process.exit(1);
  }

  if (dryRun) {
    git("fetch origin main --quiet");
    log("Changes available:");
    console.log(git("diff HEAD..origin/main --stat", { ignoreError: true }));
    log("(dry run — no changes applied)");
    return;
  }

  // Stash local changes, pull, pop
  let hadChanges = false;
  git("add -A", { ignoreError: true });
  try {
    git("diff --cached --quiet", { silent: true });
  } catch {
    hadChanges = true;
    git("stash --quiet");
  }

  try {
    git("pull --rebase origin main --quiet");
  } catch {
    git("pull origin main --quiet", { ignoreError: true });
  }

  if (hadChanges) {
    try {
      git("stash pop --quiet");
    } catch {
      warn(`Merge conflict — resolve manually in ${CLAUDE_DIR}`);
      warn("Your local changes are stashed. Run 'git stash list' to see them, 'git stash pop' to re-apply.");
    }
  }

  if (!quiet) log("Pulled latest config.");
}

function cmdStatus() {
  checkClaudeDir();
  if (!isRepo()) {
    error("Not initialized. Run 'claude-sync init' first.");
    process.exit(1);
  }

  // Use git status (read-only) instead of git add -A which modifies the index
  const statusOutput = git("status --porcelain", { ignoreError: true });
  if (!statusOutput) {
    log("Clean — no changes since last sync.");
  } else {
    log("Changes since last sync:");
    console.log(statusOutput);
  }

  console.log("");
  const lastSync =
    git("log -1 --format=%ar", { ignoreError: true }) || "never";
  log(`Last sync: ${lastSync}`);

  const remote = git("remote get-url origin", { ignoreError: true });
  if (remote) {
    git("fetch origin main --quiet", { ignoreError: true });
    const ahead = git("rev-list --count origin/main..HEAD", { ignoreError: true });
    const behind = git("rev-list --count HEAD..origin/main", { ignoreError: true });
    if (ahead && ahead !== "0") log(`Ahead of remote by ${ahead} commit(s) — run 'claude-sync push'`);
    if (behind && behind !== "0") log(`Behind remote by ${behind} commit(s) — run 'claude-sync pull'`);
    if (ahead === "0" && behind === "0") log("In sync with remote.");
  } else {
    warn("No remote configured.");
  }
}

function cmdDoctor() {
  checkClaudeDir();
  let issues = 0;

  bold("claude-sync doctor");
  console.log("");

  // Check git
  try {
    const gitVer = run("git --version", { silent: true });
    log(`git: ${gitVer}`);
  } catch {
    error("git: NOT FOUND");
    issues++;
  }

  // Check gh
  try {
    const ghUser = getGhUser() || "NOT LOGGED IN";
    log(`gh: logged in as ${ghUser}`);
  } catch {
    error("gh: NOT FOUND");
    issues++;
  }

  // Check repo
  if (isRepo()) {
    const remote =
      git("remote get-url origin", { ignoreError: true }) || "none";
    log(`repo: ${remote}`);
  } else {
    warn("repo: not initialized");
    issues++;
  }

  // Check .gitignore
  const gitignorePath = join(CLAUDE_DIR, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf8");
    if (content.includes(GITIGNORE_MARKER)) {
      log(".gitignore: managed by claude-sync");
    } else {
      warn(".gitignore: exists but not managed by claude-sync");
      issues++;
    }
  } else {
    warn(".gitignore: missing");
    issues++;
  }

  // Check credentials not tracked
  if (isRepo()) {
    try {
      git("ls-files --error-unmatch .credentials.json", { silent: true });
      error("SECURITY: .credentials.json is tracked by git!");
      error(`Run: git -C "${CLAUDE_DIR}" rm --cached .credentials.json`);
      issues++;
    } catch {
      log("credentials: safely excluded");
    }

    const tracked = git("ls-files", { ignoreError: true })
      .split("\n")
      .filter(Boolean).length;
    log(`tracked files: ${tracked}`);
  }

  console.log("");
  if (issues === 0) {
    log("No issues found.");
  } else {
    warn(`${issues} issue(s) found.`);
  }
}

function cmdInstallHook() {
  checkClaudeDir();
  const settingsPath = join(CLAUDE_DIR, "settings.json");

  if (!existsSync(settingsPath)) {
    warn("settings.json not found — skipping hook installation.");
    return;
  }

  const content = readFileSync(settingsPath, "utf8");

  try {
    const settings = JSON.parse(content);

    // Check if a claude-sync Stop hook already exists by parsing JSON structure
    const hasHook = settings.hooks?.Stop?.some((entry) =>
      entry.hooks?.some((h) => h.command?.includes("claude-sync") && h.command?.includes("push"))
    );
    if (hasHook) {
      log("Auto-sync hook already installed.");
      return;
    }

    log("Installing auto-sync hook (pushes on session end)...");

    // Detect where this script is running from — works regardless of install location.
    // Use forward slashes for Claude Code's bash shell (even on Windows).
    const scriptPath = process.argv[1].replace(/\\/g, "/");
    const hookCommand = `node "${scriptPath}" push -q -m auto-sync`;

    // Create the Stop hook
    const syncHook = {
      hooks: [{
        type: "command",
        command: hookCommand,
        timeout: 30,
      }],
    };

    // Merge with existing hooks
    if (!settings.hooks) settings.hooks = {};
    if (!settings.hooks.Stop) settings.hooks.Stop = [];
    settings.hooks.Stop.push(syncHook);

    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    log("Auto-sync hook installed — settings will push on session end.");
  } catch (e) {
    const fallbackPath = process.argv[1].replace(/\\/g, "/");
    warn("Could not auto-install hook. Add it manually to settings.json:");
    console.log("");
    console.log(`"hooks": {
  "Stop": [{
    "hooks": [{
      "type": "command",
      "command": "node \\"${fallbackPath}\\" push -q -m auto-sync",
      "timeout": 10
    }]
  }]
}`);
  }
}

function showHelp() {
  console.log(`
${c.bold}claude-sync${c.reset} v${VERSION} — Sync Claude Code config across machines

${c.bold}USAGE${c.reset}
  claude-sync <command> [options]

${c.bold}COMMANDS${c.reset}
  init              Set up sync (creates repo, pushes, installs auto-sync hook)
  push              Commit and push changes to GitHub
  pull              Pull latest config from GitHub
  status            Show what has changed since last sync
  clone [user]      Set up a new machine from an existing sync repo
  diff [user]       Preview what would change before cloning
  backup            Back up current config before syncing
  doctor            Check sync health and fix common issues
  version           Show version

${c.bold}OPTIONS${c.reset}
  -m, --message MSG Custom commit message (for push)
  -q, --quiet       Minimal output
  -n, --dry-run     Show what would happen without doing it
  --no-hook         Skip auto-sync hook installation (for init)
  -h, --help        Show this help

${c.bold}EXAMPLES${c.reset}
  claude-sync init                    # First-time setup (includes auto-sync hook)
  claude-sync push                    # Sync changes to GitHub
  claude-sync push -m "added skill"   # Push with custom message
  claude-sync pull                    # Pull on another machine
  claude-sync diff                     # Preview what would change before cloning
  claude-sync backup                   # Back up current config
  claude-sync backup && claude-sync clone  # Safe sync on existing machine
  claude-sync clone                    # New machine setup (auto-detects user)
  claude-sync status                  # Check what changed

${c.bold}AUTO-SYNC${c.reset}
  Auto-sync hook is installed by default with init.
  claude-sync init --no-hook          # Skip auto-sync hook
`);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case "init":
    cmdInit(args);
    break;
  case "push":
    cmdPush(args);
    break;
  case "pull":
    cmdPull(args);
    break;
  case "status":
    cmdStatus(args);
    break;
  case "clone":
    cmdClone(args);
    break;
  case "diff":
  case "preview":
    cmdDiff(args);
    break;
  case "backup":
    cmdBackup();
    break;
  case "doctor":
    cmdDoctor(args);
    break;
  case "hook":
    cmdInstallHook(args);
    break;
  case "version":
    console.log(`claude-sync v${VERSION}`);
    break;
  case "-h":
  case "--help":
  case "help":
  case undefined:
    showHelp();
    break;
  default:
    error(`Unknown command: ${cmd}`);
    showHelp();
    process.exit(1);
}
