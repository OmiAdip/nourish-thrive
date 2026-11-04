"""Records the Mind tab's lines with Gemini text-to-speech and saves them as MP3s in web/voice/.
Skips lines already recorded, and stops cleanly when the daily free limit is reached,
so you can simply run it again the next day.
Env: GEMINI_API_KEY, VOICE_NAME (default Fola), VOICE_STYLE, TTS_MODEL (optional), MAX_LINES (optional)."""
import base64, json, os, re, subprocess, sys, time, urllib.request, urllib.error

KEY = os.environ.get("GEMINI_API_KEY", "").strip()
VOICE = os.environ.get("VOICE_NAME", "").strip() or "Fola"
STYLE = os.environ.get("VOICE_STYLE", "").strip() or (
    "Read the following in a warm, soft, calm and caring female voice, slowly and gently, "
    "like a kind meditation guide. Read only the words after the colon")
MODEL = os.environ.get("TTS_MODEL", "").strip()
MAX = int(os.environ.get("MAX_LINES", "0") or 0)
DIR = os.path.join(os.path.dirname(__file__), "..", "..", "web", "voice")
API = "https://generativelanguage.googleapis.com/v1beta/"

if not KEY:
    sys.exit("No API key: add the repository secret VOICE (your Google AI Studio key).")

def call(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read())

def pick_model():
    if MODEL:
        return MODEL
    names = []
    url = API + "models?pageSize=1000"
    for m in call(url).get("models", []):
        if "generateContent" in m.get("supportedGenerationMethods", []) and "tts" in m["name"].lower():
            names.append(m["name"].split("/", 1)[1])
    if not names:
        sys.exit("No text-to-speech model is available to this key.")
    print("Speech models on this key:", ", ".join(names))
    # newest flash TTS first (cheapest, best free limits), then any other
    names.sort(key=lambda n: ("flash" not in n, "preview" in n, [-int(x) for x in re.findall(r"\d+", n)]))
    return names[0]

def tts(model, text):
    body = {"contents": [{"parts": [{"text": STYLE + ": " + text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}}}
    out = call(API + "models/" + model + ":generateContent", body)
    for part in out["candidates"][0]["content"]["parts"]:
        inline = part.get("inlineData") or part.get("inline_data")
        if inline:
            rate = re.search(r"rate=(\d+)", inline.get("mimeType", "")) 
            return base64.b64decode(inline["data"]), int(rate.group(1)) if rate else 24000
    raise RuntimeError("no audio in reply: " + json.dumps(out)[:300])

def to_mp3(pcm, rate, path):
    # trim silence at both ends, gentle fades, mono 64k MP3 (small and plays everywhere)
    flt = ("silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
           "silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
           "afade=t=in:d=0.02,areverse,afade=t=in:d=0.08,areverse")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(rate), "-ac", "1", "-i", "-",
                    "-af", flt, "-ac", "1", "-b:a", "64k", path], input=pcm, check=True)

lines = json.load(open(os.path.join(DIR, "lines.json")))
mpath = os.path.join(DIR, "manifest.json")
manifest = json.load(open(mpath))
todo = [l for l in lines if not manifest.get(l["key"])]
print(f"{len(lines)} lines, {len(lines) - len(todo)} recorded, {len(todo)} to go. Voice: {VOICE}")
if not todo:
    sys.exit(0)
model = pick_model()
print("Using model:", model)

done = 0
for line in todo:
    if MAX and done >= MAX:
        break
    for attempt in range(4):
        try:
            pcm, rate = tts(model, line["text"])
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf8", "replace")
            if e.code == 429:
                if re.search(r"per ?day|PerDay|daily", msg, re.I) or attempt == 3:
                    print("Daily limit reached. Run this again tomorrow to carry on.")
                    pcm = None; break
                wait = re.search(r'"retryDelay":\s*"(\d+)', msg)
                time.sleep(int(wait.group(1)) + 2 if wait else 35)
                continue
            if e.code in (500, 503) and attempt < 3:
                time.sleep(10); continue
            print("Google said:", e.code, msg[:800])
            if "voice" in msg.lower():
                print(f'The voice name "{VOICE}" was not accepted. Check the exact name in AI Studio.')
            pcm = None; attempt = 99; break
    else:
        pcm = None
    if not pcm:
        break
    name = line["key"] + ".mp3"
    to_mp3(pcm, rate, os.path.join(DIR, name))
    manifest[line["key"]] = name
    json.dump(manifest, open(mpath, "w"), indent=1); open(mpath, "a").write("\n")
    done += 1
    print(f"  [{done}] {line['text'][:70]}")

left = sum(1 for l in lines if not manifest.get(l["key"]))
print(f"Recorded {done} this run. {left} still to go.")
with open(os.environ.get("GITHUB_STEP_SUMMARY", os.devnull), "a") as s:
    s.write(f"### Voice ({VOICE})\nRecorded **{done}** lines this run. **{left}** still to go.\n")
