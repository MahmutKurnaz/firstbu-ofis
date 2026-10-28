"""Small pictures of the pieces in src/client/models/meshy-props.glb, for the map editor's catalog
(client/features/mapedit/panel.ts): each piece alone, from the front and a little above and to the right, on a clear
background, 128 px square, in src/client/features/mapedit/thumbs/<key>.png. Blender's workbench renderer is enough:
the textures already have the occlusion baked in.

    blender --background --factory-startup --python blender/scripts/render_thumbs.py -- --out src/client/features/mapedit/thumbs [key ...]
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
GLB = os.path.join(ROOT, "src", "client", "models", "meshy-props.glb")
SIZE = 128


def args():
    a = sys.argv
    return a[a.index("--") + 1:] if "--" in a else []


def main():
    a = args()
    out = a[a.index("--out") + 1] if "--out" in a else os.path.join(ROOT, "src", "client", "features", "mapedit", "thumbs")
    keys = [x for x in a if not x.startswith("--") and x != out]
    os.makedirs(out, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB)
    pieces = {o.name: o for o in bpy.data.objects if o.type == "MESH"}
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.render.resolution_x = sc.render.resolution_y = SIZE
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sh = sc.display.shading
    sh.light = "STUDIO"
    sh.color_type = "TEXTURE"
    sh.show_shadows = False
    sh.show_cavity = False
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("cam", cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    for name in keys or sorted(pieces):
        ob = pieces.get(name)
        if not ob:
            print("  no such piece:", name)
            continue
        for o in pieces.values():
            o.hide_render = o is not ob
        corners = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
        lo = Vector([min(c[i] for c in corners) for i in range(3)])
        hi = Vector([max(c[i] for c in corners) for i in range(3)])
        mid = (lo + hi) / 2
        radius = (hi - lo).length / 2
        # In Blender the front (+z in the file) is -y; from the front, right and above.
        d = Vector((0.75, -1.0, 0.7)).normalized()
        cam.location = mid + d * (radius * 3 + 1)
        direction = mid - cam.location
        cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        cam_data.ortho_scale = radius * 2.15
        sc.render.filepath = os.path.join(out, name + ".png")
        bpy.ops.render.render(write_still=True)
        print("  ", name)


main()
