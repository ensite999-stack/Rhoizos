#!/usr/bin/env bash
set -euo pipefail
if [[ $# != 1 || ! -f "$1/load.php" || ! -d "$1/themes/huraga" ]]; then
  echo 'Usage: bash scripts/install.sh /absolute/path/to/fossbilling (0.7.2 integration target)' >&2
  exit 1
fi
project_root=$(cd "$(dirname "$0")/.." && pwd)
foss_root=$(cd "$1" && pwd)
if [[ -e "$foss_root/modules/Rhoizos" || -e "$foss_root/themes/rhoizos" ]]; then
  echo 'Rhoizos already exists. Back up and apply an explicitly reviewed update instead of overwriting.' >&2
  exit 1
fi
cp -R "$project_root/fossbilling/modules/Rhoizos" "$foss_root/modules/"
cp -R "$project_root/fossbilling/library/Rhoizos" "$foss_root/library/"
cp "$project_root/fossbilling/library/Payment/Adapter/Nowpayments.php" "$foss_root/library/Payment/Adapter/"
mkdir -p "$foss_root/rhoizos-assets"
cp -R "$project_root/public/." "$foss_root/rhoizos-assets/"
# Native invoice / email-verification / password-reset templates remain available.
cp -R "$foss_root/themes/huraga" "$foss_root/themes/rhoizos"
cp "$project_root/fossbilling/themes/rhoizos/html/layout_default.html.twig" "$foss_root/themes/rhoizos/html/"
cp "$project_root/fossbilling/modules/Rhoizos/html_client/mod_rhoizos_index.html.twig" "$foss_root/themes/rhoizos/html/mod_index_index.html.twig"
echo 'Files installed. Enable Rhoizos module, select rhoizos theme, and follow README configuration steps.'
