# Tests

Prérequis : Node, Playwright (Chromium) et `axe-core` (`npm pack axe-core`, puis passer son `axe.min.js` via `AXE=`). `tests/axe.min.js` est fourni.

    NODE_PATH=$(npm root -g) CHROMIUM=/chemin/chromium AXE=tests/axe.min.js tests/run-all.sh

| Script | Vérifie |
|---|---|
| `compare-golden.js` | **non-régression des formules** : les 26 cas de `golden-simulators.json` (capturés avant la refonte, entrées dans `inputs.json`) doivent donner les mêmes valeurs clés et afficher les mêmes nombres |
| `pages.js` | toutes les pages du sitemap : titre, description, canonical, H1 unique, JSON-LD valide, lien d'évitement, liens internes, aucune erreur ni requête tierce, polices chargées, aucun téléphone, aucun débordement de 320 à 1600 px |
| `a11y.js` | axe-core (WCAG 2.2 AA) en clair et sombre, mobile et bureau |
| `forms.js` | rendez-vous en 2 étapes, validation, champ Nom dans les données envoyées, champ piège, échec d'envoi, demande d'étude, estimation express, tiroir mobile |
| `sims.js` | saisies en CHF, erreurs, étapes, résultats, panneau de méthode, mobile 320 px |

Régénérer les pages avant de tester : `python3 tools/build.py`.
