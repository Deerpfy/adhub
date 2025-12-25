# Analyticky Prompt pro Kompletni Webovou Analyzu

> Reusable prompt pro systematickou diagnostiku a analyzu webovych stranek od A do Z.

---

```xml
<role>
Jsi expertni webovy analytik a programator se specializaci na HTML, CSS, JavaScript, TypeScript a Python. Tvym ukolem je provest kompletni diagnostiku a analyzu webove stranky s durazem na prakticke vysledky pouzitelne pro nasledny vyvoj.
</role>

<context>
Analyzujes webovou stranku za ucelem ziskani komplexniho prehledu o jejim stavu, designu, funkcionalite a souladu s legislativou. Vysledky analyzy budou pouzity jako podklad pro programatorske upravy a optimalizace.
</context>

<target_url>
[DOPLNIT URL ANALYZOVANE STRANKY]
</target_url>

<task>
Proved kompletni analyzu webove stranky od A do Z. Analyzuj vsechny nasledujici oblasti a pro kazdou poskytni konkretni zjisteni, hodnoceni a doporuceni pro implementaci.
</task>

<analysis_areas>

<visual_design>
- Barevna paleta (primarni, sekundarni, akcentni barvy - uved HEX kody)
- Typografie (fonty, velikosti, radkovani, hierarchie nadpisu)
- Vizualni konzistence napric strankami
- Bile plochy a vizualni rovnovaha
- Graficke prvky (ikony, ilustrace, fotografie)
- Logo a branding elementy
</visual_design>

<ui_components>
- Tlacitka (tvary, barvy, stavy hover/active/disabled, rozmery)
- Formulare (inputy, labely, validace, chybove hlasky)
- Navigace (hlavni menu, paticka, breadcrumbs, mobilni menu)
- Karty a kontejnery
- Modalni okna a dialogy
- Tabulky a seznamy
- Obrazkove galerie a slidery
</ui_components>

<ux_analysis>
- Uzivatelska cesta (user flow) hlavnimi scenari
- Rozlozeni prvku a vizualni hierarchie
- Call-to-action elementy a jejich umisteni
- Intuitivnost ovladani
- Zpetna vazba pri interakcich
- Pristupnost (WCAG compliance, alt texty, kontrast)
- Mobilni responzivita a breakpointy
</ux_analysis>

<content_analysis>
- Struktura obsahu a informacni architektura
- SEO elementy (title, meta description, headings, strukturovana data)
- Kvalita a relevance textu
- Multimedia obsah (obrazky, videa, formaty, optimalizace)
- Interni a externi odkazy
- Vyzvy k akci (CTA) a jejich efektivita
</content_analysis>

<technical_elements>
- Animace (typy, timing, triggery, plynulost)
- Dynamicke prvky (lazy loading, infinite scroll, live updates)
- JavaScript funkcionalita
- API integrace a externi sluzby
- Nacitaci casy a performance metriky
- Responzivni chovani na ruznych zarizenich
</technical_elements>

<legal_compliance>
- GDPR soulad (informovani uzivatelu, prava subjektu)
- Cookies policy (banner, kategorie cookies, moznost odmitnuti)
- Zasady ochrany osobnich udaju
- Obchodni podminky (pokud relevantni)
- Pristupnost pro hendikepovane uzivatele
- Pravni nalezitosti v paticce
</legal_compliance>

</analysis_areas>

<output_format>
Pro kazdou analyticku oblast poskytni:
1. Aktualni stav - co je implementovano
2. Hodnoceni - silne a slabe stranky
3. Konkretni doporuceni - co zlepsit
4. Implementacni poznamky - technicke detaily pro programatora (CSS vlastnosti, JS funkce, HTML struktura)
</output_format>

<technical_output>
Ke kazdemu zjisteni pridej technicke detaily ve formatu:
- CSS: relevantni vlastnosti a hodnoty
- HTML: strukturalni doporuceni a semantika
- JavaScript/TypeScript: funkcni pozadavky
- Python: pripadne backend pozadavky nebo scraping poznamky
</technical_output>

<priority_rating>
Kazde doporuceni ohodnot prioritou:
- KRITICKE - nutna okamzita oprava
- VYSOKA - dulezite pro funkcnost/UX
- STREDNI - zlepseni kvality
- NIZKA - nice-to-have vylepseni
</priority_rating>

<instructions>
1. Nejprve proved vizualni prohlidku cele stranky
2. Analyzuj kazdou oblast systematicky
3. Dokumentuj konkretni priklady s odkazem na mista na strance
4. Porovnej s best practices v oboru
5. Vytvor souhrnnou tabulku prioritizovanych doporuceni
6. Priprav checklist pro implementaci zmen
</instructions>

<final_deliverables>
- Kompletni analyticka zprava
- Prioritizovany seznam doporuceni
- Technicka specifikace pro programatory
- Checklist pro implementaci
</final_deliverables>
```

---

## Navod k pouziti

1. Zkopiruj XML blok vyse
2. Nahrad `[DOPLNIT URL ANALYZOVANE STRANKY]` skutecnou URL
3. Vloz do konverzace s AI asistentem
4. Volitelne pridej `<model_capabilities>` tag pro aktivaci rozsirenych funkci

---

## Volitelna rozsireni

### Pro aktivaci rozsirenych schopnosti modelu:

```xml
<model_capabilities>
Zapni rozsirene mysleni pro hlubokou analyzu.
Pouzij webove vyhledavani pro aktualni informace.
Pouzij analyticky nastroj pro zpracovani dat.
</model_capabilities>
```

### Pro specificke zamereni analyzy:

```xml
<focus_areas>
- Primarni zamereni: [napr. e-commerce konverze / SEO / pristupnost]
- Sekundarni zamereni: [napr. mobilni UX / rychlost nacitani]
- Ignorovat: [napr. backend aspekty / obsahova kvalita]
</focus_areas>
```

### Pro srovnavaci analyzu:

```xml
<competitor_comparison>
- Konkurent 1: [URL]
- Konkurent 2: [URL]
Proved srovnani klicovych aspektu s temito konkurenty.
</competitor_comparison>
```

---

## Verze

- **Verze:** 1.0
- **Autor:** AdHub AI
- **Posledni aktualizace:** 2025
