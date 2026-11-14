"""Import the original CC-BY-SA Printables model; assign photographic materials.
Source: https://www.printables.com/model/237534-seattle-space-needle
Original design Intentional3D, Printables reupload Simon8668.
"""
import bpy,math
from pathlib import Path
from mathutils import Vector

def import_needle(root):
 before=set(bpy.context.scene.objects);bpy.ops.wm.stl_import(filepath=str(Path(root)/'assets/needle-printables/Combined.stl'));obs=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
 points=[o.matrix_world@v.co for o in obs for v in o.data.vertices];lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)]);scale=184.4/(hi.z-lo.z);center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 def mat(name,color,rough,metal=0):
  m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
 paint=mat('Astronaut-white painted structural steel',(.72,.74,.76),.44)
 glass=mat('Dark observation glazing',(.018,.035,.052),.17)
 core=mat('Recessed elevator and stair core',(.055,.065,.075),.6)
 concrete=mat('Matte base',(.43,.44,.43),.8)
 for o in obs:
  matrix=o.matrix_world.copy();o.matrix_world.identity()
  for v in o.data.vertices:v.co=(matrix@v.co-center)*scale
  o.name='Space Needle • original Printables geometry';mesh=o.data;mesh.update()
  for m in [paint,glass,core,concrete]:mesh.materials.append(m)
  for f in mesh.polygons:
   p=f.center;r=math.hypot(p.x,p.y);z=p.z;idx=0
   if 148<z<159 and r>12 and abs(f.normal.z)<.45:idx=1
   elif 26<z<35 and r>6 and abs(f.normal.z)<.4:idx=1
   elif 7<z<145 and r<2:idx=2
   elif z<1.8:idx=3
   f.material_index=idx;f.use_smooth=True
  mesh.set_sharp_from_angle(angle=math.radians(28));n=o.modifiers.new('Preserve flat structural faces','WEIGHTED_NORMAL');n.keep_sharp=True
 return obs
