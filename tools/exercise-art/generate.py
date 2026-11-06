"""Draws the missing exercise images with Nano Banana 2 (Gemini 3.1 Flash Image), in the style of
goblet-squat-before/-after.webp, then rewrites NT_ART in web/index.html from exercises.json.
Resumable: images that already exist are skipped. Env: GEMINI_API_KEY, ONLY (comma list of files), MODEL."""
import base64, io, json, os, re, sys, time, urllib.error, urllib.request
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
DIR = os.path.join(ROOT, "web", "pages", "exercises")
HERE = os.path.dirname(__file__)
SETS = json.load(open(os.path.join(HERE, "exercises.json")))["sets"]
KEY = os.environ.get("GEMINI_API_KEY", "").strip()
ONLY = {x.strip() for x in os.environ.get("ONLY", "").split(",") if x.strip()}
API = "https://generativelanguage.googleapis.com/v1beta/"
PRICE_IN, PRICE_OUT = 0.50e-6, 60e-6  # $/token (Gemini API standard price list); a 1K image is ~1120 output tokens = ~$0.067
STYLE = ("Match the reference images exactly: the same bald athletic man with a simple face, the same clean black "
         "line art with light grey shading, lime-green shorts, white trainers, plain white background, the same body "
         "size in the frame and the same thin black floor line at the same height, about 89% of the way down the image, "
         "with feet, hands or knees resting on it. The man faces to the right. Any equipment is "
         "drawn in the same simple line style. Side view unless stated. Square image. No text, labels or arrows.")

def slug(n): return re.sub(r"[^a-z0-9]+", "-", n.lower()).strip("-")
def name(f, part): return f if f == "rest" else f"{f}-{part}"  # the rest screen is plain rest.webp
def path(f, part): return os.path.join(DIR, name(f, part) + ".webp")
def b64(p): return base64.b64encode(open(p, "rb").read()).decode()

def call(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.loads(r.read())

def pick_model():
    if os.environ.get("MODEL"): return os.environ["MODEL"]
    have = {m["name"].split("/")[-1] for m in call(API + "models?pageSize=1000").get("models", [])}
    for m in ("gemini-3.1-flash-image", "gemini-3.1-flash-image-preview"):
        if m in have: return m
    sys.exit("Nano Banana 2 (gemini-3.1-flash-image) is not available to this key. Models: " + ", ".join(sorted(x for x in have if "image" in x)))

cost = {"images": 0, "usd": 0.0}
def draw(model, refs, prompt):
    parts = [{"inline_data": {"mime_type": "image/webp", "data": b64(p)}} for p in refs] + [{"text": prompt}]
    body = {"contents": [{"parts": parts}],
            "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "1:1", "imageSize": "1K"}}}
    for attempt in range(4):
        try:
            out = call(API + f"models/{model}:generateContent", body); break
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf8", "replace")
            open(os.path.join(HERE, "last-error.txt"), "w").write(f"{e.code} {msg[:1500]}\n")
            if re.search(r"free.?tier", msg, re.I) or e.code in (400, 401, 403):
                sys.exit(f"Google said {e.code}: {msg[:600]}")  # stop: no point retrying a billing/key problem
            if e.code in (429, 500, 503) and attempt < 3:
                time.sleep(30); continue
            sys.exit(f"Google said {e.code}: {msg[:600]}")
    u = out.get("usageMetadata", {})
    cost["images"] += 1
    cost["usd"] += u.get("promptTokenCount", 0) * PRICE_IN + (u.get("candidatesTokenCount", 0) + u.get("thoughtsTokenCount", 0)) * PRICE_OUT
    for p in out.get("candidates", [{}])[0].get("content", {}).get("parts", []):
        d = p.get("inlineData") or p.get("inline_data")
        if d and d.get("data"):
            im = Image.open(io.BytesIO(base64.b64decode(d["data"]))).convert("RGB")
            return im.resize((600, 600), Image.LANCZOS)
    raise RuntimeError("no image in reply: " + json.dumps(out)[:400])

FLOOR = 536  # floor-line row in goblet-squat-*.webp at 600px; the model drifts, so we shift to match
def align(im):
    g = im.convert("L"); w, h = g.size; px = g.load()
    dark = [sum(px[x, y] < 110 for x in range(0, w, 2)) for y in range(h // 2, h)]
    r = h // 2 + dark.index(max(dark))
    if max(dark) < w // 6: return im  # no clear floor line found: leave as drawn
    out = Image.new("RGB", (w, h), "white"); out.paste(im, (0, FLOOR - r)); return out

def save(im, p): align(im).save(p, "WEBP", quality=82, method=6)

def generate():
    if not KEY: sys.exit("No API key: add the repository secret VOICE (Google AI Studio key).")
    todo = [s for s in SETS if s.get("before") and (not ONLY or s["file"] in ONLY)
            and (not os.path.exists(path(s["file"], "before")) or (not s.get("hold") and not os.path.exists(path(s["file"], "after"))))]
    print(f"{len(todo)} image sets to draw")
    if not todo: return
    model = pick_model(); print("Model:", model)
    ref = [path("goblet-squat", "before"), path("goblet-squat", "after")]
    for s in todo:
        f, b = s["file"], path(s["file"], "before")
        if not os.path.exists(b):
            save(draw(model, ref, f"The two reference images show the style. {STYLE} Exactly one person in the image. Draw this man: {s['before']}."), b)
            print("  drew", os.path.basename(b))
        if not s.get("hold"):
            a = path(f, "after")
            save(draw(model, ref + [b], f"Images 1 and 2 show the style. Image 3 is the start position of an exercise. {STYLE} "
                      f"Draw the END position, which must look clearly different from image 3 (do not copy its pose): {s['after']}. "
                      f"Keep only the man, camera angle, scale, floor line and equipment the same. Exactly one person in the image."), a)
            print("  drew", os.path.basename(a))

def write_art():
    """NT_ART: exercise name slug -> [before, after] (one file = static hold), only for images that exist."""
    art = {}
    for s in SETS:
        files = [name(s['file'], p) for p in (("before",) if s.get("hold") else ("before", "after"))]
        if all(os.path.exists(os.path.join(DIR, x + ".webp")) for x in files):
            for n in s["names"]: art[slug(n)] = files
    p = os.path.join(ROOT, "web", "index.html"); h = open(p).read()
    h, n = re.subn(r"var NT_ART=\{.*?\};\n", lambda m: "var NT_ART=" + json.dumps(art, separators=(",", ":")) + ";\n", h, count=1)
    assert n == 1, "NT_ART not found"
    open(p, "w").write(h)
    return len(art)

try:
    generate()
finally:
    keys = write_art()
    missing = [s["file"] for s in SETS if not os.path.exists(path(s["file"], "before"))]
    line = f"Drew {cost['images']} images this run, about ${cost['usd']:.2f}. {keys} exercise names have pictures. Still missing: {len(missing)} sets."
    print(line)
    log = os.path.join(HERE, "cost.json")
    total = json.load(open(log)) if os.path.exists(log) else {"images": 0, "usd": 0.0}
    total = {"images": total["images"] + cost["images"], "usd": round(total["usd"] + cost["usd"], 3)}
    json.dump(total, open(log, "w")); print("Total so far:", total)
    with open(os.environ.get("GITHUB_STEP_SUMMARY", os.devnull), "a") as f:
        f.write(f"### Exercise images\n{line}\nTotal so far: {total['images']} images, about ${total['usd']}\n")
