"""The street's CC0 drafts (world/cadde/): pieces of Kay Lousberg's KayKit packs, City Builder Bits,
Furniture Bits and Restaurant Bits (Creative Commons Zero, www.kaylousberg.com), picked out and
exported as src/client/models/kaykit-city.glb, kaykit-furniture.glb and kaykit-cafe.glb. Unlike the
office's own models these keep their materials and their texture atlas (one per pack), so the
code doesn't paint them (see world/cadde/kaykit.ts); they're drafts, until our own models (F4).

The packs aren't in this repository: clone them from github.com/KayKit-Game-Assets (only their
Assets/gltf folders are needed) and hand the folder they're in to the script:

    blender --background --factory-startup --python blender/scripts/build_kaykit.py -- --src <dir>

where <dir> holds City-Builder-Bits/, Furniture-Bits/ and Restaurant-Bits/. Each piece is a root of
its own, named after its file (`building_A`, `couch_pillows`…), standing on the floor at the origin;
those names are a contract with world/cadde/kaykit.ts and tests/kaykit-model.test.ts. It prints
each piece's size, in meters, as the packs have it.
"""
import glob
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import aokit  # noqa: E402

PACKS = {
    "kaykit-city": ("City-Builder-Bits", [
        *(f"building_{c}_withoutBase" for c in "ABCDEFGH"),
        "bench", "bush", "streetlight", "firehydrant", "trash_A", "dumpster",
        "car_sedan", "car_taxi", "car_hatchback",
    ]),
    "kaykit-furniture": ("Furniture-Bits", [
        "couch_pillows", "armchair_pillows", "table_low", "shelf_B_large_decorated", "cabinet_medium_decorated",
        "lamp_standing", "cactus_medium_A", "cactus_small_A", "pictureframe_large_A", "pictureframe_large_B",
        "rug_rectangle_stripes_A", "book_set", "chair_A",
    ]),
    "kaykit-cafe": ("Restaurant-Bits", [
        "table_round_A_small_decorated", "chair_A", "chair_stool", "menu",
        "kitchencounter_straight_A_decorated", "fridge_A_decorated", "crate_carrots",
    ]),
}


def gltf_path(src, pack, stem):
    hits = glob.glob(os.path.join(src, pack, "addons", "*", "Assets", "gltf", stem + ".gltf"))
    if not hits:
        raise SystemExit(f"no {stem}.gltf in {pack}")
    return hits[0]


def piece(path, name):
    """Imports one .gltf and makes it a single object `name`, its meshes joined, on the floor at the origin."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == 'MESH']
    for o in new:
        if o.type != 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
        # Keep where it is in the world as it's freed from its empties.
        o.matrix_world = o.matrix_world.copy()
        o.parent = None
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    ob.name = name
    ob.data.name = name
    xs = [v.co.x for v in ob.data.vertices]
    ys = [v.co.y for v in ob.data.vertices]
    zs = [v.co.z for v in ob.data.vertices]
    print(f"  {name}: {max(xs) - min(xs):.2f} x {max(ys) - min(ys):.2f} x {max(zs) - min(zs):.2f} m, {aokit.tris(ob)} tris")
    return ob


def main():
    a = aokit.args()
    src = a[a.index("--src") + 1] if "--src" in a else None
    if not src:
        raise SystemExit("--src <dir with the KayKit packs>")
    for out, (pack, stems) in PACKS.items():
        aokit.clear()
        print(out)
        for stem in stems:
            piece(gltf_path(src, pack, stem), stem.replace("_withoutBase", ""))
        print("  ->", aokit.export(out, uvs=True))


main()
