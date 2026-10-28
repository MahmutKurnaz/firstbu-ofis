#!/usr/bin/env python3
"""Dünyanın eşyaları (ağaç, bank, kahve makinesi, masalar, koltuklar…): ekran görüntüsünden ya da yazıdan Meshy'ye
ürettirilir. Standart Python yeter. Anahtar macOS Anahtar Zinciri'nden okunur (servis: meshy-api), hiçbir yere yazılmaz.

    python3 blender/scripts/meshy_props.py list
    python3 blender/scripts/meshy_props.py images  <klasör> [anahtar ...]   # 2 görsel/eşya (referanslı: image-to-image, 6 kredi; yazılı: text-to-image, 6)
    python3 blender/scripts/meshy_props.py collect <klasör>                 # biten görselleri <anahtar>_<0|1>.png olarak indirir
    python3 blender/scripts/meshy_props.py models  <klasör> <anahtar>=<0|1> ...   # seçilen görselden 3D (dokulu, 30 kredi)
    python3 blender/scripts/meshy_props.py fetch   <klasör>                 # biten 3D'leri <anahtar>.glb olarak indirir

Referans ekran görüntüleri <klasör>/refs/<anahtar>.png (kare). Her adım krediyi harcar: önce fiyatı yaz, onay al.
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

BASE = "https://api.meshy.ai/openapi/v1"

STYLE = (
    "A single {thing}, isolated on a plain pure white background, centered, three-quarter front view, nothing else in the picture, "
    "no text, no ground shadow. Premium stylized 3D game asset, high-end clean stylized render, soft studio lighting, smooth simple "
    "shapes suitable for 3D modelling, no tiny details. {detail}"
)
REMAKE = (
    "Redraw ONLY the {thing} in the center of the reference picture as a premium version of itself, keeping what it is and its "
    "proportions, but crafted and beautiful. Isolated on a plain pure white background, three-quarter front view, nothing else in "
    "the picture (remove the street, buildings, people and any text). Premium stylized 3D game asset, high-end clean stylized "
    "render, soft studio lighting, smooth simple shapes suitable for 3D modelling, no tiny details. {detail}"
)

# anahtar: (ne, ayrıntı, referans var mı)
ESYA = {
    "agac": ("street tree in a round planter bed", "Lush layered green canopy on a slim trunk, a low round stone curb with dark soil and a few small plants around the base.", True),
    "lamba": ("street lamp", "Slim matte-black post with a gently curved arm, brass details and a warm glowing globe lantern.", True),
    "bank": ("park bench", "Slatted oak seat and back with a matte-black cast metal frame and brass screws.", True),
    "kafe-masasi": ("cafe bistro table set", "A round marble-top table on a black pedestal, three wooden stools, and a large striped canvas parasol over it.", True),
    "kahve-tezgahi": ("cafe coffee bar counter", "Oak panelled front, white marble top, a chrome espresso machine, a stack of cups and a small menu board.", True),
    "kahve-makinesi": ("standing coffee machine", "Modern matte-graphite coffee machine kiosk with brass accents, a glowing amber display and a cup tray.", True),
    "saksi": ("long rectangular stone planter", "Pale stone planter box filled with clipped round green shrubs.", True),
    "ofis-masa": ("modern office desk", "White top on slim oak and black metal legs, a small shelf and a cable tray.", True),
    "cicek-saksi": ("large round flower pot", "A big glazed ceramic pot overflowing with colorful flowers and green leaves.", False),
    "ofis-sandalye": ("ergonomic office chair", "Charcoal mesh back, padded seat, chrome five-star base with wheels, adjustable arms.", False),
    "yonetici-masa": ("luxury executive desk", "Dark walnut, a leather inlay top with brass edge trim, a side drawer pedestal, no objects on top.", False),
    "yonetici-koltuk": ("executive high-back chair", "Black leather with brass studs, padded armrests, chrome base.", False),
    "kanepe": ("premium three-seat sofa", "Cognac brown leather with slim brass legs and two small cushions.", False),
    "kitaplik": ("tall bookcase", "Walnut wood filled with books and a few small decor objects, brass edge details.", False),
    "fikus": ("potted fiddle-leaf fig plant", "Big glossy leaves, white ceramic pot on a small stand.", False),
    "toplanti-sandalye": ("conference room chair", "Black leather with chrome armrests and a slim base, modern.", False),
}


def key():
    out = subprocess.run(["security", "find-generic-password", "-a", os.environ.get("USER", ""), "-s", "meshy-api", "-w"], capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit("Meshy anahtarı Anahtar Zinciri'nde yok (servis: meshy-api)")
    return out.stdout.strip()


def call(method, path, k, body=None, tries=6):
    for i in range(tries):
        req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body else None,
                                     headers={"Authorization": f"Bearer {k}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and i < tries - 1:
                time.sleep(5 * (i + 1))
                continue
            sys.exit(f"{e.code} {e.read().decode()[:300]}")
        except (urllib.error.URLError, TimeoutError):
            # A read (GET) is safe to ask again. A create (POST) may have gone through: stop and look at the balance first.
            if method == "GET" and i < tries - 1:
                time.sleep(3 * (i + 1))
                continue
            sys.exit(f"ağ hatası ({method} {path}): bakiyeye ve <klasör>/*.json'a bak, gönderilmiş olabilir")


def data_uri(path):
    return "data:image/png;base64," + base64.b64encode(open(path, "rb").read()).decode()


def load(folder, name):
    p = os.path.join(folder, name)
    return json.load(open(p)) if os.path.exists(p) else {}


def save(folder, name, data):
    json.dump(data, open(os.path.join(folder, name), "w"), indent=1)


def images(folder, keys):
    os.makedirs(folder, exist_ok=True)
    state = load(folder, "images.json")
    k = key()
    for a in keys:
        thing, detail, has_ref = ESYA[a]
        ref = os.path.join(folder, "refs", a + ".png")
        if a in state:
            print(f"  {a}: zaten gönderilmiş")
            continue
        ids = []
        for _ in range(2):
            if has_ref and os.path.exists(ref):
                r = call("POST", "/image-to-image", k, {"ai_model": "nano-banana-2", "prompt": REMAKE.format(thing=thing, detail=detail), "reference_image_urls": [data_uri(ref)]})
            else:
                r = call("POST", "/text-to-image", k, {"ai_model": "nano-banana-2", "prompt": STYLE.format(thing=thing, detail=detail), "aspect_ratio": "1:1"})
            ids.append({"id": r["result"], "kind": "i2i" if has_ref and os.path.exists(ref) else "t2i"})
            time.sleep(0.4)
        state[a] = ids
        save(folder, "images.json", state)
        print(f"  {a}: {[i['id'] for i in ids]}")


def collect(folder):
    state = load(folder, "images.json")
    k = key()
    pending = 0
    for a, items in state.items():
        for n, it in enumerate(items):
            path = os.path.join(folder, f"{a}_{n}.png")
            if os.path.exists(path):
                continue
            d = call("GET", f"/{'image-to-image' if it['kind'] == 'i2i' else 'text-to-image'}/{it['id']}", k)
            if d["status"] == "SUCCEEDED":
                urllib.request.urlretrieve(d["image_urls"][0], path)
                print("  indirildi", os.path.basename(path))
            elif d["status"] in ("FAILED", "CANCELED"):
                print("  BAŞARISIZ", a, n, (d.get("task_error") or {}).get("message", ""))
            else:
                pending += 1
    print(f"bekleyen: {pending}")


def models(folder, picks):
    state = load(folder, "models.json")
    k = key()
    for pick in picks:
        a, n = pick.split("=")
        if a in state:
            print(f"  {a}: zaten gönderilmiş")
            continue
        img = os.path.join(folder, f"{a}_{n}.png")
        r = call("POST", "/image-to-3d", k, {"image_url": data_uri(img), "ai_model": "meshy-7.1", "should_texture": True, "enable_pbr": False,
                                             "topology": "triangle", "target_polycount": 8000, "should_remesh": True})
        state[a] = {"id": r["result"], "pick": int(n)}
        save(folder, "models.json", state)
        print(f"  {a}: {r['result']}")
        time.sleep(0.4)


def fetch(folder):
    state = load(folder, "models.json")
    k = key()
    pending = 0
    for a, it in state.items():
        path = os.path.join(folder, a + ".glb")
        if os.path.exists(path):
            continue
        d = call("GET", f"/image-to-3d/{it['id']}", k)
        if d["status"] == "SUCCEEDED":
            urllib.request.urlretrieve(d["model_urls"]["glb"], path)
            print("  indirildi", a + ".glb")
        elif d["status"] in ("FAILED", "CANCELED"):
            print("  BAŞARISIZ", a, (d.get("task_error") or {}).get("message", ""))
        else:
            pending += 1
    print(f"bekleyen: {pending}")


if __name__ == "__main__":
    c = sys.argv[1] if len(sys.argv) > 1 else ""
    if c == "list":
        for a, v in ESYA.items():
            print(a, "-", v[0], "(referanslı)" if v[2] else "")
    elif c == "images" and len(sys.argv) > 2:
        images(sys.argv[2], sys.argv[3:] or list(ESYA))
    elif c == "collect" and len(sys.argv) > 2:
        collect(sys.argv[2])
    elif c == "models" and len(sys.argv) > 3:
        models(sys.argv[2], sys.argv[3:])
    elif c == "fetch" and len(sys.argv) > 2:
        fetch(sys.argv[2])
    else:
        sys.exit(__doc__)
