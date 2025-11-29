#!/usr/bin/env python3
"""
YouTube Downloader - Kompletní nástroj pro stahování videí z YouTube
=====================================================================
Podporované formáty: MP4, WEBM, MP3, WAV, M4A, FLAC, OGG
Podporované kvality: Všechny dostupné (4K, 1440p, 1080p, 720p, 480p, 360p, 240p, 144p)

Použití:
    python youtube_downloader.py                    # Interaktivní režim
    python youtube_downloader.py URL               # Stáhne v nejlepší kvalitě
    python youtube_downloader.py URL --format mp3  # Stáhne jako MP3
    python youtube_downloader.py URL --format mp4 --quality 1080  # MP4 v 1080p
    python youtube_downloader.py URL --list        # Zobrazí dostupné formáty

Požadavky:
    pip install yt-dlp

Volitelně pro konverzi audia:
    - FFmpeg (pro MP3, WAV, FLAC konverzi)
"""

import os
import sys
import argparse

try:
    import yt_dlp
except ImportError:
    print("CHYBA: yt-dlp není nainstalován!")
    print("Nainstalujte pomocí: pip install yt-dlp")
    sys.exit(1)


# Podporované formáty
AUDIO_FORMATS = ['mp3', 'wav', 'm4a', 'flac', 'ogg']
VIDEO_FORMATS = ['mp4', 'webm', 'mkv']
ALL_FORMATS = VIDEO_FORMATS + AUDIO_FORMATS


def get_video_info(url):
    """Získá informace o videu včetně dostupných formátů."""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return info


def parse_formats(info):
    """Zpracuje a roztřídí dostupné formáty."""
    video_formats = []
    audio_formats = []
    combined_formats = []

    for f in info.get('formats', []):
        format_id = f.get('format_id', '')
        ext = f.get('ext', '')
        height = f.get('height')
        width = f.get('width')
        filesize = f.get('filesize') or f.get('filesize_approx') or 0
        size_mb = filesize / (1024 * 1024) if filesize else 0
        acodec = f.get('acodec', 'none')
        vcodec = f.get('vcodec', 'none')
        fps = f.get('fps', 0)
        abr = f.get('abr', 0)
        vbr = f.get('vbr', 0)
        tbr = f.get('tbr', 0)

        has_video = vcodec != 'none' and vcodec is not None
        has_audio = acodec != 'none' and acodec is not None

        if has_video and has_audio and height:
            combined_formats.append({
                'id': format_id,
                'ext': ext,
                'height': height,
                'width': width,
                'fps': fps,
                'size_mb': size_mb,
                'tbr': tbr,
                'type': 'combined'
            })
        elif has_video and height:
            video_formats.append({
                'id': format_id,
                'ext': ext,
                'height': height,
                'width': width,
                'fps': fps,
                'size_mb': size_mb,
                'vbr': vbr,
                'vcodec': vcodec,
                'type': 'video_only'
            })
        elif has_audio:
            audio_formats.append({
                'id': format_id,
                'ext': ext,
                'abr': abr,
                'size_mb': size_mb,
                'acodec': acodec,
                'type': 'audio_only'
            })

    return video_formats, audio_formats, combined_formats


def get_available_qualities(info):
    """Získá seznam dostupných kvalit."""
    video_formats, _, combined_formats = parse_formats(info)
    all_video = video_formats + combined_formats

    qualities = set()
    for f in all_video:
        if f.get('height'):
            qualities.add(f['height'])

    return sorted(qualities, reverse=True)


def display_video_info(info):
    """Zobrazí informace o videu."""
    duration = info.get('duration', 0)
    minutes = duration // 60
    seconds = duration % 60

    print("\n" + "=" * 70)
    print(f"  NÁZEV: {info.get('title', 'Neznámý')}")
    print(f"  KANÁL: {info.get('uploader', 'Neznámý')}")
    print(f"  DÉLKA: {minutes}:{seconds:02d}")
    print(f"  ZHLÉDNUTÍ: {info.get('view_count', 0):,}".replace(',', ' '))
    print("=" * 70)


def display_formats_detailed(info):
    """Zobrazí detailní přehled formátů."""
    video_formats, audio_formats, combined_formats = parse_formats(info)

    display_video_info(info)

    # Kombinované formáty (video + audio)
    print("\n📹 VIDEO + AUDIO (přímé stažení):")
    print("-" * 60)
    combined_sorted = sorted(combined_formats, key=lambda x: x['height'], reverse=True)
    for f in combined_sorted[:10]:
        size_str = f"{f['size_mb']:.1f} MB" if f['size_mb'] > 0 else "? MB"
        fps_str = f" {f['fps']}fps" if f['fps'] else ""
        print(f"  {f['height']}p{fps_str} [{f['ext']}] - {size_str}")

    # Video-only formáty
    print("\n🎬 VIDEO (bez audia - bude sloučeno):")
    print("-" * 60)
    video_sorted = sorted(video_formats, key=lambda x: x['height'], reverse=True)
    seen_heights = set()
    for f in video_sorted:
        key = (f['height'], f['ext'])
        if key not in seen_heights:
            seen_heights.add(key)
            size_str = f"{f['size_mb']:.1f} MB" if f['size_mb'] > 0 else "? MB"
            fps_str = f" {f['fps']}fps" if f['fps'] else ""
            print(f"  {f['height']}p{fps_str} [{f['ext']}] - {size_str}")

    # Audio formáty
    print("\n🎵 AUDIO:")
    print("-" * 60)
    audio_sorted = sorted(audio_formats, key=lambda x: x.get('abr', 0), reverse=True)
    for f in audio_sorted[:8]:
        size_str = f"{f['size_mb']:.1f} MB" if f['size_mb'] > 0 else "? MB"
        abr_str = f"{int(f['abr'])}kbps" if f['abr'] else "?"
        print(f"  {abr_str} [{f['ext']}] - {size_str}")

    print()


def download(url, output_dir, format_type='mp4', quality=None, filename_template=None):
    """
    Stáhne video/audio z YouTube.

    Args:
        url: URL YouTube videa
        output_dir: Cílová složka
        format_type: Formát (mp4, webm, mp3, wav, m4a, flac, ogg)
        quality: Kvalita v pixelech (1080, 720, 480...) nebo None pro nejlepší
        filename_template: Šablona názvu souboru nebo None pro výchozí
    """

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    if filename_template is None:
        filename_template = '%(title)s [%(resolution)s].%(ext)s'

    outtmpl = os.path.join(output_dir, filename_template)

    ydl_opts = {
        'outtmpl': outtmpl,
        'quiet': False,
        'no_warnings': False,
        'progress_hooks': [progress_hook],
    }

    # Nastavení podle formátu
    if format_type in AUDIO_FORMATS:
        # Audio formáty
        ydl_opts['format'] = 'bestaudio/best'

        if format_type == 'mp3':
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            }]
        elif format_type == 'wav':
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
            }]
        elif format_type == 'm4a':
            ydl_opts['format'] = 'bestaudio[ext=m4a]/bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'm4a',
                'preferredquality': '256',
            }]
        elif format_type == 'flac':
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'flac',
            }]
        elif format_type == 'ogg':
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'vorbis',
                'preferredquality': '320',
            }]

        # Upravit šablonu pro audio
        ydl_opts['outtmpl'] = os.path.join(output_dir, '%(title)s.%(ext)s')

    elif format_type in VIDEO_FORMATS:
        # Video formáty
        if quality:
            # Specifická kvalita
            if format_type == 'mp4':
                ydl_opts['format'] = (
                    f'bestvideo[height<={quality}][ext=mp4]+bestaudio[ext=m4a]/'
                    f'bestvideo[height<={quality}]+bestaudio/'
                    f'best[height<={quality}]/best'
                )
            elif format_type == 'webm':
                ydl_opts['format'] = (
                    f'bestvideo[height<={quality}][ext=webm]+bestaudio[ext=webm]/'
                    f'bestvideo[height<={quality}]+bestaudio/'
                    f'best[height<={quality}]/best'
                )
            else:
                ydl_opts['format'] = f'bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best'
        else:
            # Nejlepší kvalita
            if format_type == 'mp4':
                ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best'
            elif format_type == 'webm':
                ydl_opts['format'] = 'bestvideo[ext=webm]+bestaudio[ext=webm]/bestvideo+bestaudio/best'
            else:
                ydl_opts['format'] = 'bestvideo+bestaudio/best'

        ydl_opts['merge_output_format'] = format_type

    # Stažení
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return info


def progress_hook(d):
    """Callback pro zobrazení průběhu stahování."""
    if d['status'] == 'downloading':
        percent = d.get('_percent_str', '?%')
        speed = d.get('_speed_str', '?')
        eta = d.get('_eta_str', '?')
        print(f"\r  Stahování: {percent} | Rychlost: {speed} | Zbývá: {eta}    ", end='', flush=True)
    elif d['status'] == 'finished':
        print(f"\r  Stahování dokončeno! Zpracovávám...                              ")


def interactive_mode():
    """Interaktivní režim pro výběr parametrů."""
    print("\n" + "=" * 70)
    print("           YOUTUBE DOWNLOADER - Interaktivní režim")
    print("=" * 70)

    # URL
    url = input("\n📎 Zadejte URL YouTube videa: ").strip()
    if not url:
        print("❌ URL je povinná!")
        return

    print("\n⏳ Načítám informace o videu...")

    try:
        info = get_video_info(url)
    except Exception as e:
        print(f"❌ Chyba při načítání videa: {e}")
        return

    display_video_info(info)

    # Dostupné kvality
    qualities = get_available_qualities(info)
    if qualities:
        print(f"\n📊 Dostupné kvality: {', '.join([f'{q}p' for q in qualities])}")

    # Výběr formátu
    print("\n" + "-" * 50)
    print("📁 VÝBĚR FORMÁTU:")
    print("-" * 50)
    print("\n  VIDEO formáty:")
    print("    1. MP4   (univerzální, doporučeno)")
    print("    2. WEBM  (menší velikost)")
    print("    3. MKV   (vysoká kvalita)")
    print("\n  AUDIO formáty:")
    print("    4. MP3   (320kbps, univerzální)")
    print("    5. WAV   (bezztrátový)")
    print("    6. M4A   (256kbps, Apple)")
    print("    7. FLAC  (bezztrátový)")
    print("    8. OGG   (open-source)")

    format_input = input("\n👉 Vyberte formát (1-8) [1]: ").strip() or '1'
    format_map = {
        '1': 'mp4', '2': 'webm', '3': 'mkv',
        '4': 'mp3', '5': 'wav', '6': 'm4a', '7': 'flac', '8': 'ogg'
    }
    format_type = format_map.get(format_input, 'mp4')

    # Výběr kvality (pouze pro video)
    quality = None
    if format_type in VIDEO_FORMATS and qualities:
        print("\n" + "-" * 50)
        print("📐 VÝBĚR KVALITY:")
        print("-" * 50)
        for i, q in enumerate(qualities, 1):
            marker = " ⭐" if q == max(qualities) else ""
            print(f"    {i}. {q}p{marker}")
        print(f"    0. Nejlepší dostupná ({max(qualities)}p)")

        q_input = input(f"\n👉 Vyberte kvalitu (0-{len(qualities)}) [0]: ").strip() or '0'
        if q_input != '0':
            try:
                idx = int(q_input) - 1
                if 0 <= idx < len(qualities):
                    quality = qualities[idx]
            except ValueError:
                pass

    # Složka pro uložení
    default_dir = os.path.expanduser("~/Downloads")
    if not os.path.exists(default_dir):
        default_dir = os.getcwd()

    print("\n" + "-" * 50)
    print("📂 UMÍSTĚNÍ SOUBORU:")
    print("-" * 50)
    print(f"    Výchozí složka: {default_dir}")

    output_dir = input("\n👉 Složka pro uložení (Enter = výchozí): ").strip()
    if not output_dir:
        output_dir = default_dir

    # Souhrn a stažení
    print("\n" + "=" * 70)
    print("📥 STAHOVÁNÍ:")
    print("=" * 70)
    print(f"  Video:  {info['title']}")
    print(f"  Formát: {format_type.upper()}")
    if quality:
        print(f"  Kvalita: {quality}p")
    else:
        print(f"  Kvalita: Nejlepší dostupná")
    print(f"  Složka: {output_dir}")
    print("-" * 70)

    try:
        download(url, output_dir, format_type, quality)
        print("\n" + "=" * 70)
        print("✅ STAŽENÍ ÚSPĚŠNĚ DOKONČENO!")
        print("=" * 70)
        print(f"📁 Soubor uložen v: {output_dir}")
    except Exception as e:
        print(f"\n❌ Chyba při stahování: {e}")


def main():
    """Hlavní funkce programu."""
    parser = argparse.ArgumentParser(
        description='YouTube Downloader - Stahování videí a audia z YouTube',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Příklady použití:
  %(prog)s                                    Interaktivní režim
  %(prog)s URL                               Stáhne v nejlepší kvalitě (MP4)
  %(prog)s URL --format mp3                  Stáhne jako MP3 (320kbps)
  %(prog)s URL --format mp4 --quality 1080   Stáhne MP4 v 1080p
  %(prog)s URL --format wav                  Stáhne jako WAV
  %(prog)s URL --list                        Zobrazí dostupné formáty
  %(prog)s URL -o ~/Videa                    Uloží do složky ~/Videa
        '''
    )

    parser.add_argument('url', nargs='?', help='URL YouTube videa')
    parser.add_argument('-f', '--format', choices=ALL_FORMATS, default='mp4',
                        help='Výstupní formát (výchozí: mp4)')
    parser.add_argument('-q', '--quality', type=int,
                        help='Kvalita videa v pixelech (např. 1080, 720, 480)')
    parser.add_argument('-o', '--output', default=None,
                        help='Složka pro uložení (výchozí: ~/Downloads)')
    parser.add_argument('-l', '--list', action='store_true',
                        help='Zobrazí dostupné formáty a kvality')

    args = parser.parse_args()

    # Interaktivní režim pokud není URL
    if not args.url:
        interactive_mode()
        return

    # Zobrazit formáty
    if args.list:
        print("\n⏳ Načítám informace o videu...")
        try:
            info = get_video_info(args.url)
            display_formats_detailed(info)
        except Exception as e:
            print(f"❌ Chyba: {e}")
        return

    # Stažení
    output_dir = args.output or os.path.expanduser("~/Downloads")
    if not os.path.exists(output_dir):
        output_dir = os.getcwd()

    print("\n⏳ Načítám informace o videu...")

    try:
        info = get_video_info(args.url)
        display_video_info(info)

        print(f"\n📥 Stahuji jako {args.format.upper()}", end='')
        if args.quality:
            print(f" v {args.quality}p")
        else:
            print(" (nejlepší kvalita)")
        print(f"📁 Složka: {output_dir}\n")

        download(args.url, output_dir, args.format, args.quality)

        print("\n" + "=" * 70)
        print("✅ STAŽENÍ ÚSPĚŠNĚ DOKONČENO!")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ Chyba: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
