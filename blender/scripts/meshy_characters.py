#!/usr/bin/env python3
"""Roll characters (docs/karakterler.md) from their concept pictures: 3D, rig and clips, each step a paid Meshy call.
Same Keychain key and safe-retry rules as meshy_props.py. State is kept in <folder>/chars.json.

    python3 blender/scripts/meshy_characters.py models <folder> <key>=<concept png> ...   # image-to-3D, textured (30 each)
    python3 blender/scripts/meshy_characters.py rig    <folder>                            # rigging, at the height in HEIGHT (5 each)
    python3 blender/scripts/meshy_characters.py anim   <folder>                            # the clips in CLIPS + the character's own (3 each, one file)
    python3 blender/scripts/meshy_characters.py fetch  <folder>                            # downloads what's finished: <key>_base.glb, <key>_rig.glb, <key>_anims.glb
"""
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from meshy_props import call, data_uri, key, load, save  # noqa: E402

# The clips every character gets (Meshy's library ids): idle, walk, sit at a desk, drink.
CLIPS = [0, 30, 33, 343]
# Each one's own: what it does when its work starts or waits (docs/karakterler.md).
OWN = {"kizil-panda": 47, "susamuru": 11, "kaplan": 25, "tavsan": 2, "geyik": 2}
HEIGHT = {"kizil-panda": 1.55, "susamuru": 1.65, "kaplan": 1.95, "tavsan": 1.7, "geyik": 1.95}


def models(folder, picks):
    state, k = load(folder, "chars.json"), key()
    for pick in picks:
        name, png = pick.split("=")
        if name in state:
            print(f"  {name}: zaten gönderilmiş")
            continue
        r = call("POST", "/image-to-3d", k, {"image_url": data_uri(png), "ai_model": "meshy-7.1", "should_texture": True, "enable_pbr": False,
                                             "pose_mode": "a-pose", "topology": "triangle", "target_polycount": 12000, "should_remesh": True})
        state[name] = {"model": r["result"]}
        save(folder, "chars.json", state)
        print(f"  {name}: {r['result']}")
        time.sleep(0.4)


def step(folder, name, field, path, body):
    state, k = load(folder, "chars.json"), key()
    for n, it in state.items():
        if field in it or "model" not in it:
            continue
        r = call("POST", path, k, body(n, it))
        it[field] = r["result"]
        save(folder, "chars.json", state)
        print(f"  {n} {name}: {r['result']}")
        time.sleep(0.4)


def fetch(folder):
    state, k = load(folder, "chars.json"), key()
    pending = 0
    for n, it in state.items():
        for field, path, out in (("model", "/image-to-3d", "base"), ("rig", "/rigging", "rig"), ("anim", "/animations", "anims")):
            if field not in it:
                continue
            dest = os.path.join(folder, f"{n}_{out}.glb")
            if os.path.exists(dest):
                continue
            d = call("GET", f"{path}/{it[field]}", k)
            if d["status"] == "SUCCEEDED":
                urls = d.get("model_urls") or d.get("result") or {}
                url = urls.get("glb") or urls.get("rigged_character_glb_url") or urls.get("animation_glb_url")
                if field == "rig":
                    url = (d.get("result") or {}).get("rigged_character_glb_url") or url
                if field == "anim":
                    url = (d.get("result") or {}).get("animation_glb_url") or url
                urllib.request.urlretrieve(url, dest)
                print("  indirildi", os.path.basename(dest))
            elif d["status"] in ("FAILED", "CANCELED"):
                print("  BAŞARISIZ", n, field, (d.get("task_error") or {}).get("message", ""))
            else:
                pending += 1
    print(f"bekleyen: {pending}")


if __name__ == "__main__":
    c = sys.argv[1] if len(sys.argv) > 1 else ""
    if c == "models" and len(sys.argv) > 3:
        models(sys.argv[2], sys.argv[3:])
    elif c == "rig" and len(sys.argv) > 2:
        step(sys.argv[2], "rig", "rig", "/rigging", lambda n, it: {"input_task_id": it["model"], "height_meters": HEIGHT[n]})
    elif c == "anim" and len(sys.argv) > 2:
        step(sys.argv[2], "anim", "anim", "/animations", lambda n, it: {"rig_task_id": it["rig"], "action_ids": CLIPS + [OWN[n]]})
    elif c == "fetch" and len(sys.argv) > 2:
        fetch(sys.argv[2])
    else:
        sys.exit(__doc__)
