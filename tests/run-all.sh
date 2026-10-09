#!/usr/bin/env bash
# Lance un serveur local puis toutes les vérifications. Usage : tests/run-all.sh  (variables : CHROMIUM, AXE, NODE_PATH)
set -u
cd "$(dirname "$0")/.."
PORT=${PORT:-8099}; python3 -m http.server "$PORT" >/dev/null 2>&1 & SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT; sleep 1
export BASE="http://localhost:$PORT"; export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
rc=0
python3 -I tools/build.py && git diff --quiet -- . ':!tests' || echo "(les pages générées diffèrent du dépôt : relancer la génération et valider)"
for t in compare-golden pages a11y forms sims; do echo; echo "=== $t"; node tests/$t.js "$BASE" || rc=1; done
exit $rc
