"""The street's skyline buildings (world/cadde/kaykit.ts skyline): eight of our own, modelled to real size
(floors of 3.6 m, windows 1.4 x 1.9 m) in place of the KayKit boxes: a shop front on the ground floor with an
awning, framed windows with sills and lintels, balconies, a cornice and a roof with its parapet, tanks and
air-conditioning boxes. Each is a root named `building_A`…`building_H` standing on the floor at the origin,
its front toward +z (Blender -y), in src/client/models/sehir-binalari.glb. Materials: `wall`, `trim`, `frame`,
`roof`, `awning`, `dark`, and `win` (the glass, which world/cadde/kaykit.ts makes light up at night).

    blender --background --factory-startup --python blender/scripts/build_buildings.py
"""
import math
import os
import random
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(__file__))
import aokit  # noqa: E402

FLOOR = 3.6
# name: (wall colour, trim colour, awning colour, floors, width, depth, balconies?)
SPECS = {
    "A": ("#b5523b", "#efe6d2", "#2f6f8f", 5, 12.0, 10.0, True),
    "B": ("#e5d3a8", "#ffffff", "#b5523b", 4, 14.0, 10.0, False),
    "C": ("#6f8fa8", "#e9edf2", "#d98e2b", 6, 11.0, 9.0, True),
    "D": ("#5c8b66", "#f3ecd8", "#8a3a3a", 4, 13.0, 11.0, False),
    "E": ("#d29a4a", "#fbf2dc", "#2d4a5c", 5, 12.0, 10.0, True),
    "F": ("#8a5a44", "#e8dcc4", "#3d7a6e", 6, 10.0, 9.0, False),
    "G": ("#9aa3ad", "#f1f1f1", "#b04a4a", 5, 14.0, 10.0, True),
    "H": ("#c98a73", "#f6e9d7", "#355c7d", 4, 12.0, 11.0, False),
}
MATS = ["wall", "trim", "frame", "roof", "awning", "dark", "win"]


def make_materials(wall, trim, awning):
    cols = {"wall": wall, "trim": trim, "frame": "#2b2f36", "roof": "#6b6f76", "awning": awning, "dark": "#23262b", "win": "#9fd2ee"}
    out = {}
    for name, hexc in cols.items():
        out[name] = aokit.material(name, hexc)
    return [out[n] for n in MATS]


def cube(bm, mat, cx, cy, cz, sx, sy, sz):
    r = bmesh.ops.create_cube(bm, size=1.0)
    verts = r["verts"]
    for v in verts:
        v.co.x = v.co.x * sx + cx
        v.co.y = v.co.y * sy + cy
        v.co.z = v.co.z * sz + cz
    for f in {f for v in verts for f in v.link_faces}:
        f.material_index = MATS.index(mat)


def building(key, spec, seed):
    wall, trim, awning, floors, w, d, balconies = spec
    rnd = random.Random(seed)
    bm = bmesh.new()
    h = floors * FLOOR
    front = -d / 2
    # the body, and the shop front's base, a little proud
    cube(bm, "wall", 0, 0, h / 2, w, d, h)
    cube(bm, "dark", 0, front - 0.05, 0.45, w + 0.1, 0.1, 0.9)
    # ground floor: a wide glass shop front in a frame, a door, an awning
    cube(bm, "frame", 0, front - 0.06, FLOOR / 2 + 0.4, w - 1.2, 0.12, FLOOR - 1.0)
    cube(bm, "win", 0, front - 0.13, FLOOR / 2 + 0.4, w - 1.5, 0.05, FLOOR - 1.3)
    for i in range(1, 4):
        cube(bm, "frame", -w / 2 + 0.75 + (w - 1.5) * i / 4, front - 0.15, FLOOR / 2 + 0.4, 0.08, 0.08, FLOOR - 1.3)
    cube(bm, "awning", 0, front - 0.9, FLOOR - 0.2, w - 1.0, 1.7, 0.18)
    cube(bm, "trim", 0, front - 0.06, FLOOR, w + 0.1, 0.18, 0.28)
    # upper floors: a grid of windows on the front and the two sides
    cols = max(3, int(w // 2.6))
    sx = w / cols
    for f in range(1, floors):
        zc = f * FLOOR + FLOOR / 2 + 0.1
        for c in range(cols):
            x = -w / 2 + sx * (c + 0.5)
            cube(bm, "frame", x, front - 0.06, zc, 1.7, 0.14, 2.2)
            cube(bm, "win", x, front - 0.11, zc, 1.4, 0.06, 1.9)
            cube(bm, "trim", x, front - 0.12, zc - 1.15, 2.0, 0.3, 0.14)
            cube(bm, "trim", x, front - 0.09, zc + 1.15, 1.9, 0.18, 0.14)
            if balconies and f % 2 == 0 and c % 2 == 0:
                cube(bm, "trim", x, front - 0.55, zc - 1.05, 2.1, 1.0, 0.12)
                cube(bm, "frame", x, front - 1.0, zc - 0.55, 2.1, 0.05, 0.9)
        # the sides
        rows = max(2, int(d // 3))
        sz = d / rows
        for r in range(rows):
            y = front + sz * (r + 0.5)
            for sgn in (-1, 1):
                cube(bm, "frame", sgn * (w / 2 + 0.05), y, zc, 0.14, 1.7, 2.2)
                cube(bm, "win", sgn * (w / 2 + 0.1), y, zc, 0.06, 1.4, 1.9)
    # a cornice, the roof with its parapet and what stands on it
    cube(bm, "trim", 0, 0, h + 0.15, w + 0.5, d + 0.5, 0.3)
    cube(bm, "roof", 0, 0, h + 0.4, w - 0.2, d - 0.2, 0.25)
    for sgn in (-1, 1):
        cube(bm, "trim", sgn * (w / 2 + 0.1), 0, h + 0.7, 0.3, d + 0.5, 0.6)
        cube(bm, "trim", 0, sgn * (d / 2 + 0.1), h + 0.7, w + 0.5, 0.3, 0.6)
    for _ in range(rnd.randint(2, 4)):
        cube(bm, "dark", rnd.uniform(-w / 3, w / 3), rnd.uniform(-d / 4, d / 4), h + 0.9, rnd.uniform(0.9, 1.6), rnd.uniform(0.9, 1.4), rnd.uniform(0.6, 1.2))
    tank = rnd.uniform(-w / 4, w / 4)
    bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=1.0, radius2=1.0, depth=1.8, matrix=__import__("mathutils").Matrix.Translation((tank, d / 5, h + 1.4)))
    mesh = bpy.data.meshes.new(f"building_{key}")
    bm.to_mesh(mesh)
    bm.free()
    for m in make_materials(wall, trim, awning):
        mesh.materials.append(m)
    ob = bpy.data.objects.new(f"building_{key}", mesh)
    bpy.context.collection.objects.link(ob)
    for p in mesh.polygons:
        p.use_smooth = False
    return ob


def main():
    aokit.clear()
    for i, (k, spec) in enumerate(SPECS.items()):
        ob = building(k, spec, 100 + i)
        print(f"  building_{k}: {spec[4]} x {spec[5]} x {spec[3] * FLOOR + 1.4} m, {aokit.tris(ob)} tris")
    print("  ->", aokit.export("sehir-binalari", uvs=False))


main()
