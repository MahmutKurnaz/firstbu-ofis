"""The world's own furniture and street things (world/cadde/meshy.ts): the 16 props made with Meshy
(blender/scripts/meshy_props.py), shrunk (about 3000 triangles each, 512 px texture) and put in one file,
src/client/models/meshy-props.glb. Each piece is a root of its own, named by its key (`agac`, `bank`…),
standing on the floor at the origin, centred, its front toward +z, sized in meters as in blender/furniture.json.
Those names are a contract with world/cadde/meshy.ts and tests/meshy-props.test.ts.

Each piece's ambient occlusion (the soft dark where things meet: legs on the floor, cushions, leaves, drawers)
is baked in Cycles, against a floor under it, and multiplied into its colour texture, so the street's
toon lighting keeps a depth it can't make for itself.

    blender --background --factory-startup --python blender/scripts/build_meshy_props.py -- --src <dir with the <key>.glb files>
"""
import json
import os
import sys
import tempfile

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import aokit  # noqa: E402

# Each piece's size, in meters (w across, d deep, h tall), from blender/furniture.json.
SPEC = json.load(open(os.path.join(os.path.dirname(__file__), "..", "furniture.json")))["pieces"]
SIZE = list(SPEC)
TRIS = 5000
TEX = 1024
# How far the occlusion reaches (m), and how much of the colour it can take away.
AO_DIST = 0.5
AO_MIN = 0.4
AO_SAMPLES = 64


def piece(path, key):
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
        o.matrix_world = o.matrix_world.copy()
        o.parent = None
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    n = aokit.tris(ob)
    if n > TRIS:
        m = ob.modifiers.new("d", 'DECIMATE')
        m.ratio = TRIS / n
        aokit.apply_modifier(ob, "d")
    ob.name = key
    ob.data.name = key
    # In Blender z is up: the model is y-up in the file, so its height is z here. Each axis is brought to its own size.
    vs = [v.co for v in ob.data.vertices]
    mn = [min(v[i] for v in vs) for i in range(3)]
    mx = [max(v[i] for v in vs) for i in range(3)]
    spec = SPEC[key]
    k = (spec["w"] / (mx[0] - mn[0]), spec["d"] / (mx[1] - mn[1]), spec["h"] / (mx[2] - mn[2]))
    for v in ob.data.vertices:
        v.co.x = (v.co.x - (mn[0] + mx[0]) / 2) * k[0]
        v.co.y = (v.co.y - (mn[1] + mx[1]) / 2) * k[1]
        v.co.z = (v.co.z - mn[2]) * k[2]
    for mat in ob.data.materials:
        for node in mat.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image and max(node.image.size) > TEX:
                node.image.scale(TEX, TEX)
    print(f"  {key}: {spec['w']:.2f} x {spec['d']:.2f} x {spec['h']:.2f} m (was {mx[0]-mn[0]:.2f} x {mx[1]-mn[1]:.2f} x {mx[2]-mn[2]:.2f}), {aokit.tris(ob)} tris")
    return ob


def bake_occlusion(ob, floor):
    """Multiplies the baked ambient occlusion of `ob` (standing on `floor`) into its colour texture."""
    mat = ob.data.materials[0]
    nt = mat.node_tree
    tex = next(n for n in nt.nodes if n.type == 'TEX_IMAGE' and n.image)
    base = tex.image
    if tuple(base.size) != (TEX, TEX):
        base.scale(TEX, TEX)
    ao = bpy.data.images.new("ao_" + ob.name, TEX, TEX)
    node = nt.nodes.new('ShaderNodeTexImage')
    node.image = ao
    nt.nodes.active = node
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    floor.hide_render = False
    bpy.ops.object.bake(type='AO', margin=8)
    nt.nodes.remove(node)
    px = np.array(base.pixels[:], dtype=np.float32).reshape(-1, 4)
    a = np.array(ao.pixels[:], dtype=np.float32).reshape(-1, 4)[:, 0]
    px[:, :3] *= (AO_MIN + (1 - AO_MIN) * a)[:, None]
    base.pixels = px.ravel()
    # Written out as a JPEG and loaded back from that, so the file keeps it small (the exporter keeps a file image's own bytes).
    path = os.path.join(tempfile.gettempdir(), f"meshy_{ob.name}.jpg")
    base.filepath_raw = path
    base.file_format = 'JPEG'
    base.save()
    tex.image = bpy.data.images.load(path)
    tex.image.pack()
    bpy.data.images.remove(ao)


def main():
    a = aokit.args()
    src = a[a.index("--src") + 1] if "--src" in a else None
    if not src:
        raise SystemExit("--src <dir with the Meshy props>")
    aokit.clear()
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = AO_SAMPLES
    sc.cycles.use_denoising = False
    sc.world = bpy.data.worlds.new("w")
    sc.world.light_settings.distance = AO_DIST
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.002))
    floor = bpy.context.active_object
    pieces = [piece(os.path.join(src, key + ".glb"), key) for key in SIZE]
    for ob in pieces:
        bake_occlusion(ob, floor)
    bpy.data.objects.remove(floor, do_unlink=True)
    print("  ->", aokit.export("meshy-props", uvs=True))


main()
