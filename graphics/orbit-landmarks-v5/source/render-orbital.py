"""Preserve the approved spacecraft framing; add floating landmarks and local Earth views."""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Vector,Matrix
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parents[1]
args=sys.argv[sys.argv.index('--')+1:];ID=args[args.index('--id')+1];preview='--preview' in args
CONFIG={
'redwire-8kw':dict(asset='liberty',metres=46.05,axis=2,city='New York City',lat=40.6892,lon=-74.0445,x=.26,y=.48),
'starcloud-3':dict(asset='pyramid',metres=230.3,axis=0,city='Giza, Egypt',lat=29.9792,lon=31.1342,x=.35,y=.44),
'starmind-ai1':dict(asset='taj',metres=73.,axis=2,city='Agra, India',lat=27.1751,lon=78.0421,x=.35,y=.44),
'orbital-1-202609':dict(asset='eiffel',metres=324.,axis=2,city='Paris',lat=48.8584,lon=2.2945,x=.23,y=.47),
'orbital-1-202606':dict(asset='bigben',metres=96.3,axis=2,city='London',lat=51.5007,lon=-.1246,x=.30,y=.47),
'star-catcher-self-powered':dict(asset='needle',metres=184.4,axis=2,city='Seattle',lat=47.6205,lon=-122.3493,x=.30,y=.47)}
cfg=CONFIG[ID];asset=cfg['asset']
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'original-scenes'/f'{ID}.blend'))
s=bpy.context.scene;camera=s.camera;original_camera=camera.matrix_world.copy();original_lens=camera.data.lens
craft=[o for c in bpy.data.collections if 'exact v56 modeled' in c.name for o in c.objects if o.type=='MESH'];original_craft={o.name:o.matrix_world.copy() for o in craft}
cam_world=camera.matrix_world.copy();cam_inverse=cam_world.inverted();cam_rotation=cam_world.to_3x3()
# Cloud-free Earth, with the chosen place in the visible terrain beneath the craft.
clouds=[o for o in s.objects if 'cloud' in o.name.lower()]
for o in clouds:bpy.data.objects.remove(o,do_unlink=True)
earth=s.objects['Earth • Blue Marble'];R=6371000.
frame=camera.data.view_frame(scene=s)
left=min(p.x/-p.z for p in frame);right=max(p.x/-p.z for p in frame);bottom=min(p.y/-p.z for p in frame);top=max(p.y/-p.z for p in frame)
x_screen=.5;y_screen=.18
ray=(cam_rotation@Vector((left+(right-left)*x_screen,bottom+(top-bottom)*y_screen,-1))).normalized()
origin=camera.location-earth.location;b=origin.dot(ray);discriminant=b*b-(origin.length_squared-R*R);assert discriminant>0
surface=camera.location+ray*(-b-math.sqrt(discriminant));normal=(surface-earth.location).normalized()
latitude=math.radians(cfg['lat']);longitude=math.radians(cfg['lon']+180)
local_normal=Vector((math.cos(latitude)*math.cos(longitude),math.cos(latitude)*math.sin(longitude),math.sin(latitude)))
local_east=Vector((-math.sin(longitude),math.cos(longitude),0));local_north=local_normal.cross(local_east)
cam_up=cam_rotation@Vector((0,1,0));north=(cam_up-normal*cam_up.dot(normal)).normalized();east=north.cross(normal).normalized()
local_basis=Matrix((local_east,local_north,local_normal)).transposed();world_basis=Matrix((east,north,normal)).transposed()
earth.rotation_mode='QUATERNION';earth.rotation_quaternion=(world_basis@local_basis.transposed()).to_quaternion()
bpy.context.view_layer.update();city_world=earth.matrix_world@(local_normal*R);city_uv=world_to_camera_view(s,camera,city_world)
assert abs(city_uv.x-x_screen)<.001 and abs(city_uv.y-y_screen)<.001
# Import or build the landmark while preserving all original scene elements.
before=set(s.objects)
if asset=='needle':
 namespace={};exec((ROOT/'source/import-needle.py').read_text(),namespace);namespace['import_needle'](ROOT)
elif asset=='pyramid':
 namespace={};script='pyramid-exterior.py' if asset=='pyramid' else 'space-needle.py';exec((ROOT/'source'/script).read_text(),namespace);namespace['make_pyramid' if asset=='pyramid' else 'make_needle']()
else:bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets'/f'{asset}.glb'))
bpy.context.view_layer.update();reference=[o for o in s.objects if o not in before and o.type=='MESH']
for o in reference:
 world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
for o in list(s.objects):
 if o not in before and o not in reference:bpy.data.objects.remove(o,do_unlink=True)
def bounds(objects):
 bpy.context.view_layer.update();ps=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box];return Vector([min(p[i] for p in ps) for i in range(3)]),Vector([max(p[i] for p in ps) for i in range(3)])
lo,hi=bounds(reference);source_dimensions=hi-lo;reference_center=(lo+hi)/2;metric_scale=cfg['metres']/source_dimensions[cfg['axis']]
if asset=='taj':
 namespace={};exec((ROOT/'source/fix-taj-materials.py').read_text(),namespace);namespace['fix_taj_materials'](ROOT,reference)
# Retain actual model textures, converting any unlit preview surfaces into lit PBR.
for mat in {m for o in reference for m in o.data.materials if m}:
 if not mat.use_nodes:continue
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
 if p is None:
  p=nodes.new('ShaderNodeBsdfPrincipled');output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL');links.new(p.outputs['BSDF'],output.inputs['Surface']);tex=next((n for n in nodes if n.type=='TEX_IMAGE' and n.image),None)
  if tex:links.new(tex.outputs['Color'],p.inputs['Base Color'])
 p.inputs['Emission Strength'].default_value=0
 if asset not in ['needle','pyramid']:p.inputs['Roughness'].default_value=.55
 if asset=='taj':
  for link in list(p.inputs['Metallic'].links):links.remove(link)
  p.inputs['Metallic'].default_value=0
 if asset=='eiffel' and 'Concrete' not in mat.name:
  p.inputs['Metallic'].default_value=.6;p.inputs['Roughness'].default_value=.45
  for link in list(p.inputs['Base Color'].links):links.remove(link)
  p.inputs['Base Color'].default_value=(.26,.15,.07,1)
if asset=='pyramid':orient=Matrix.Rotation(math.radians(-72),4,'X')@Matrix.Rotation(math.radians(18),4,'Z')
elif asset=='taj':orient=Matrix.Rotation(math.radians(-83),4,'X')@Matrix.Rotation(math.radians(168),4,'Z')
else:
 orient=Matrix.Rotation(math.radians(8),4,'Y')@Matrix.Rotation(math.radians(-90),4,'X')
 if asset=='liberty':orient=orient@Matrix.Rotation(math.radians(-65),4,'Z')
local_matrices={o.name:orient@Matrix.Scale(metric_scale,4)@Matrix.Translation(-reference_center)@o.matrix_world for o in reference}
# Put the landmark behind the original craft. Translate in perspective to fit it,
# rather than changing its physical size, the camera, or any spacecraft transform.
craft_depths=[-(cam_inverse@(o.matrix_world@Vector(v))).z for o in craft for v in o.bound_box]
relative_z=[(local_matrices[o.name]@Vector(v)).z for o in reference for v in o.bound_box]
depth=max(craft_depths)+max(relative_z)+cfg['metres']*.025
max_width=.64 if asset in ['pyramid','taj'] else .36;max_height=.86
for iteration in range(10):
 tx=(left+(right-left)*cfg['x'])*depth;ty=(bottom+(top-bottom)*cfg['y'])*depth
 place=cam_world@Matrix.Translation((tx,ty,-depth))
 for o in reference:o.matrix_world=place@local_matrices[o.name]
 bpy.context.view_layer.update();uvs=[world_to_camera_view(s,camera,o.matrix_world@Vector(v)) for o in reference for v in o.bound_box]
 xmin=min(v.x for v in uvs);xmax=max(v.x for v in uvs);ymin=min(v.y for v in uvs);ymax=max(v.y for v in uvs)
 ratio=max((xmax-xmin)/max_width,(ymax-ymin)/max_height)
 if ratio<=1.005:break
 depth*=ratio*1.012
# Center the actual projected envelope, including perspective asymmetry.
for iteration in range(3):
 dx=cfg['x']-(xmin+xmax)/2;dy=cfg['y']-(ymin+ymax)/2
 offset=cam_rotation@Vector((dx*(right-left)*depth,dy*(top-bottom)*depth,0))
 for o in reference:o.location+=offset
 bpy.context.view_layer.update();uvs=[world_to_camera_view(s,camera,o.matrix_world@Vector(v)) for o in reference for v in o.bound_box];xmin=min(v.x for v in uvs);xmax=max(v.x for v in uvs);ymin=min(v.y for v in uvs);ymax=max(v.y for v in uvs)
collection=bpy.data.collections.new('Floating landmark • '+asset);s.collection.children.link(collection)
for o in reference:collection.objects.link(o)
# A broad, restrained fill is linked only to the landmark, leaving craft lighting intact.
light_data=bpy.data.lights.new('Landmark photographic fill','AREA');light_data.energy=cfg['metres']**2*3;light_data.shape='DISK';light_data.size=cfg['metres']*.75;light_data.color=(1,.93,.85)
light=bpy.data.objects.new('Landmark photographic fill',light_data);s.collection.objects.link(light)
reflo,refhi=bounds(reference);refmid=(reflo+refhi)/2;light.location=refmid+cam_rotation@Vector((-cfg['metres']*.5,cfg['metres']*.7,cfg['metres']))
light.rotation_euler=(refmid-light.location).to_track_quat('-Z','Y').to_euler();light.light_linking.receiver_collection=collection
assert camera.matrix_world==original_camera and camera.data.lens==original_lens
assert all(o.matrix_world==original_craft[o.name] for o in craft)
assert not any('cloud' in o.name.lower() for o in s.objects)
s.render.resolution_x=960 if preview else 2400;s.render.resolution_y=540 if preview else 1350;s.render.resolution_percentage=100;s.render.film_transparent=False
s.cycles.samples=16 if preview else 96;s.cycles.adaptive_threshold=.045 if preview else .02;s.cycles.use_denoising=True;s.cycles.use_auto_tile=True;s.cycles.tile_size=256;s.cycles.denoiser='OPENIMAGEDENOISE'
if hasattr(s.cycles,'denoising_use_gpu'):s.cycles.denoising_use_gpu=False
gpu_name=args[args.index('--gpu-name')+1] if '--gpu-name' in args else '';selected=False
try:
 prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
 for d in prefs.devices:
  d.use='--cpu' not in args and d.type=='OPTIX' and (gpu_name in d.name if gpu_name else not selected)
  if d.use:selected=True
except Exception:pass
s.cycles.device='GPU' if selected else 'CPU'
# Keep original atmospheric scattering, sunlight, starfield and photographic exposure.
s['landmark_asset']=asset;s['landmark_metres']=cfg['metres'];s['earth_city']=cfg['city'];s['earth_latitude']=cfg['lat'];s['earth_longitude']=cfg['lon'];s['clouds']=False
s.render.filepath=str(ROOT/'renders'/(ID+('-preview' if preview else '')+'.png'))
audit=dict(id=ID,city=cfg['city'],latitude=cfg['lat'],longitude=cfg['lon'],city_projected=[city_uv.x,city_uv.y],clouds=False,camera_unchanged=True,craft_matrices_unchanged=True,camera_lens=original_lens,reference_metres=cfg['metres'],reference_uniform_scale=metric_scale,reference_depth=depth,reference_projection=[xmin,ymin,xmax,ymax],craft_meshes=len(craft),reference_meshes=len(reference))
(ROOT/'audits'/f'{ID}.json').write_text(json.dumps(audit,indent=2))
if not preview:
 bpy.context.preferences.filepaths.save_version=0;bpy.data.orphans_purge(do_recursive=True);bpy.ops.file.pack_all();s.render.filepath='//../renders/'+ID+'.png';bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'scenes'/f'{ID}.blend'),compress=True)
bpy.ops.render.render(write_still=True)
