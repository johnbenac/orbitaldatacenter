"""Render the six landmarks side by side at ONE common scale (orthographic elevation).

Run: blender -b --python source/render-scale-strip.py -- [--preview] [--cpu]
Output: renders/landmark-scale-strip.png (transparent RGBA) and audits/landmark-scale-strip.json

Heights use the same labelled metres as render-orbital.py (Pyramid: 230.3 m base, whose
modelled surviving height is 138.8 m). Every landmark is scaled uniformly so that its labelled
dimension is exact; all six share one orthographic camera, so pixel sizes are directly comparable.
"""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1]
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
PX_PER_M=1.2 if '--preview' in args else 4.0
GAP_M=28.
# order requested (smallest to largest): Liberty, Taj Mahal, Big Ben, Pyramid, Space Needle, Eiffel
ORDER=[
 dict(key='liberty',asset='liberty',metres=46.05,axis=2,yaw=0),
 dict(key='taj',asset='taj',metres=73.,axis=2,yaw=0),
 dict(key='bigben',asset='bigben',metres=96.3,axis=2,yaw=0),
 dict(key='pyramid',asset='pyramid',metres=230.3,axis=0,yaw=0),
 dict(key='needle',asset='needle',metres=184.4,axis=2,yaw=0),
 dict(key='eiffel',asset='eiffel',metres=324.,axis=2,yaw=0)]
YAW={k:float(args[args.index('--yaw-'+k)+1]) for k in [o['key'] for o in ORDER] if '--yaw-'+k in args}
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene

def bounds(objects):
 bpy.context.view_layer.update();ps=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
 return Vector([min(p[i] for p in ps) for i in range(3)]),Vector([max(p[i] for p in ps) for i in range(3)])

def load(cfg):
 asset=cfg['asset'];before=set(s.objects)
 if asset=='needle':
  src=(ROOT/'source/import-needle.py').read_text()
  if not hasattr(bpy.types.Mesh,'set_sharp_from_angle'): # Blender < 4.1 fallback, same 28 degree threshold
   src=src.replace('mesh.set_sharp_from_angle(angle=math.radians(28))','mesh.use_auto_smooth=True;mesh.auto_smooth_angle=math.radians(28)')
  ns={};exec(src,ns);ns['import_needle'](ROOT)
 elif asset=='pyramid':
  ns={};exec((ROOT/'source/pyramid-exterior.py').read_text(),ns);ns['make_pyramid']()
 else:bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets'/f'{asset}.glb'))
 bpy.context.view_layer.update();ref=[o for o in s.objects if o not in before and o.type=='MESH']
 for o in ref:
  w=o.matrix_world.copy();o.parent=None;o.matrix_world=w
 for o in list(s.objects):
  if o not in before and o not in ref:bpy.data.objects.remove(o,do_unlink=True)
 return ref

def fix_materials(asset,ref):
 if asset=='taj':
  ns={};exec((ROOT/'source/fix-taj-materials.py').read_text(),ns);ns['fix_taj_materials'](ROOT,ref)
 for mat in {m for o in ref for m in o.data.materials if m}:
  if not mat.use_nodes:continue
  nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
  if p is None:
   p=nodes.new('ShaderNodeBsdfPrincipled');out=next(n for n in nodes if n.type=='OUTPUT_MATERIAL');links.new(p.outputs['BSDF'],out.inputs['Surface']);tex=next((n for n in nodes if n.type=='TEX_IMAGE' and n.image),None)
   if tex:links.new(tex.outputs['Color'],p.inputs['Base Color'])
  p.inputs['Emission Strength'].default_value=0
  if asset not in ['needle','pyramid']:p.inputs['Roughness'].default_value=.55
  if asset=='taj':
   for l in list(p.inputs['Metallic'].links):links.remove(l)
   p.inputs['Metallic'].default_value=0
  if asset=='eiffel' and 'Concrete' not in mat.name:
   p.inputs['Metallic'].default_value=.6;p.inputs['Roughness'].default_value=.45
   for l in list(p.inputs['Base Color'].links):links.remove(l)
   p.inputs['Base Color'].default_value=(.26,.15,.07,1)

cursor=0.;placed=[];audit=[]
for cfg in ORDER:
 ref=load(cfg);fix_materials(cfg['asset'],ref)
 lo,hi=bounds(ref);dims=hi-lo;scale=cfg['metres']/dims[cfg['axis']]
 centre=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 yaw=YAW.get(cfg['key'],cfg['yaw'])
 base=Matrix.Rotation(math.radians(yaw),4,'Z')@Matrix.Scale(scale,4)@Matrix.Translation(-centre)
 for o in ref:o.matrix_world=base@o.matrix_world
 lo2,hi2=bounds(ref);shift=Vector((cursor-lo2.x,0,0))
 for o in ref:o.matrix_world=Matrix.Translation(shift)@o.matrix_world
 lo2,hi2=bounds(ref);cursor=hi2.x+GAP_M
 placed.append(ref);audit.append(dict(key=cfg['key'],labelled_metres=cfg['metres'],uniform_scale=scale,width_m=hi2.x-lo2.x,depth_m=hi2.y-lo2.y,height_m=hi2.z-lo2.z,x_min=lo2.x,x_max=hi2.x,yaw=yaw))
allobj=[o for r in placed for o in r];lo,hi=bounds(allobj)
width_m=hi.x-lo.x;height_m=hi.z-lo.z;margin=6.
# Orthographic elevation camera looking along +Y from the -Y side.
cam_data=bpy.data.cameras.new('Scale strip');cam_data.type='ORTHO';cam_data.ortho_scale=(width_m+2*margin)
cam=bpy.data.objects.new('Scale strip camera',cam_data);s.collection.objects.link(cam);s.camera=cam
res_x=int(round((width_m+2*margin)*PX_PER_M));res_y=int(round((height_m+2*margin)*PX_PER_M))
cx=(lo.x+hi.x)/2;cz=lo.z-margin+(res_y/PX_PER_M)/2
cam.location=(cx,-2000,cz);cam.rotation_euler=(math.radians(90),0,0)
cam_data.clip_end=6000
s.render.resolution_x=res_x;s.render.resolution_y=res_y;s.render.resolution_percentage=100;s.render.film_transparent=True
s.render.engine='CYCLES';s.cycles.samples=32 if '--preview' in args else 384;s.cycles.use_denoising=False # this Blender build has no OIDN; brute-force samples instead
s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
# Soft daylight: a warm key from upper-left-front plus a neutral sky fill (world is hidden by transparency).
world=bpy.data.worlds.new('Strip sky');world.use_nodes=True;bg=world.node_tree.nodes['Background'];bg.inputs['Color'].default_value=(.62,.70,.82,1);bg.inputs['Strength'].default_value=.9;s.world=world
sun=bpy.data.lights.new('Key','SUN');sun.energy=4.2;sun.angle=math.radians(6);sun.color=(1,.94,.86)
so=bpy.data.objects.new('Key',sun);s.collection.objects.link(so);so.rotation_euler=(math.radians(58),0,math.radians(-32))
s.view_settings.view_transform='Filmic' if 'Filmic' in bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items.keys() else 'Standard'
try:
 prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices();sel=False
 for d in prefs.devices:
  d.use='--cpu' not in args and d.type=='OPTIX' and not sel
  sel=sel or d.use
 s.cycles.device='GPU' if sel else 'CPU'
except Exception:s.cycles.device='CPU'
out=ROOT/'renders'/('landmark-scale-strip-preview.png' if '--preview' in args else 'landmark-scale-strip.png')
s.render.filepath=str(out)
bpy.ops.render.render(write_still=True)
(ROOT/'audits'/'landmark-scale-strip.json').write_text(json.dumps(dict(px_per_m=PX_PER_M,gap_m=GAP_M,margin_m=margin,resolution=[res_x,res_y],items=audit),indent=2))
print('WROTE',out,res_x,res_y)
