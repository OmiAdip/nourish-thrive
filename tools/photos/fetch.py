"""Finds free, openly licensed photos for the recipe library.

Reads queries.json, searches Openverse (commercial-use licences) and Wikimedia Commons,
downloads up to 3 candidates per recipe, crops each to 1200x900 and writes:
  out/<id>-<n>.jpg, out/credits.json, out/sheet-<k>.jpg (contact sheets for review).
picks.json (optional) chooses a candidate per recipe: {"recipe-id": 1}. Default is 0.
"""
import io, json, os, re, time, urllib.parse, urllib.request
from PIL import Image, ImageDraw, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
UA = 'DropASize-recipe-photos/1.0 (https://github.com/OmiAdip/nourish-thrive)'
ONLY = set(filter(None, os.environ.get('ONLY', '').split(',')))

def get(url, timeout=12, limit=9_000_000):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read(limit + 1)
    if len(data) > limit:
        raise ValueError('too big')
    return data

def openverse(q):
    url = 'https://api.openverse.org/v1/images/?' + urllib.parse.urlencode({
        'q': q, 'license_type': 'commercial', 'mature': 'false', 'page_size': 20, 'aspect_ratio': 'wide'})
    try:
        d = json.loads(get(url))
    except Exception as e:
        print('openverse failed', q, e); return []
    out = []
    for x in d.get('results', []):
        lic = (x.get('license') or '').upper() + (' ' + x['license_version'] if x.get('license_version') else '')
        out.append({'src': x.get('url'), 'w': x.get('width') or 0, 'credit': f"Photo: {x.get('creator') or 'Unknown'} · {lic} · {x.get('source') or 'Openverse'}",
                    'link': x.get('foreign_landing_url'), 'title': x.get('title') or ''})
    out.sort(key=lambda c: -(min(c['w'] or 0, 2000)))
    return out

def commons(q):
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({
        'action': 'query', 'generator': 'search', 'gsrsearch': q + ' filetype:bitmap', 'gsrnamespace': 6, 'gsrlimit': 15,
        'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': 1400, 'format': 'json'})
    try:
        d = json.loads(get(url))
    except Exception as e:
        print('commons failed', q, e); return []
    out = []
    for p in (d.get('query') or {}).get('pages', {}).values():
        ii = (p.get('imageinfo') or [{}])[0]; m = ii.get('extmetadata') or {}
        lic = (m.get('LicenseShortName') or {}).get('value', '')
        if not re.search(r'cc|public domain|pd', lic, re.I) or re.search(r'nc|nd', lic, re.I):
            continue
        who = re.sub(r'<[^>]+>', '', (m.get('Artist') or {}).get('value', 'Unknown')).strip()[:60]
        out.append({'src': ii.get('thumburl') or ii.get('url'), 'w': ii.get('thumbwidth') or 0, 'credit': f'Photo: {who} · {lic} · Wikimedia Commons',
                    'link': ii.get('descriptionurl'), 'title': p.get('title', '')})
    return out

def crop(data):
    im = Image.open(io.BytesIO(data)); im = ImageOps.exif_transpose(im).convert('RGB')
    if im.width < 500 or im.height < 350:
        raise ValueError('too small')
    return ImageOps.fit(im, (1200, 900), Image.LANCZOS, centering=(0.5, 0.5))

def main():
    queries = json.load(open(os.path.join(HERE, 'queries.json')))
    path = os.path.join(OUT, 'credits.json')
    credits = json.load(open(path)) if os.path.exists(path) else {}
    todo = [q for q in queries if not ONLY or q['id'] in ONLY]
    found = {}
    for item in todo:                       # searches one by one (API rate limits)
        cands = openverse(item['q']); time.sleep(1.5)
        if len(cands) < 4:
            cands += commons(item['q'])
        found[item['id']] = cands[:6]
        print('searched', item['id'], len(cands), flush=True)
    def fetch_one(rid):
        got = []
        for c in found[rid]:
            if len(got) >= 3: break
            try:
                img = crop(get(c['src']))
            except Exception:
                continue
            img.save(os.path.join(OUT, f'{rid}-{len(got)}.jpg'), 'JPEG', quality=82, optimize=True, progressive=True)
            got.append({k: c[k] for k in ('credit', 'link', 'title')})
        return rid, got
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(8) as ex:
        for rid, got in ex.map(fetch_one, list(found)):
            credits[rid] = got
            print('downloaded', rid, len(got), flush=True)
    json.dump(credits, open(path, 'w'), indent=1, ensure_ascii=False)
    # contact sheets: 12 recipes per sheet, 3 candidates each
    ids = [q['id'] for q in queries]
    for k in range(0, len(ids), 12):
        part = ids[k:k + 12]
        sheet = Image.new('RGB', (3 * 260 + 220, len(part) * 200), 'white'); dr = ImageDraw.Draw(sheet)
        for r, rid in enumerate(part):
            dr.text((8, r * 200 + 90), rid[:30], fill='black')
            for n in range(3):
                f = os.path.join(OUT, f'{rid}-{n}.jpg')
                if os.path.exists(f):
                    t = Image.open(f).resize((253, 190)); sheet.paste(t, (220 + n * 260, r * 200 + 5))
                    dr.text((224 + n * 260, r * 200 + 8), str(n), fill='white')
        sheet.save(os.path.join(OUT, f'sheet-{k // 12}.jpg'), 'JPEG', quality=70)

if __name__ == '__main__':
    main()
