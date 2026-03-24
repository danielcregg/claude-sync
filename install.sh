#!/usr/bin/env bash
# claude-sync installer — one-liner installation
# curl -fsSL https://raw.githubusercontent.com/danielcregg/claude-sync/master/install.sh | bash

set -euo pipefail

REPO="danielcregg/claude-sync"
INSTALL_DIR="${HOME}/.local/bin"
SCRIPT_NAME="claude-sync"

echo "[claude-sync] Installing..."

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download the script
curl -fsSL "https://raw.githubusercontent.com/$REPO/master/claude-sync" -o "$INSTALL_DIR/$SCRIPT_NAME"
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
