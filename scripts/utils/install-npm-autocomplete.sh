#!/usr/bin/env bash

set -e

TARGET_DIR="$HOME/.config/npm-autocomplete"
TARGET_FILE="$TARGET_DIR/npm-autocomplete.sh"
BASHRC="$HOME/.bashrc"

echo "📦 Installing npm script autocomplete..."

# Create directory
mkdir -p "$TARGET_DIR"

# Write autocomplete script
cat > "$TARGET_FILE" << 'EOF'
# --- npm script autocomplete ---
_npm_scripts_complete() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  local pkg_json

  # Find nearest package.json (current dir or parents)
  pkg_json=$(node -e "
    const fs=require('fs');
    const path=require('path');
    let dir=process.cwd();
    while(true){
      const f=path.join(dir,'package.json');
      if(fs.existsSync(f)){ console.log(f); break; }
      const parent=path.dirname(dir);
      if(parent===dir) break;
      dir=parent;
    }
  ")

  # If no package.json found, no autocomplete
  if [[ -z "$pkg_json" ]]; then
    COMPREPLY=()
    return
  fi

  local scripts=$(node -e "
    try {
      const pkg=require('$pkg_json');
      console.log(Object.keys(pkg.scripts || {}).join(' '));
    } catch {}
  ")

  COMPREPLY=( $(compgen -W "${scripts}" -- "$cur") )
}

# Attach to npm run
complete -F _npm_scripts_complete npm
EOF

echo "✔ Autocomplete script installed at: $TARGET_FILE"

# Add to .bashrc if not already present
if ! grep -q "npm-autocomplete.sh" "$BASHRC"; then
  echo "" >> "$BASHRC"
  echo "# Enable npm script autocomplete" >> "$BASHRC"
  echo "source \"$TARGET_FILE\"" >> "$BASHRC"
  echo "✔ Added to ~/.bashrc"
else
  echo "ℹ Entry already exists in ~/.bashrc"
fi

echo "🎉 Installation complete!"
echo "➡ Reload your shell with:  source ~/.bashrc"
