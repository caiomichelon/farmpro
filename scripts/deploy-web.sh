#!/usr/bin/env bash
# Publica a versão web do FarmPro no GitHub Pages (branch gh-pages),
# acessível em https://caiomichelon.github.io/farmpro/ — sem Expo Go,
# sem tela de "Log in to Expo", só abrir o link no navegador.
#
# Como funciona:
#   1. Ativa temporariamente experiments.baseUrl=/farmpro no app.json
#      (necessário pra os caminhos dos arquivos funcionarem dentro do
#      subcaminho /farmpro/ do GitHub Pages) e reverte o app.json depois
#      — essa opção NÃO deve ficar no app.json de verdade, senão os
#      builds nativos (EAS Update) também tentariam usar esse prefixo.
#   2. Roda `expo export -p web` pra gerar os arquivos estáticos.
#   3. Publica esses arquivos na branch `gh-pages` do repositório, sem
#      mexer na branch de desenvolvimento (usa um worktree isolado).
#
# Pré-requisito (uma vez só): habilitar o GitHub Pages no repositório —
# Settings → Pages → Source: "Deploy from a branch" → Branch: gh-pages, / (root) → Save.
#
# Uso: ./scripts/deploy-web.sh

set -euo pipefail
cd "$(dirname "$0")/.."

APP_JSON="app.json"
BACKUP="$(mktemp)"
EXPORT_DIR="$(mktemp -d)"
WORKTREE_DIR="$(mktemp -d)"

cleanup() {
  # Sempre restaura o app.json original, mesmo se algo falhar no meio.
  if [ -f "$BACKUP" ]; then
    cp "$BACKUP" "$APP_JSON"
  fi
  git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || true
  rm -rf "$EXPORT_DIR" "$WORKTREE_DIR" "$BACKUP" 2>/dev/null || true
}
trap cleanup EXIT

echo "→ Fazendo backup do app.json..."
cp "$APP_JSON" "$BACKUP"

echo "→ Ativando experiments.baseUrl=/farmpro temporariamente..."
python3 - "$APP_JSON" << 'PYEOF'
import json, sys
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
data["expo"].setdefault("experiments", {})["baseUrl"] = "/farmpro"
with open(path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PYEOF

echo "→ Gerando build web estático..."
npx expo export -p web --output-dir "$EXPORT_DIR"

echo "→ Restaurando app.json original..."
cp "$BACKUP" "$APP_JSON"

echo "→ Preparando branch gh-pages num worktree isolado..."
git fetch origin gh-pages 2>/dev/null || true
rm -rf "$WORKTREE_DIR"
if git show-ref --verify --quiet refs/remotes/origin/gh-pages; then
  git worktree add "$WORKTREE_DIR" gh-pages
else
  git worktree add --orphan -b gh-pages "$WORKTREE_DIR"
fi

find "$WORKTREE_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -r "$EXPORT_DIR"/. "$WORKTREE_DIR"/
cp "$WORKTREE_DIR/index.html" "$WORKTREE_DIR/404.html"
touch "$WORKTREE_DIR/.nojekyll"

cd "$WORKTREE_DIR"
git add -A
if git diff --cached --quiet; then
  echo "→ Nada mudou desde o último deploy web — nada pra publicar."
else
  git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "Deploy web $(date -u +%Y-%m-%dT%H:%M:%SZ)" -q
  git push origin gh-pages
  echo "✔ Publicado. Site em: https://caiomichelon.github.io/farmpro/"
fi
