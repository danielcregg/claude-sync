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

# Download the Node.js script and verify integrity
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/claude-sync.mjs" -o "$INSTALL_DIR/$SCRIPT_NAME.mjs"
EXPECTED_HASH=$(curl -fsSL "https://raw.githubusercontent.com/$REPO/main/SHA256SUM" 2>/dev/null || true)
if [[ -n "$EXPECTED_HASH" ]]; then
  ACTUAL_HASH=$(shasum -a 256 "$INSTALL_DIR/$SCRIPT_NAME.mjs" 2>/dev/null | cut -d' ' -f1 || sha256sum "$INSTALL_DIR/$SCRIPT_NAME.mjs" 2>/dev/null | cut -d' ' -f1)
  if [[ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]]; then
    echo "[claude-sync] WARNING: Checksum mismatch! Downloaded file may be corrupted."
    echo "[claude-sync] Expected: $EXPECTED_HASH"
    echo "[claude-sync] Actual:   $ACTUAL_HASH"
    rm -f "$INSTALL_DIR/$SCRIPT_NAME.mjs"
    exit 1
  fi
  echo "[claude-sync] Checksum verified."
fi

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
