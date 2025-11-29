# Analýza metod stahování YouTube videí

## Přehled metod

| Metoda | Spolehlivost | Složitost | Závislosti | Rychlost |
|--------|-------------|-----------|------------|----------|
| ytInitialPlayerResponse (aktuální) | 🔴 Nízká | Střední | Žádné | Rychlá |
| Cobalt.tools API | 🟢 Vysoká | Nízká | Externí API | Střední |
| Invidious API | 🟡 Střední | Nízká | Externí API | Střední |
| Vlastní backend + yt-dlp | 🟢 Vysoká | Vysoká | Server | Pomalá |
| YouTube IFrame API + capture | 🔴 Nízká | Vysoká | Žádné | Pomalá |

---

## 1. Aktuální metoda (ytInitialPlayerResponse)

### Problémy:
- YouTube používá `signatureCipher` pro většinu kvalitních formátů
- Deobfuskační algoritmus se mění každých pár týdnů
- Bez správné signature dostáváme 403 Forbidden

### Kdy funguje:
- Některá starší videa
- Nízké kvality (360p) někdy mají přímé URL
- Videa bez DRM ochrany

### Kód problému:
```javascript
// signatureCipher obsahuje:
// s=ENCRYPTED_SIGNATURE&sp=sig&url=BASE_URL
//
// Pro dekódování potřebujeme:
// 1. Stáhnout base.js z YouTube
// 2. Najít deobfuskační funkci
// 3. Aplikovat ji na 's' parametr
//
// Toto je VELMI složité a nestabilní!
```

---

## 2. Cobalt.tools API (DOPORUČENO)

### Výhody:
- ✅ Velmi spolehlivé
- ✅ Podporuje mnoho formátů a kvalit
- ✅ Žádná potřeba vlastního serveru
- ✅ Rychlé aktualizace při změnách YouTube
- ✅ Open source

### Nevýhody:
- ⚠️ Závislost na externí službě
- ⚠️ Rate limiting

### API Endpoint:
```
POST https://api.cobalt.tools/
Content-Type: application/json

{
  "url": "https://youtube.com/watch?v=VIDEO_ID",
  "downloadMode": "auto",
  "filenameStyle": "pretty",
  "videoQuality": "1080"
}
```

### Response:
```json
{
  "status": "tunnel",
  "url": "https://api.cobalt.tools/tunnel?id=...",
  "filename": "video.mp4"
}
```

---

## 3. Invidious API

### Výhody:
- ✅ Open source
- ✅ Více instancí (fallback)
- ✅ Přímé download URL

### Nevýhody:
- ⚠️ Instance mohou být nestabilní
- ⚠️ Některé instance blokují stahování

### API Endpoint:
```
GET https://invidious.snopyta.org/api/v1/videos/VIDEO_ID

Response obsahuje:
- adaptiveFormats[] - video/audio pouze
- formatStreams[] - kombinované formáty s přímými URL
```

### Dostupné instance:
- https://yewtu.be
- https://vid.puffyan.us
- https://invidious.namazso.eu
- https://inv.nadeko.net

---

## 4. Vlastní backend + yt-dlp

### Výhody:
- ✅ Nejspolehlivější řešení
- ✅ Plná kontrola
- ✅ Všechny formáty a kvality

### Nevýhody:
- ❌ Potřeba hostovat server
- ❌ Náklady na hosting
- ❌ Údržba

### Python backend:
```python
from flask import Flask, jsonify, request
import yt_dlp

app = Flask(__name__)

@app.route('/api/info/<video_id>')
def get_info(video_id):
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(
            f'https://youtube.com/watch?v={video_id}',
            download=False
        )

    return jsonify({
        'title': info['title'],
        'formats': [{
            'format_id': f['format_id'],
            'ext': f['ext'],
            'quality': f.get('quality'),
            'url': f['url'],
            'filesize': f.get('filesize')
        } for f in info['formats'] if f.get('url')]
    })
```

---

## 5. Hybridní řešení (DOPORUČENO PRO PLUGIN)

Kombinace více metod s fallbacky:

```
1. Zkusit Cobalt API (nejrychlejší, nejspolehlivější)
   ↓ pokud selže
2. Zkusit Invidious API (více instancí)
   ↓ pokud selže
3. Zkusit přímou extrakci (pro jednoduchá videa)
   ↓ pokud selže
4. Zobrazit chybu s možností reportu
```

---

## Implementační plán

### Fáze 1: Integrace Cobalt API
- Přidat Cobalt jako primární metodu
- Implementovat error handling
- Přidat progress tracking

### Fáze 2: Invidious fallback
- Přidat seznam Invidious instancí
- Implementovat automatický failover
- Cache funkčních instancí

### Fáze 3: Vylepšená přímá extrakce
- Vylepšit parsing ytInitialPlayerResponse
- Přidat podporu pro videa bez signatureCipher
- Implementovat jako poslední fallback

---

## Bezpečnostní poznámky

1. **CORS**: Všechny API volání musí jít přes background script
2. **Rate limiting**: Implementovat queue pro požadavky
3. **Error handling**: Detailní logování pro debugging
4. **Privacy**: Neposílat zbytečná data třetím stranám
