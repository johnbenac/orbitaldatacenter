import bpy,math,sys
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
gpu_name=args[args.index('--gpu-name')+1] if '--gpu-name' in args else ''
from pathlib import Path
from mathutils import Vector
r=Path(__file__).resolve().parents[1];bpy.ops.wm.read_factory_settings(use_empty=True);ns={};exec((r/'source/import-needle.py').read_text(),ns);ns['import_needle'](r);s=bpy.context.scene;s.unit_settings.system='METRIC'
w=bpy.data.worlds.new('Neutral daylight');w.use_nodes=True;w.node_tree.nodes['Background'].inputs[0].default_value=(.3,.42,.6,1);w.node_tree.nodes['Background'].inputs[1].default_value=.5;s.world=w
for name,kind,power,pos,size in [('Sun','SUN',3,(80,-100,180),0),('Broad daylight fill','AREA',75000,(-60,-70,100),100)]:
 d=bpy.data.lights.new(name,kind);d.energy=power;o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,80))-o.location).to_track_quat('-Z','Y').to_euler()
 if kind=='AREA':d.shape='DISK';d.size=size
 else:d.angle=math.radians(.53)
d=bpy.data.cameras.new('Architectural portrait');c=bpy.data.objects.new('Architectural portrait',d);s.collection.objects.link(c);s.camera=c;c.location=(150,-210,95);c.rotation_euler=(Vector((0,0,92))-c.location).to_track_quat('-Z','Y').to_euler();d.lens=70;d.sensor_fit='HORIZONTAL';d.clip_end=10000
s.render.engine='CYCLES';s.cycles.samples=64;s.cycles.use_denoising=True;s.cycles.adaptive_threshold=.02;s.cycles.use_auto_tile=True;s.cycles.tile_size=256;s.cycles.denoiser='OPENIMAGEDENOISE';s.cycles.denoising_use_gpu=False
selected=False
try:
 prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
 for dev in prefs.devices:
  dev.use='--cpu' not in args and dev.type=='OPTIX' and (gpu_name in dev.name if gpu_name else not selected)
  if dev.use:selected=True
except Exception:pass
s.cycles.device='GPU' if selected else 'CPU';s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast';s.render.resolution_x=1200;s.render.resolution_y=1800;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath='//space-needle-printables.png';bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(r/'landmarks/space-needle-printables.blend'),compress=True);bpy.ops.render.render(write_still=True)
c.location=(38,-63,90);c.rotation_euler=(Vector((0,0,80))-c.location).to_track_quat('-Z','Y').to_euler();d.lens=50;s.render.resolution_y=1600;s.render.filepath=str(r/'landmarks/space-needle-leg-detail.png');bpy.ops.render.render(write_still=True)
