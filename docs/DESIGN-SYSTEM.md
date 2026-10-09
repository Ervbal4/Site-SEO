# Cime Signature — système de design

Fichier unique : `assets/css/cime.css`. Aucune dépendance, aucune chaîne de build front. Les pages sont générées par `tools/build.py` (voir `tools/README` ci-dessous).

## Concept
« La vue depuis la cime » : fond ivoire, vert forêt, un **filet d'horizon gradué** (trait fin + graduations) comme signe de section (`.eyebrow`), des courbes de niveau en filigrane dans les en-têtes de page, et un visuel d'accueil qui montre les trois piliers comme trois couches qui montent vers l'horizon de la retraite. Aucun chiffre inventé n'apparaît dans les visuels.

## Couleurs (rôles, pas teintes)
| Jeton | Valeur | Rôle |
|---|---|---|
| `--c-forest` / `--deep` | #153D32 | pied de page, carte « Prévoyance » de l'accueil |
| `--c-green` / `--accent` | #235C49 | action principale, liens, états actifs (blanc dessus : 7,8:1) |
| `--c-ivory` / `--bg` | #F7F6F1 | fond, chaleur |
| `--c-white` / `--surface` | #FFFFFF | surfaces de lecture (champs, résultats) |
| `--c-ink` / `--text` | #18231F | texte (14,9:1 sur l'ivoire) |
| `--c-ink-2` / `--text-2` | #5C6862 | texte secondaire. **Ajusté** depuis #69756F (4,44:1, sous AA) vers 5,37:1 |
| `--c-line` / `--line` | #E4E8E2 | filets décoratifs |
| `--c-line-2` / `--line-strong` | #8C9892 | bordures de champs (3:1 minimum, WCAG 1.4.11) |
| `--c-mint` / `--accent-soft` | #E8F1EB | états positifs, fonds d'accent |
| `--viz-1…4` | vert, ambre, ardoise, argile | séries de graphiques (toujours doublées d'une légende) |
Mode sombre : mêmes rôles, valeurs redéfinies (`prefers-color-scheme` et `data-theme`).

## Typographie
- **Interface et chiffres** : Plus Jakarta Sans (variable, 200–800), chiffres tabulaires (`.num`, `.out`, `.keyfig`…).
- **Titres éditoriaux (h1, h2)** : Instrument Serif. Jamais pour les montants, boutons ou libellés.
- Polices **hébergées** (`assets/fonts`, licences OFL jointes), `font-display: swap`, secours calibrés (`size-adjust`).
- Échelle : `--fs-display` 44–68 px, `--fs-h2` 32–44 px, h3 20 px, corps 17 px, petit 15 px, légende 14 px, libellé 13 px (minimum du site).

## Jetons
Espaces `--s-1…9` (base 4 px) · rayons `--r-1/2/3/pill` · ombres `--sh-1/2` (discrètes) · largeurs `--w-page` 1200 px (1320 px dès 1600 px), `--w-text` 66ch, `--w-narrow` 820 px · mouvement `--t-fast/base`, `--ease` · points de rupture (valeurs fixes dans les `@media`) 480 · 640 · 768 · 900 · 1020 · 1280 · 1600.

## Composants et états
| Composant | Classes | États couverts |
|---|---|---|
| Bouton principal / secondaire / lien | `.btn`, `.btn.ghost`, `.more` | normal, survol, focus, actif, désactivé, chargement (`aria-busy`) |
| Champs, sélecteurs, montants avec unité | `input`, `select`, `.unit` | normal, survol, focus, désactivé, erreur (`aria-invalid` + `.field-err`), succès (`.is-ok`) |
| Messages | `.msg.info/.ok/.warn/.err`, `.note` | icône + texte (jamais la couleur seule) |
| Badges et statuts | `.tag`, `.estimate-tag`, `.badge`, `.status` | positif, info, attention, erreur |
| Navigation, tiroir mobile | `nav.main`, `details.menu` | actif (`aria-current`), ouvert, Échap, clic extérieur |
| Panneau latéral / feuille du bas | `dialog.panel` | ouvert, fermeture (bouton, Échap, fond) |
| Listes éditoriales, questions, étapes, bento, bande d'outils, chiffres-clés | `.rows`, `.qlist`, `.steps`, `.bento`, `.tools`, `.keyfig` | survol, focus |
| Simulateur | `.sim`, `.sim-in`, `.out`, `.res-main`, `.res-limits` | étapes, erreur de saisie, état vide, résultat |
| Formulaire en étapes | `fieldset.step`, `.progress`, `.progress-bar` | étape courante, validation par étape |

## Règles
- Un seul accent (vert). Les couleurs sémantiques (succès, attention, erreur, info) ne servent qu'aux messages.
- Pas de style en ligne (exception : valeurs dynamiques `--p` du curseur et couleurs de légende).
- Les graphiques ont une alternative textuelle (`role="img"` + `aria-label`) et une légende.
- Tout contenu financier est présenté comme estimation, avec ses hypothèses et ses limites.
