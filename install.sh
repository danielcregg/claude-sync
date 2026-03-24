#!/usr/bin/env bash
# claude-sync installer (macOS/Linux) — one-liner installation
# curl -fsSL https://raw.githubusercontent.com/danielcregg/claude-sync/main/install.sh | bash

set -euo pipefail

REPO="danielcregg/claude-sync"
INSTALL_DIR="${HOME}/.local/bin"
SCRIPT_NAME="claude-sync"

echo "[claude-sync] Installing..."

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "[claude-sync] ERROR: Node.js is not installed."
  echo "[claude-sync] Install Node.js first: https://nodejs.org/"
  exit 1
fi

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download the Node.js script
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/claude-sync.mjs" -o "$INSTALL_DIR/$SCRIPT_NAME.mjs"

# Create a launcher script
cat > "$INSTALL_DIR/$SCRIPT_NAME" << 'LAUNCHER'
#!/usr/bin/env bash
exec node "$(dirname "$0")/claude-sync.mjs" "$@"
LAUNCHER
chmod +x "$INSTALL_DIR/$SCRIPT_NAME"

# Check if install dir is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo ""
  echo "[claude-sync] Add to your PATH by adding this to your shell profile:"
  echo ""
  if [[ -f "$HOME/.zshrc" ]]; then
    echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc && source ~/.zshrc"
  else
    echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc && source ~/.bashrc"
  fi
  echo ""
fi

echo "[claude-sync] Installed to $INSTALL_DIR/$SCRIPT_NAME"
echo "[claude-sync] Run 'claude-sync init' to get started."
