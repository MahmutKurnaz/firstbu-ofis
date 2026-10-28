#!/usr/bin/env python3
"""Konsept görselleri: docs/karakterler.md'deki kadronun her karakteri için 2 öneri (Meshy text-to-image,
nano-banana-2, A-poz; tanesi 6 kredi). Standart Python yeter. Meshy anahtarı macOS Anahtar Zinciri'nden okunur
(`security add-generic-password -a "$USER" -s meshy-api -w`), hiçbir yere yazılmaz.

    python3 blender/scripts/meshy_concepts.py submit <klasör> [anahtar ...]   # istek gönderir, <klasör>/tasks.json'a yazar
    python3 blender/scripts/meshy_concepts.py collect <klasör>                # biten görselleri <klasör>/<anahtar>_<0|1>.png indirir
    python3 blender/scripts/meshy_concepts.py list                            # karakterleri sıralar

Anahtar verilmezse hepsi gönderilir. Her `submit` krediyi harcar: önce fiyatı yaz, onay al (docs/KAYNAKLAR.md).
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

API = "https://api.meshy.ai/openapi/v1/text-to-image"

STYLE = (
    "Full-body character concept for a 3D game, front view, neutral A-pose with the arms slightly away from the body, "
    "hands empty, one single character centered, plain pure white background, no text, no shadow on the ground. "
    "An original premium stylized anthropomorphic {animal} standing upright on two legs, about 4 heads tall, {body}. "
    "{outfit}. High-end clean stylized 3D render, soft studio lighting, smooth simple shapes suitable for 3D modelling, "
    "no tiny details, not resembling any existing film or game character."
)

# anahtar: (hayvan, beden ve yüz, kıyafet ve vücutta taşınan eşya)
ROLLER = {
    "kizil-panda": ("red panda", "slim agile build, big bushy ringed tail, white face markings, large expressive amber eyes, rusty-red fur",
                    "Wearing a gold-trimmed waistcoat over a cream shirt with a small bow tie, a small leather notebook tucked in the waistcoat pocket and a fountain pen behind one ear; accent color gold"),
    "mirket": ("meerkat", "small slender build standing very upright, alert wide eyes with dark eye patches, sandy fur",
               "Wearing an explorer vest with many pockets over a khaki shirt, a wide-brim safari hat, a green scarf and binoculars hanging on a strap around the neck; accent color green"),
    "susamuru": ("sea otter", "sleek lean build, round face with whiskers, cool laid-back expression, dark brown fur with a cream face",
                 "Wearing a coral knit beanie, an oversized coral sweater, round colorful tinted glasses and a strip of color swatches hanging from the belt; accent color coral"),
    "tilki": ("fox", "slender athletic build, fluffy tail with a white tip, sharp clever eyes, orange fur and a white chest",
              "Wearing a beige linen blazer with rolled sleeves over a white shirt, a pencil tucked behind one ear and a small color-palette pin on the lapel; accent color coral"),
    "koala": ("koala", "chunky round build, big round fluffy ears, sleepy half-closed eyes, grey fur, large dark nose",
              "Wearing a soft oatmeal cardigan over a coral t-shirt and a tablet satchel bag with a strap across the shoulder; accent color coral"),
    "kaplan": ("tiger", "tall broad powerful build, bold black stripes, calm confident look, orange fur",
               "Wearing a navy-blue hooded sweatshirt with the hood down, studio headphones around the neck, dark jeans and sneakers; accent color blue"),
    "panda": ("giant panda", "large soft sturdy build, round face, black eye patches, gentle expression",
              "Wearing a blue hoodie with a mechanical keyboard case strapped on the back like a backpack; accent color blue"),
    "tavsan": ("rabbit", "lean tall build, long upright ears, sharp curious eyes, grey-white fur",
               "Wearing a grey-purple detective trench coat with the collar up, a detective cap, and a brass magnifying glass hanging on a cord around the neck; accent color purple"),
    "sincap": ("squirrel", "small energetic build, huge fluffy curled tail, bright eyes, reddish-brown fur",
               "Wearing a short canvas work apron over a purple shirt, a tool belt with a wrench and a screwdriver, and safety goggles pushed up on the forehead; accent color purple"),
    "ceylan": ("gazelle", "slender elegant build, long neck, small curved horns, large gentle eyes, tan fur with a white belly",
               "Wearing a crisp white laboratory coat with a teal collar and cuffs and a clipboard hanging from the belt by a clip; accent color teal"),
    "geyik": ("deer", "tall noble build, branching antlers, calm intelligent eyes, brown fur with light spots",
              "Wearing a white laboratory coat with teal trim, teal gloves tucked in a pocket, and protective safety goggles pushed up on the head between the antlers; accent color teal"),
    "penguen": ("penguin", "stocky build, flipper arms shaped like arms with small hands, black and white plumage, orange beak, determined expression",
                "Wearing a grey security vest with reflective stripes, a peaked security cap and a flashlight clipped to the belt; accent color grey"),
    "baykus": ("owl", "wise rounded build, big round golden eyes, feathered ear tufts, wing-arms shaped like arms with small feathered hands, brown speckled plumage",
               "Wearing an explorer's cape over a grey vest, half-moon reading glasses and a rolled map tube slung across the back; accent color grey"),
}

YEDEK = {
    "kurt": ("wolf", "tall lean powerful build, grey fur, piercing yellow eyes",
             "Wearing a black hooded jacket, a headset with a microphone around the neck and dark cargo pants"),
    "ayi": ("brown bear", "large heavy sturdy build, warm kind eyes",
            "Wearing work overalls over a flannel shirt, a yellow hard hat and a wrench hanging from the belt"),
    "fil": ("elephant", "large soft build, big ears, gentle wise eyes, grey skin",
            "Wearing an archivist's waistcoat with a tie and a document satchel on the back"),
    "zurafa": ("giraffe", "very tall slender build, long neck, spotted coat, small horns, calm eyes",
               "Wearing a long knitted scarf, a light vest and binoculars hanging around the neck"),
    "kedi": ("cat", "slim graceful build, green almond eyes, sleek grey striped fur",
             "Wearing a stylish coat with a scarf, a small shoulder bag and a pen clipped to the collar"),
    "golden": ("golden retriever dog", "friendly strong build, floppy ears, warm happy face, golden fur",
               "Wearing a light blue vest with a name badge on a lanyard"),
    "kunduz": ("beaver", "sturdy compact build, buck teeth, flat paddle tail, brown fur",
               "Wearing an orange hard hat, a work vest, a hammer hanging from the belt and a wood-grain satchel on the back"),
    "kartal": ("eagle", "athletic build, sharp golden eyes, white head feathers, wing-arms shaped like arms with small feathered hands",
               "Wearing a brown leather aviator jacket and aviator goggles pushed up on the forehead"),
    "bukalemun": ("chameleon", "slender build, large independently turning eyes, textured green skin, curled tail",
                  "Wearing a multi-colored jacket with a shifting rainbow gradient and small phones and gadgets hanging from the belt"),
    "kanguru": ("kangaroo", "tall powerful build, long strong legs, large ears, a pouch on the belly, tan fur",
                "Wearing a delivery courier jacket and a courier cap with a package tucked in the belly pouch"),
}

NPC = {
    "npc-barista": ("raccoon", "agile medium build, black mask markings, ringed tail",
                    "Wearing a barista apron over a rolled-sleeve shirt, a towel over the shoulder and a small coffee cup badge"),
    "npc-bekci": ("bulldog", "stocky broad build, wrinkled face, serious yet kind eyes",
                  "Wearing a dark blue security guard uniform with a cap and a whistle on a lanyard"),
    "npc-cicekci": ("hedgehog", "small round build, spiky back, soft pink nose",
                    "Wearing a straw sun hat and a green gardening apron with a pocket of flowers"),
    "npc-kurye": ("cheetah", "very lean fast build, spotted fur, dark tear marks, focused look",
                  "Wearing a cycling helmet, a bright courier bag across the chest and a light athletic outfit"),
    "npc-dede": ("tortoise", "small hunched wise build, a shell on the back, wrinkled friendly face",
                 "Wearing a knitted vest over a shirt, tiny round glasses and a walking cane hooked over the arm"),
    "npc-rehber": ("zebra", "tall slim build, black and white stripes, cheerful face",
                   "Wearing a tour guide cap with a small flag pinned to it, a lanyard guide card and a light vest"),
}

KADRO = {**ROLLER, **YEDEK, **NPC}


def prompt(key):
    animal, body, outfit = KADRO[key]
    return STYLE.format(animal=animal, body=body, outfit=outfit)


def api_key():
    out = subprocess.run(["security", "find-generic-password", "-a", os.environ.get("USER", ""), "-s", "meshy-api", "-w"], capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit("Meshy anahtarı Anahtar Zinciri'nde yok (servis: meshy-api)")
    return out.stdout.strip()


def call(method, url, key, body=None, tries=6):
    for i in range(tries):
        req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body else None,
                                     headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and i < tries - 1:
                time.sleep(5 * (i + 1))
                continue
            sys.exit(f"{e.code} {e.read().decode()[:300]}")


def submit(folder, keys):
    os.makedirs(folder, exist_ok=True)
    state_file = os.path.join(folder, "tasks.json")
    state = json.load(open(state_file)) if os.path.exists(state_file) else {}
    key = api_key()
    for k in keys:
        if k not in KADRO:
            sys.exit(f"bilinmeyen karakter: {k}")
        if k in state:
            print(f"  {k}: zaten gönderilmiş, atlandı")
            continue
        ids = []
        for _ in range(2):
            r = call("POST", API, key, {"ai_model": "nano-banana-2", "prompt": prompt(k), "pose_mode": "a-pose"})
            ids.append(r["result"])
            time.sleep(0.4)
        state[k] = ids
        json.dump(state, open(state_file, "w"), indent=1)
        print(f"  {k}: {ids}")


def collect(folder):
    state = json.load(open(os.path.join(folder, "tasks.json")))
    key = api_key()
    pending = 0
    for k, ids in state.items():
        for i, tid in enumerate(ids):
            path = os.path.join(folder, f"{k}_{i}.png")
            if os.path.exists(path):
                continue
            d = call("GET", f"{API}/{tid}", key)
            if d["status"] == "SUCCEEDED":
                urllib.request.urlretrieve(d["image_urls"][0], path)
                print("  indirildi", os.path.basename(path))
            elif d["status"] in ("FAILED", "CANCELED"):
                print("  BAŞARISIZ", k, i, (d.get("task_error") or {}).get("message", ""))
            else:
                pending += 1
    print(f"bekleyen: {pending}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "list":
        for k in KADRO:
            print(k, "-", KADRO[k][0])
    elif cmd == "submit" and len(sys.argv) > 2:
        submit(sys.argv[2], sys.argv[3:] or list(KADRO))
    elif cmd == "collect" and len(sys.argv) > 2:
        collect(sys.argv[2])
    else:
        sys.exit(__doc__)
