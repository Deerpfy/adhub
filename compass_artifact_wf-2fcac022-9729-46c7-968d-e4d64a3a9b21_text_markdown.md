# Kompletní průvodce open-source nástroji pro PDF vyhledávání

**Pro platformu AdHub existuje optimální kombinace nástrojů:** PyMuPDF pro extrakci textu z PDF, Meilisearch nebo Typesense jako fulltextový vyhledávač, a Qdrant pro budoucí sémantické vyhledávání. Alternativně lze nasadit hotové řešení Paperless-ngx s rozšířením o vektorovou databázi. Výběr závisí na požadované míře kontroly, škálovatelnosti a rychlosti nasazení.

Tato analýza pokrývá **25+ open-source nástrojů** rozdělených do čtyř kategorií: kompletní vyhledávací enginy, PDF parsery, JavaScript knihovny a kombinovaná řešení. Každý nástroj je hodnocen z pohledu podpory češtiny, výkonu, snadnosti integrace a možnosti rozšíření o sémantické vyhledávání.

---

## Kompletní vyhledávací enginy pro produkční nasazení

Moderní vyhledávací enginy jako Meilisearch a Typesense přinášejí enterprise-grade funkce bez složitosti tradičních řešení. Oba jsou napsané v kompilovaných jazycích (Rust, C++), nabízejí sub-50ms latenci a podporují hybridní vyhledávání kombinující klíčová slova s vektorovým podobnostním vyhledáváním.

### Meilisearch — nejjednodušší start

| Atribut | Hodnota |
|---------|---------|
| GitHub | github.com/meilisearch/meilisearch |
| Stars | **54 800+** |
| Licence | MIT (Community), Enterprise pro pokročilé funkce |
| Poslední verze | v1.28.2 (prosinec 2025) |
| Jazyk | Rust |

**Hlavní vlastnosti:** Meilisearch vyniká extrémně snadným nasazením — jediný binární soubor nebo Docker kontejner vystačí na plnohodnotný vyhledávač. Podpora **typo tolerance**, facetového filtrování, geosearche a synonym je zahrnuta out-of-the-box. Hybridní vyhledávání kombinuje BM25 fulltextové vyhledávání s vektorovou podobností pomocí vestavěných embedding modelů (S-BERT, E-5) nebo externích API (OpenAI, Cohere).

**Podpora češtiny:** Meilisearch používá vlastní tokenizer Charabia s optimalizací pro latinku. Diakritika je normalizována (např. "č" matchuje "c"), ale **nativní český stemmer chybí**. Pro lepší výsledky v češtině doporučuji využít multilingual embedding modely při sémantickém vyhledávání.

**Indexace PDF:** Meilisearch sám PDF neparseuje — vyžaduje externí extrakci textu (Apache Tika, PyMuPDF) a následné indexování JSON dokumentů.

```python
import meilisearch

client = meilisearch.Client('http://localhost:7700', 'masterKey')
client.index('documents').add_documents([
    {'id': 1, 'title': 'Smlouva', 'content': 'Extrahovaný text z PDF...'}
])
results = client.index('documents').search('smlouva')
```

**Implementační náročnost:** Nízká. Docker deployment trvá minuty, SDK existují pro JavaScript, Python i PHP.

---

### Typesense — nejlepší podpora češtiny

| Atribut | Hodnota |
|---------|---------|
| GitHub | github.com/typesense/typesense |
| Stars | **24 800+** |
| Licence | GPL-3.0 |
| Poslední verze | v29.0 (červen 2025) |
| Jazyk | C++ |

Typesense nabízí **nativní podporu českého stemmingu** přes Snowball algoritmus — stačí nastavit `"locale": "cs"` při definici schématu. Konverzační RAG vyhledávání, JOINy mezi kolekcemi a Raft-based clustering pro vysokou dostupnost patří mezi unikátní funkce.

**Výkon:** Benchmarky ukazují **104 souběžných dotazů/sec** na 4 vCPU pro dataset 2,2M dokumentů. Prázdná instance spotřebuje pouze ~30MB RAM, 1M krátkých dokumentů ~165MB.

```python
client.collections.create({
    "name": "dokumenty",
    "fields": [
        {"name": "nazev", "type": "string"},
        {"name": "obsah", "type": "string", "locale": "cs", "stem": True}
    ]
})
```

---

### Manticore Search — SQL interface s plnou češtinou

| Atribut | Hodnota |
|---------|---------|
| GitHub | github.com/manticoresoftware/manticoresearch |
| Stars | **11 500+** |
| Licence | GPL-3.0+ |
| Poslední verze | 14.1.0 (listopad 2025) |

Manticore Search je fork původního Sphinx Search s **nejlepší podporou češtiny** mezi testovanými nástroji. Využívá libstemmer pro morfologii, podporuje stopwords, wordforms i lemmatizaci s českými slovníky. Interface je SQL kompatibilní s MySQL protokolem.

**Výkon:** Benchmarky ukazují **182× rychlejší** vyhledávání než MySQL pro malá data a **29× rychlejší** než Elasticsearch pro log analytiku.

```sql
CREATE TABLE dokumenty (
    nazev TEXT,
    obsah TEXT
) morphology='libstemmer_cz' stopwords='cs';

INSERT INTO dokumenty (nazev, obsah) VALUES ('Faktura', 'Obsah faktury...');
SELECT * FROM dokumenty WHERE MATCH('faktura');
```

---

### OpenSearch — jediný s nativní PDF podporou

| Atribut | Hodnota |
|---------|---------|
| GitHub | github.com/opensearch-project/OpenSearch |
| Stars | **12 000+** |
| Licence | Apache 2.0 |
| Technologie | Apache Lucene (Java) |

OpenSearch jako jediný z testovaných enginů podporuje **přímou indexaci PDF** přes ingest-attachment plugin (interně Apache Tika). PDF se zakóduje do Base64, pošle přes API a text je automaticky extrahován a indexován.

**Nevýhoda:** Vyšší resource requirements (~1GB+ RAM pro prázdnou instanci) a komplexnější konfigurace. Vhodné pro enterprise prostředí s existující Java infrastrukturou.

```python
# Index PDF přímo
with open('dokument.pdf', 'rb') as f:
    pdf_base64 = base64.b64encode(f.read()).decode()

client.index(index='dokumenty', pipeline='attachment', body={
    'title': 'Moje PDF',
    'data': pdf_base64
})
```

---

## PDF parsery a extraktory textu

Bez ohledu na zvolený vyhledávací engine potřebujete nejprve extrahovat text z PDF souborů. Kvalita extrakce přímo ovlivňuje kvalitu vyhledávání.

### PyMuPDF — nejrychlejší a nejkvalitnější Python knihovna

| Atribut | Hodnota |
|---------|---------|
| GitHub | github.com/pymupdf/PyMuPDF |
| Stars | **8 500+** |
| Licence | AGPL-3.0 (open-source), komerční licence dostupná |
| Údržba | Artifex Software (profesionální) |

PyMuPDF (import jako `pymupdf` nebo `fitz`) je **50–60× rychlejší než pdfminer.six** a dosahuje nejvyšších skóre F1 a BLEU-4 v benchmarcích extrakce textu. Podporuje layout-preserving extrakci, detekci tabulek, obrázků a integraci s Tesseract OCR pro naskenované dokumenty.

```python
import pymupdf

doc = pymupdf.open("dokument.pdf")
for page in doc:
    text = page.get_text()  # UTF-8 text
    blocks = page.get_text("blocks")  # S koordináty
```

**Výhody:** Nejlepší kvalita extrakce, rychlost, OCR integrace, UTF-8 podpora včetně češtiny.
**Nevýhody:** AGPL licence může být problematická pro některé komerční projekty.

---

### pdf.js — pro browser-side zpracování

| Atribut | Hodnota |
|---------|---------|
| GitHub | github.com/mozilla/pdf.js |
| Stars | **52 400+** |
| Licence | Apache-2.0 |
| Údržba | Mozilla |

Jediná knihovna umožňující **plnohodnotné zpracování PDF přímo v prohlížeči**. Využívá ji Firefox pro vestavěný PDF viewer. Dostupná přes npm jako `pdfjs-dist` pro Node.js i browser.

```javascript
import * as pdfjsLib from 'pdfjs-dist';

const pdf = await pdfjsLib.getDocument('dokument.pdf').promise;
const page = await pdf.getPage(1);
const textContent = await page.getTextContent();
const text = textContent.items.map(item => item.str).join(' ');
```

**Nevýhody:** Nepreservuje reading order, nepodporuje OCR, ~2MB bundle size.

---

### pdf-parse — lehká Node.js alternativa

| Atribut | Hodnota |
|---------|---------|
| npm | pdf-parse |
| Verze | 2.4.5 (říjen 2025, TypeScript rewrite) |
| Licence | MIT |

Verze 2.x přináší čistý TypeScript, **zero native dependencies** a kompatibilitu se serverless prostředím (Vercel, AWS Lambda, Cloudflare Workers). Nová metoda `getTable()` detekuje tabulky.

```javascript
import { PDFParse } from 'pdf-parse';

const parser = new PDFParse({ data: pdfBuffer });
const { text, totalPages } = await parser.getText();
```

---

### Srovnávací tabulka PDF parserů

| Knihovna | Jazyk | Stars | Rychlost | OCR | Web/Browser | Licence |
|----------|-------|-------|----------|-----|-------------|---------|
| **PyMuPDF** | Python | 8.5k | ⭐ Nejrychlejší | ✅ Tesseract | ❌ Server | AGPL-3.0 |
| **pdf.js** | JavaScript | 52.4k | Střední | ❌ | ✅ Ano | Apache-2.0 |
| **pdf-parse** | TypeScript | npm | Rychlá | ❌ | ✅ Obojí | MIT |
| **pdfminer.six** | Python | 6.2k | Pomalá | ❌ | ❌ Server | MIT |
| **Poppler** | C/C++ | — | Velmi rychlá | ❌ | ❌ Server | GPL-2.0 |
| **Apache PDFBox** | Java | 2.9k | Střední | ❌ | ❌ Server | Apache-2.0 |

---

## JavaScript knihovny pro client-side vyhledávání

Pro menší datasety nebo offline-first aplikace nabízejí JavaScript knihovny vyhledávání bez serverové infrastruktury.

### Orama — nejmodernější volba s vector search

| Atribut | Hodnota |
|---------|---------|
| GitHub | github.com/oramasearch/orama |
| Stars | **10 000+** |
| Licence | Apache 2.0 |
| TypeScript | 97.9% |

Orama (dříve Lyra) je **jediná JS knihovna s nativní podporou vektorového vyhledávání**. Kombinuje BM25 fulltext, hybrid search, geosearch a RAG/chat session support. Podporuje **30+ jazyků** včetně stemmingu a tokenizace.

```typescript
import { create, insert, search } from '@orama/orama';

const db = create({
  schema: {
    title: 'string',
    content: 'string',
    embedding: 'vector[384]'
  }
});

insert(db, { title: 'Dokument', content: 'Text...', embedding: [...] });
const results = search(db, { term: 'dokument' });
```

**Persistence:** Plugin `@orama/plugin-data-persistence` pro filesystem/IndexedDB.

---

### FlexSearch — nejvyšší výkon

| Atribut | Hodnota |
|---------|---------|
| GitHub | github.com/nextapps-de/flexsearch |
| Stars | **13 400+** |
| Licence | Apache 2.0 |
| Verze | v0.8.2 (květen 2025) |

FlexSearch v0.8 je **nejrychlejší JavaScript vyhledávací knihovna** — benchmarky ukazují až 1 000 000× rychlejší výkon než konkurence pro určité operace. Unikátní "Contextual Index" architektura minimalizuje memory footprint.

**Nevýhoda:** Omezené fuzzy vyhledávání (spoléhá na fonetické transformace), bez nativního českého stemmeru.

```javascript
import { Document } from 'flexsearch';

const doc = new Document({
  document: { id: 'id', index: ['title', 'content'] }
});
doc.add({ id: 1, title: 'Hello', content: 'World' });
const results = doc.search('hello');
```

---

### MiniSearch — vyvážená volba

| Atribut | Hodnota |
|---------|---------|
| GitHub | github.com/lucaong/minisearch |
| Stars | **5 600+** |
| Licence | MIT |
| TypeScript | Nativní |

MiniSearch nabízí **nejlepší poměr funkcí a jednoduchosti**: fuzzy search s konfigurovatelným edit distance, prefix search, auto-suggestions, BM25 ranking. Radix tree architektura zajišťuje efektivní paměťové využití.

```javascript
import MiniSearch from 'minisearch';

const miniSearch = new MiniSearch({
  fields: ['title', 'text'],
  storeFields: ['title'],
  searchOptions: { fuzzy: 0.2, prefix: true }
});

miniSearch.addAll(documents);
const results = miniSearch.search('vyhledávání');
```

---

### Srovnání JavaScript knihoven

| Knihovna | Stars | Aktivní | Výkon | Fuzzy | Vector | TypeScript | Persistence |
|----------|-------|---------|-------|-------|--------|------------|-------------|
| **Orama** | 10k | ✅ | Rychlý | ✅ | ⭐ Ano | ⭐ Native | Plugin |
| **FlexSearch** | 13.4k | ✅ | ⭐ Nejrychlejší | Omezené | ❌ | ✅ | Ano |
| **MiniSearch** | 5.6k | ✅ | Rychlý | ✅ | ❌ | ⭐ Native | JSON |
| **Fuse.js** | 19.6k | ✅ | Pomalý | ⭐ Nejlepší | ❌ | ✅ | ❌ |
| **Lunr.js** | 9.2k | ❌ Stale | Střední | ✅ | ❌ | @types | JSON |

---

## Kompletní document management systémy

Pro rychlé nasazení bez vlastního vývoje existují hotová řešení kombinující upload, OCR, indexaci i vyhledávání.

### Paperless-ngx — doporučená volba pro rychlý start

| Atribut | Hodnota |
|---------|---------|
| GitHub | github.com/paperless-ngx/paperless-ngx |
| Stars | **34 200+** |
| Licence | GPL-3.0 |
| Stack | Python/Django + Angular + PostgreSQL + Tesseract |

Paperless-ngx je **nejpopulárnější open-source document management systém** s aktivní komunitou (382 contributors, 10 654 commits). Nabízí kompletní pipeline: watch folder/API upload → OCR → ML auto-tagging → fulltext indexace → webové rozhraní.

**Česká podpora:** `PAPERLESS_OCR_LANGUAGE=ces` aktivuje český Tesseract OCR.

**REST API:** Kompletní dokumentované API pro integraci do vlastní platformy.

**Rozšíření o vector search:** Možné přidat Qdrant sidecar kontejner a synchronizovat embeddingy přes custom worker.

---

### Docspell — alternativa se SOLR backendem

| Atribut | Hodnota |
|---------|---------|
| GitHub | github.com/eikek/docspell |
| Stars | **2 000+** |
| Licence | AGPL-3.0 |
| Stack | Scala + Elm + PostgreSQL + Apache SOLR |

Docspell využívá Stanford CoreNLP pro NER extrakci (jména, data, organizace) a Apache SOLR pro fulltext. Vhodný pro pokročilé use-cases s potřebou strukturované extrakce metadat.

---

## Budoucnost: sémantické a hybridní vyhledávání

Keyword-based search má limity — nerozumí synonymům, kontextu ani sémantickému významu. Vector search tyto problémy řeší pomocí embedding modelů, které převádějí text na numerické vektory zachycující význam.

### Qdrant — doporučená vektorová databáze

| Atribut | Hodnota |
|---------|---------|
| GitHub | github.com/qdrant/qdrant |
| Stars | **22 000+** |
| Licence | Apache 2.0 |
| Jazyk | Rust |

Qdrant nabízí **nejlepší filtering** (pre-filtering před vector search), gRPC + REST API, payload storage pro metadata a quantization pro paměťovou efektivitu.

**Hybridní vyhledávání:** Kombinace BM25 (keyword) + vector similarity pomocí Reciprocal Rank Fusion:

```
Query → BM25 Search → Sparse Results ─┐
      → Vector Search → Dense Results ─┼→ RRF Fusion → Re-rank → Results
```

**Multilingual embedding pro češtinu:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`

---

## Doporučení pro platformu AdHub

### Varianta A: Custom stack (maximální flexibilita)

```
┌─────────────────────────────────────────────────────────────┐
│  INGESTION: FastAPI + Celery workers                        │
│  PDF PARSER: PyMuPDF (nejlepší kvalita/rychlost)           │
│  OCR: Tesseract 5 + ocrmypdf (pro skenované dokumenty)     │
│  FULLTEXT: Meilisearch nebo Typesense                       │
│  VECTOR: Qdrant (pro budoucí sémantické vyhledávání)        │
│  STORAGE: PostgreSQL + S3/MinIO                             │
└─────────────────────────────────────────────────────────────┘
```

**Doporučená kombinace:**
- **PyMuPDF** pro extrakci textu (AGPL licence, nebo pdfminer.six s MIT)
- **Typesense** pro fulltext (nejlepší český stemming)
- **Qdrant** pro vector search připravenost

**Implementační náročnost:** 4–8 týdnů pro produkční nasazení

---

### Varianta B: Paperless-ngx + rozšíření (rychlý start)

```
┌─────────────────────────────────────────────────────────────┐
│  CORE: Paperless-ngx (hotové řešení)                        │
│  VECTOR: Qdrant sidecar + sync worker                       │
│  HYBRID: Application-level fusion                           │
└─────────────────────────────────────────────────────────────┘
```

**Implementační náročnost:** 2–4 týdny pro MVP

---

### Varianta C: JavaScript-only (pro menší scale)

```
┌─────────────────────────────────────────────────────────────┐
│  PDF PARSER: pdf-parse (TypeScript, serverless-friendly)    │
│  SEARCH: Orama (vector + fulltext v jednom)                 │
│  STORAGE: IndexedDB (browser) nebo filesystem               │
└─────────────────────────────────────────────────────────────┘
```

**Vhodné pro:** < 10 000 dokumentů, offline-first aplikace

---

### Rozhodovací matice

| Faktor | Varianta A (Custom) | Varianta B (Paperless) | Varianta C (JS) |
|--------|---------------------|------------------------|-----------------|
| Čas nasazení | 4–8 týdnů | 2–4 týdny | 1–2 týdny |
| Flexibilita | ⭐ Maximální | Střední | Omezená |
| Škálovatelnost | Miliony docs | 100k docs | 10k docs |
| Sémantické vyhledávání | Nativní | Add-on | Orama native |
| Údržba | Vyšší | Nízká | Střední |
| Česká podpora | Typesense/Manticore | Tesseract OCR | Custom stemmer |

---

## Klíčové technické rozhodnutí

Pro AdHub doporučuji **Variantu A s Typesense** jako primárním vyhledávačem:

1. **Typesense** má nejlepší nativní podporu češtiny (Snowball stemmer)
2. **PyMuPDF** poskytuje nejvyšší kvalitu extrakce textu
3. **Qdrant** připraví infrastrukturu pro budoucí sémantické vyhledávání
4. REST API všech komponent umožňuje snadnou integraci do webové platformy
5. Celý stack je self-hosted, open-source a horizontálně škálovatelný

**Embedding model pro češtinu:** `paraphrase-multilingual-MiniLM-L12-v2` (384 dimenzí, dobrá kvalita pro slovanské jazyky)

**Chunk size pro indexaci:** 512 tokenů s 50-token overlap pro zachování kontextu