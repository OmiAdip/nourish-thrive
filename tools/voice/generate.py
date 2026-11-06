"""Records the Mind tab's and workout player's lines with Gemini text-to-speech and saves them as MP3s in web/voice/.
Skips lines already recorded, and stops cleanly when the daily free limit is reached,
so you can simply run it again the next day.
Env: GEMINI_API_KEY, VOICE_NAME (default Fola), VOICE_STYLE, TTS_MODEL (default gemini-3.8-flash-tts), MAX_LINES."""
import base64, json, os, re, subprocess, sys, time, urllib.parse, urllib.request, urllib.error

KEY = os.environ.get("GEMINI_API_KEY", "").strip()
VOICE = os.environ.get("VOICE_NAME", "").strip() or "Fola"
# Gemini 3.8 TTS reads the text word for word; delivery goes in a short separate style field.
STYLE = os.environ.get("VOICE_STYLE", "").strip() or "calm, soft and warm, speaking slowly and gently"
# Workout lines (style "coach" in lines.json): same voice, energetic delivery.
COACH = "friendly, upbeat and excited, like an encouraging fitness coach, bright and energetic"
MODEL = os.environ.get("TTS_MODEL", "").strip() or "gemini-3.8-flash-tts"
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

def resolve_voice(name):
    """'Fola' may be a display name from the Voice Library: look up the id to send."""
    if name.startswith("voice"):
        return name
    try:
        out = call(API + "voices?" + urllib.parse.urlencode({"search": name, "page_size": 100}))
        for v in out.get("voices", []):
            if (v.get("display_name") or v.get("displayName") or "").strip().lower() == name.lower():
                vid = v.get("id") or v.get("name", "").split("/")[-1]
                print(f"Voice '{name}': id {vid} ({v.get('language_code') or v.get('languageCode')}, "
                      f"{v.get('accent')}, {v.get('gender')}) {v.get('description', '')[:80]}")
                return vid
        print(f"Voice '{name}' not found in the library search; sending the name as given.")
    except Exception as e:
        print("Voice lookup skipped:", e)
    return name

def tts(voice, text, style):
    body = {"model": MODEL,
            "input": [{"type": "user_input", "content": [{"type": "text", "text": text,
                       "annotations": [{"type": "speech_metadata", "style": style}]}]}],
            "response_format": {"type": "audio", "mime_type": "audio/l16", "sample_rate": 24000},
            "generation_config": {"speech_config": [{"voice": voice}]}}
    out = call(API + "interactions", body)
    data = None
    for step in out.get("steps", []):
        for c in step.get("content", []) or []:
            if c.get("type") == "audio" and c.get("data"):
                data = c["data"]
    if not data:
        raise RuntimeError("no audio in reply: " + json.dumps(out)[:400])
    return base64.b64decode(data), 24000

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
voice = resolve_voice(VOICE)
print("Using model:", MODEL, "| style:", STYLE)

done = 0
for line in todo:
    if MAX and done >= MAX:
        break
    for attempt in range(4):
        try:
            pcm, rate = tts(voice, line["text"], COACH if line.get("style") == "coach" else STYLE)
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf8", "replace")
            open(os.path.join(DIR, "last-error.txt"), "w").write(f"{e.code} {msg[:1500]}\n")  # shortcut: debug aid, logs are hard to reach
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
