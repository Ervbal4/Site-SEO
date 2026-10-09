#!/usr/bin/env python3
"""Génère les pages statiques à partir de tools/content/*.html.
Chaque fragment commence par des commentaires: <!--title: ..--> <!--desc: ..--> <!--path: /a/b/--> <!--crumbs: Libellé|/url;..--> <!--type: article|page-->
L'en-tête et le pied de page sont repris de index.html (source unique)."""
import re, json, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://exemple.ch"
idx = (ROOT / "index.html").read_text(encoding="utf-8")
chrome_top = idx[idx.index('<a class="skip"'):idx.index('<main')]
chrome_bot = idx[idx.index('</main>'):]
fonts = "\n".join(re.findall(r'<link rel="preload"[^>]*>', idx))
icon = re.search(r'<link rel="icon"[^>]*>', idx).group(0)

def meta(src, k):
    m = re.search(r'<!--%s:\s*(.*?)-->' % k, src, re.S)
    return m.group(1).strip() if m else ""

def build(f):
    src = f.read_text(encoding="utf-8")
    title, desc, path = meta(src, "title"), meta(src, "desc"), meta(src, "path")
    typ = meta(src, "type") or "page"
    crumbs = [("Accueil", "/")] + [tuple(c.split("|")) for c in meta(src, "crumbs").split(";") if c]
    body = re.sub(r'<!--(title|desc|path|crumbs|type|sujet|index):.*?-->\s*', '', src, flags=re.S)
    url = BASE + path
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', body, re.S).group(1)
    ld = [{"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": BASE + u if u else url}
        for i, (n, u) in enumerate(crumbs + [(re.sub('<.*?>', '', h1), "")])]}]
    if typ == "article":
        ld.append({"@type": "Article", "headline": re.sub('<.*?>', '', h1), "description": desc, "inLanguage": "fr-CH",
                   "mainEntityOfPage": url, "dateModified": "2026-10-09", "author": {"@id": BASE + "/#org"}, "publisher": {"@id": BASE + "/#org"}})
    if typ == "article":
        words = len(re.sub(r'<[^>]+>', ' ', body).split())
        minutes = max(1, round(words / 220))
        body = re.sub(r'(<p class="lead">.*?</p>)', r'\1\n<p class="meta">%d min de lecture</p>' % minutes, body, count=1, flags=re.S)
        sujet = meta(src, "sujet") or "autre"
        if 'class="cta-end"' not in body:
            end = ('<div class="cta-end"><h3>Une question sur votre situation ?</h3><p>Un spécialiste peut examiner votre cas. Gratuit et sans engagement.</p>'
                   '<div class="acts"><a class="btn" href="/rendez-vous/?demande=etude&amp;sujet=%s&amp;source=fin-article" data-cta="fin_etude">Demander une étude comparative gratuite</a>'
                   '<a class="more" href="/rendez-vous/?demande=echange&amp;sujet=%s&amp;source=fin-article" data-cta="fin_echange">Échanger 15 min avec un spécialiste</a></div></div>\n') % (sujet, sujet)
            body = body.replace('<p class="disc">', end + '<p class="disc">', 1)
    if path.startswith("/outils/") and path != "/outils/":
        ld.append({"@type": "WebApplication", "name": re.sub('<.*?>', '', h1), "url": url, "applicationCategory": "FinanceApplication",
                   "operatingSystem": "Web", "inLanguage": "fr-CH", "description": desc,
                   "offers": {"@type": "Offer", "price": "0", "priceCurrency": "CHF"}})
    faq = re.findall(r'<details class="faq"><summary>(.*?)</summary><p>(.*?)</p></details>', body, re.S)
    if faq:
        ld.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": re.sub('<.*?>', '', q),
                   "acceptedAnswer": {"@type": "Answer", "text": re.sub('<.*?>', '', a)}} for q, a in faq]})
    crumb_html = '<p class="crumbs"><a href="/">Accueil</a>' + "".join(f' › <a href="{u}">{n}</a>' for n, u in crumbs[1:]) + f' › {re.sub("<.*?>", "", h1)}</p>'
    body = body.replace("{{CRUMBS}}", crumb_html)
    body = body.replace('<div class="tbl">', '<div class="tbl" tabindex="0" role="region" aria-label="Tableau, défilable horizontalement">')
    # sim.js doit s'exécuter après config.js et lead.js (chargés dans le pied de page) : on le place en dernier.
    extra = ""
    if '/assets/js/sim.js' in body:
        body = re.sub(r'<script src="/assets/js/sim\.js" defer></script>\s*', '', body)
        extra = '<script src="/assets/js/sim.js" defer></script>\n'
    robots = '' if meta(src, "index") != "no" else '<meta name="robots" content="noindex">\n'
    NAV = {"/prevoyance/": ("/prevoyance/", "/services/"), "/fiscalite/": ("/fiscalite/",), "/retraite/": ("/retraite/",),
           "/outils/": ("/outils/",), "/a-propos/": ("/a-propos/",)}
    top = chrome_top
    for href, prefixes in NAV.items():
        if any(path.startswith(pf) for pf in prefixes):
            top = top.replace('<nav class="main" aria-label="Navigation principale">', '<nav class="main" aria-label="Navigation principale">', 1)
            top = re.sub(r'(<nav class="main".*?)<a href="%s">' % re.escape(href), r'\1<a href="%s" aria-current="page">' % href, top, count=1, flags=re.S)
    out = f'''<!DOCTYPE html>
<html lang="fr-CH">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
{robots}<link rel="canonical" href="{url}">
<meta name="theme-color" content="#0b1d33">
<meta property="og:type" content="{'article' if typ=='article' else 'website'}">
<meta property="og:locale" content="fr_CH">
<meta property="og:site_name" content="Cime">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
{icon}
{fonts}
<link rel="stylesheet" href="/assets/css/cime.css">
<script type="application/ld+json">{json.dumps({"@context": "https://schema.org", "@graph": ld}, ensure_ascii=False)}</script>
</head>
<body>
{top}<main id="contenu" tabindex="-1">
{body}
{chrome_bot.replace('</body>', extra + '</body>')}'''
    dest = ROOT / path.strip("/") / "index.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(out, encoding="utf-8")
    return path, meta(src, "index") != "no"

pages = [build(f) for f in sorted((ROOT / "tools/content").glob("*.html"))]
urls = ["/"] + [p for p, ok in pages if ok]
(ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    "".join(f' <url><loc>{BASE}{u}</loc></url>\n' for u in urls) + '</urlset>\n', encoding="utf-8")
print(len(pages), "pages générées")
