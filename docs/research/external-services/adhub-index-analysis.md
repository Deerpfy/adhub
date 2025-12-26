# Analýza webu: AdHUB

**URL**: https://deerpfy.github.io/adhub/index.html
**Datum analýzy**: 2025-12-26
**Autor**: Deerpfy
**Verze**: 1.3.1

---

## Shrnutí

AdHUB je centrální hub pro nástroje a utility kombinující lokální projekty (21 vlastních nástrojů) s kurátorovaným katalogem 150+ bezplatných externích online služeb. Web je kompletně statický (vanilla JS/CSS/HTML), bez build procesu, s podporou 40 jazyků a PWA-ready designem. Klíčový je důraz na 100% bezplatné služby a offline-first přístup.

---

## 1. Technická analýza

### Použité technologie

| Kategorie | Technologie | Poznámka |
|-----------|-------------|----------|
| **Frontend** | Vanilla JS/CSS/HTML | Bez frameworků, bez bundleru |
| **Hosting** | GitHub Pages | Statický hosting zdarma |
| **Backend** | Firebase Realtime Database | Pouze pro view counter |
| **Styling** | CSS Custom Properties | Dark mode, glassmorphism |
| **PWA** | Meta tagy, Service Worker ready | Offline-first design |
| **Překlady** | 40 jazyků | CS/EN nativní, AI překlady |

### Výkonnostní optimalizace

| Technika | Implementace |
|----------|--------------|
| **CLS Prevention** | Fixed dimensions, `contain: layout` |
| **Lazy Loading** | Skeleton loading, progressive render |
| **Preconnect** | Firebase, ipapi.co |
| **Defer Scripts** | `<script defer>` |
| **Critical CSS** | Inline v `<head>` |

### SEO implementace

```html
<!-- Schema.org JSON-LD -->
<script type="application/ld+json">
{
    "@type": "WebApplication",
    "applicationCategory": "UtilitiesApplication",
    "offers": { "price": "0" }
}
</script>
```

- Open Graph / Facebook meta tagy
- Twitter Card meta tagy
- Kanonická URL
- Meta description + keywords

---

## 2. Lokální nástroje (21 projektů)

### Přehled lokálních projektů

| ID | Název | Kategorie | Typ | Status |
|----|-------|-----------|-----|--------|
| youtube-downloader | YouTube Downloader | video | Chrome Extension | ✅ Active |
| chat-panel | Multistream Chat Panel | streaming | Web App + Server | ✅ Active |
| chat-moderator | Chat Moderator Extension | streaming | Chrome Extension | ✅ Active |
| komopizza-demo | KomoPizza Demo | demos | Web App | ✅ Active |
| spinning-wheel-giveaway | Spinning Wheel Giveaway | streaming | Web App | ✅ Active |
| resignation-bets | Sázky na výpověď | demos | Web App | ✅ Active |
| ai-prompting | AI Prompting | tools | Web App | ✅ Active |
| pdf-merge | PDF Merge | tools | Web App | ✅ Active |
| pdf-editor | PDF Editor | tools | Web App | ✅ Active |
| pdf-search | PDF Search | tools | Web App | ✅ Active |
| goalix | Goalix | tools | Web App (PWA) | ✅ Active |
| cardharvest | CardHarvest | gaming | Extension + Native Host | ✅ Active |
| rust-calculator | Rust Calculator | gaming | Web App (PWA) | ✅ Active |
| scribblix | Scribblix | tools | Web App (PWA) | ✅ Active |
| nimt-tracker | AI Visibility Tracker | tools | Web App (PWA) | ✅ Active |
| api-catalog | API Katalog | tools | Web App (PWA) | ✅ Active |
| server-hub | Server Hub | tools | Web App (PWA) | ✅ Active |
| paintnook | PaintNook | design | Web App (PWA) | ✅ Active |
| bg-remover | BG Remover | design | Web App (PWA) | ✅ Active |
| slidersnap | SliderSnap | design | Web App (PWA) | ✅ Active |
| samplehub | SampleHub | tools | Web App (PWA) | ✅ Active |

### Kategorie lokálních nástrojů

| Kategorie | Počet | Příklady |
|-----------|-------|----------|
| **tools** | 10 | PDF Editor, Goalix, Scribblix |
| **design** | 3 | PaintNook, BG Remover, SliderSnap |
| **streaming** | 3 | Chat Panel, Spinning Wheel |
| **gaming** | 2 | CardHarvest, Rust Calculator |
| **demos** | 2 | KomoPizza, Resignation Bets |
| **video** | 1 | YouTube Downloader |

---

## 3. Externí služby - Kategorizace podle ceny

### 🆓 100% ZDARMA (bez limitů)

#### Security & Privacy
| Služba | URL | Popis |
|--------|-----|-------|
| VirusTotal | virustotal.com | 70+ AV enginů |
| Have I Been Pwned | haveibeenpwned.com | Kontrola úniků dat |
| SSL Labs | ssllabs.com/ssltest | SSL/TLS analýza |
| Mozilla Observatory | developer.mozilla.org/observatory | HTTP headers |
| Hybrid Analysis | hybrid-analysis.com | Malware sandbox |
| Am I Unique? | amiunique.org | Browser fingerprint |
| Security Headers | securityheaders.com | HTTP hlavičky |
| Jotti's Malware Scan | virusscan.jotti.org | Multi-engine scanner |
| MetaDefender | metadefender.com | 20+ AV enginů |
| Internxt Scanner | internxt.com/virus-scanner | Zero-knowledge |

#### Developer Tools
| Služba | URL | Popis |
|--------|-----|-------|
| Regex101 | regex101.com | Regex tester |
| RegExr | regexr.com | Regex s komunitou |
| JSONLint | jsonlint.com | JSON validátor |
| JSON Editor Online | jsoneditoronline.org | JSON editor |
| JSON Crack | jsoncrack.com | JSON vizualizace |
| Hoppscotch | hoppscotch.io | API testing (open-source) |
| ReqBin | reqbin.com | REST API testing |
| CodePen | codepen.io | Frontend playground |
| JSFiddle | jsfiddle.net | Code playground |
| PlayCode | playcode.io | JS playground |
| Diffchecker | diffchecker.com | Text/code diff |
| Base64 Decode/Encode | base64decode.org | Base64 nástroj |
| Crontab.guru | crontab.guru | Cron editor |
| UUID Generator | uuidgenerator.net | UUID v1/v4/v7 |
| Beautifier.io | beautifier.io | JS/HTML/CSS formatter |
| CodeBeautify | codebeautify.org | Multi-language formatter |
| Minifier.org | minifier.org | JS/CSS minifikace |

#### Design & Graphics
| Služba | URL | Popis |
|--------|-----|-------|
| Photopea | photopea.com | Photoshop alternativa |
| Coolors | coolors.co | Barevné palety |
| Paletton | paletton.com | Color wheel |
| Favicon.io | favicon.io | Favicon generátor |
| RealFaviconGenerator | realfavicongenerator.net | Multi-platform favicon |
| SVG Repo | svgrepo.com | 500k+ SVG ikon |
| Iconoir | iconoir.com | Open-source ikony |
| Pattern Monster | pattern.monster | SVG vzory |
| Doodad Pattern | doodad.dev/pattern-generator | Seamless patterns |
| CSS Gradient | cssgradient.io | Gradient generátor |
| Josh's Gradient | joshwcomeau.com/gradient-generator | Pokročilé gradienty |
| Placehold.co | placehold.co | Placeholder obrázky |
| Method Draw | editor.method.ac | SVG editor |
| Fontjoy | fontjoy.com | AI font pairing |
| MockupBro | mockupbro.com | Produktové mockupy |
| Namecheap Logo | namecheap.com/logo-maker | AI logo maker |

#### Text & Writing
| Služba | URL | Popis |
|--------|-----|-------|
| Scribbr Grammar | scribbr.com/grammar-checker | AI gramatika |
| QuillBot Grammar | quillbot.com/grammar-check | Gramatika za psaní |
| StackEdit | stackedit.io | Markdown editor |
| Dillinger | dillinger.io | Cloud Markdown |
| WordCounter.net | wordcounter.net | Počítadlo slov |
| Convert Case | convertcase.net | Konverze písmen |
| Lipsum.com | lipsum.com | Lorem Ipsum |
| Hemingway Editor | hemingwayapp.com | Readability check |
| Text-Compare | text-compare.com | Text diff |

#### SEO & Web Analysis
| Služba | URL | Popis |
|--------|-----|-------|
| PageSpeed Insights | pagespeed.web.dev | Google performance |
| GTmetrix | gtmetrix.com | Lighthouse testing |
| WebPageTest | webpagetest.org | Real browser testing |
| Pingdom | tools.pingdom.com | Load speed |
| Seobility | seobility.net/seocheck | SEO analyzer |
| SEOptimer | seoptimer.com | SEO audit |
| Schema.org Validator | validator.schema.org | Structured data |
| Rich Results Test | search.google.com/test/rich-results | SERP preview |
| Broken Link Check | brokenlinkcheck.com | Dead links finder |
| XML-Sitemaps | xml-sitemaps.com | Sitemap generátor |

#### Network & DNS
| Služba | URL | Popis |
|--------|-----|-------|
| MXToolbox | mxtoolbox.com | DNS/MX/Blacklist |
| CentralOps | centralops.net | Network tools |
| Who.is | who.is | WHOIS lookup |
| Ping.eu | ping.eu | 10+ síťových nástrojů |
| DNSChecker | dnschecker.org | DNS propagace |
| HackerTarget | hackertarget.com | Nmap port scanner |
| Fast.com | fast.com | Netflix speed test |
| TestMy.net | testmy.net | Broadband test |
| IPVoid | ipvoid.com | IP blacklist check |

#### Data & Calculation
| Služba | URL | Popis |
|--------|-----|-------|
| Desmos Scientific | desmos.com/scientific | Vědecká kalkulačka |
| Calculator.net | calculator.net | 200+ kalkulátorů |
| UnitConverters.net | unitconverters.net | 77+ kategorií |
| TimeAndDate | timeanddate.com | Časové zóny |
| World Time Buddy | worldtimebuddy.com | Vizuální TZ |
| ChartGo | chartgo.com | Grafy bez registrace |
| RAWGraphs | rawgraphs.io | Open-source vizualizace |
| LiveGap Charts | charts.livegap.com | 50+ šablon grafů |
| Social Science Stats | socscistatistics.com | Statistické testy |

#### Compression & Archive
| Služba | URL | Popis |
|--------|-----|-------|
| ezyZip | ezyzip.com | Browser-based, no upload |
| ZIP Extractor | zipextractor.app | Google Drive integrace |
| Unzip-Online | unzip-online.com | ZIP/RAR extrakce |
| CloudConvert Archive | archive.online-convert.com | Format konverze |
| Aspose ZIP | products.aspose.app/zip | 24h dostupnost |

#### QR Code Generators
| Služba | URL | Popis |
|--------|-----|-------|
| QRCode Monkey | qrcode-monkey.com | Custom loga, high-res |
| QRStuff | qrstuff.com | 20+ data typů |
| goQR.me | goqr.me | Komerční použití OK |
| QR Creator | qr-creator.com | Bez expirace |
| QRGenerator.org | qrgenerator.org | Unlimited scans |

#### Screenshot & Recording
| Služba | URL | Popis |
|--------|-----|-------|
| ScreenPal | screen-recorder.com | Bez vodoznaků |
| RecordCast | recordcast.com | S video editorem |
| Panopto Express | panopto.com/record | Bez limitů |
| ScreenCapture | screencapture.com | Custom area |
| Screenshot Guru | screenshot.guru | Full-page URL |
| Gemoo Screenshot | gemoo.com/tools | Desktop + mobile |

#### Temporary & Disposable
| Služba | URL | Popis |
|--------|-----|-------|
| Guerrilla Mail | guerrillamail.com | 60min email |
| Temp-Mail | temp-mail.org | Multi-domain |
| Maildrop | maildrop.cc | Instant inbox |
| PrivateBin | privatebin.net | Zero-knowledge paste |
| Pastes.io | pastes.io | Encrypted pastes |
| File.io | file.io | Auto-delete 4GB |
| Privnote | privnote.com | Self-destruct notes |
| Chattory | chattory.com | Temporary chat rooms |

#### AI & Automation
| Služba | URL | Popis |
|--------|-----|-------|
| TinyWow | tinywow.com | 700+ AI nástrojů |
| Perchance AI Chat | perchance.org/ai-chat | Unlimited, no signup |
| DeepAI Chat | deepai.org/chat | Free AI chatbot |
| OCR.space | ocr.space | Free OCR API |
| NewOCR | newocr.com | 122 jazyků |
| i2OCR | i2ocr.com | 100+ jazyků |
| QuillBot Summarizer | quillbot.com/summarize | AI sumarizace |
| Scribbr Summarizer | scribbr.com/text-summarizer | Flexibilní délka |

#### Learning & Reference
| Služba | URL | Popis |
|--------|-----|-------|
| Desmos Graphing | desmos.com/calculator | Grafická kalkulačka |
| OnlineConversion | onlineconversion.com | Tisíce převodů |
| TypingClub | typingclub.com | Free tutor psaní |
| Keybr | keybr.com | Adaptivní lekce |
| Wolfram Alpha | wolframalpha.com | Znalostní engine |

#### Browser Productivity
| Služba | URL | Popis |
|--------|-----|-------|
| draw.io | diagrams.net | Diagramy (open-source) |
| Excalidraw | excalidraw.com | Whiteboard |
| tldraw | tldraw.com | Instant whiteboard |
| Pomofocus | pomofocus.io | Pomodoro timer |
| TomatoTimers | tomatotimers.com | Pomodoro |
| ProtectedText | protectedtext.com | Encrypted notepad |
| OnlineNotepad | onlinenotepad.org | Auto-save notepad |
| Simple Mindmap | simplemindmap.com | Myšlenkové mapy |
| PDF24 Annotate | tools.pdf24.org/annotate-pdf | PDF anotace |
| PDFgear Online | pdfgear.com/edit-pdf | PDF editor |

---

### 💰 FREEMIUM (základní funkce zdarma, premium placené)

| Služba | Free tier | Premium |
|--------|-----------|---------|
| **Smallpdf** | Limitovaná konverze | Unlimited |
| **CloudConvert** | 25 konverzí/den | Pay-as-you-go |
| **Convertio** | 100 MB limit | Větší limity |
| **Remove.bg** | Nízké rozlišení | HD stahování |
| **Pixlr** | Základní nástroje | AI Pro nástroje |
| **WeTransfer** | 2GB, 2 týdny | 200GB, custom |
| **Colormind** | Základní generátor | API přístup |
| **Screenzy** | Watermark | Bez watermarku |

---

### ⚙️ System Utilities (Windows)

| Služba | URL | Popis |
|--------|-----|-------|
| Ninite | ninite.com | Bulk install Windows apps |
| Winget.run | winget.run | WinGet katalog |
| OBS Studio | obsproject.com | Streaming/recording |
| yt-dlp | github.com/yt-dlp | Video downloader |
| Patch My PC | patchmypc.com | Auto-updater |

---

## 4. Statistiky

### Celkový přehled

| Metrika | Hodnota |
|---------|---------|
| **Lokální nástroje** | 21 |
| **Externí odkazy** | 150+ |
| **Jazyků** | 40 |
| **Kategorií** | 15+ |
| **100% Free služeb** | 140+ |
| **Freemium služeb** | ~10 |

### Rozdělení podle kategorií

```
Security & Privacy:     10 služeb
Developer Tools:        17 služeb
Design & Graphics:      16 služeb
Text & Writing:          9 služeb
SEO & Web Analysis:     10 služeb
Network & DNS:           9 služeb
Data & Calculation:      9 služeb
File Conversion:        12 služeb
Compression & Archive:   5 služeb
QR Code Generators:      5 služeb
Screenshot & Recording:  6 služeb
Temporary & Disposable:  9 služeb
AI & Automation:         8 služeb
Learning & Reference:    5 služeb
Browser Productivity:   10 služeb
System Utilities:        5 služeb
```

---

## 5. Silné stránky

1. **100% Free fokus** - Důraz na bezplatné služby bez skrytých poplatků
2. **Offline-first** - Většina lokálních nástrojů funguje offline (PWA)
3. **Privacy-focused** - Žádné trackery, client-side zpracování
4. **Multi-language** - 40 jazyků s AI překlady
5. **No build process** - Vanilla JS/CSS/HTML = jednoduchá údržba
6. **Kurátorský přístup** - Vybrané kvalitní služby, ne spam
7. **View counter** - Firebase pro sledování popularity
8. **Lazy loading** - Optimalizovaný výkon

---

## 6. Slabé stránky a doporučení

| Problém | Závažnost | Doporučení | Priorita |
|---------|-----------|------------|----------|
| **Žádné vyhledávání v popisu** | Střední | Fulltext search | Střední |
| **Chybí service worker** | Nízká | Implementovat pro true PWA | Nízká |
| **Statická konfigurace** | Nízká | JSON soubor pro snazší údržbu | Nízká |
| **Chybí kategorie filtrování** | Střední | Dropdown podle kategorií | Střední |

---

## 7. Struktura souborů

```
adhub/
├── index.html              # Hlavní stránka
├── script.js               # Logika (50k+ lines)
├── styles.css              # Styly (1700+ lines)
├── og-image.png            # Open Graph image
├── apple-touch-icon.png    # iOS ikona
└── projects/               # 21 lokálních projektů
    ├── youtube-downloader/
    ├── chat-panel/
    ├── pdf-editor/
    ├── pdf-merge/
    ├── pdf-search/
    ├── goalix/
    ├── cardharvest/
    ├── rust-calculator/
    ├── scribblix/
    ├── nimt-tracker/
    ├── api-catalog/
    ├── server-hub/
    ├── paintnook/
    ├── bg-remover/
    ├── slidersnap/
    ├── samplehub/
    ├── ai-prompting/
    ├── spinning-wheel-giveaway/
    ├── resignation-bets/
    └── komopizza/
```

---

## Zdroje

- [AdHUB GitHub Repository](https://github.com/Deerpfy/adhub)
- [AdHUB Live Demo](https://deerpfy.github.io/adhub/)
