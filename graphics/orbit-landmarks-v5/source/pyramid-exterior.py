"""Closed, stepped Great Pyramid exterior, in metres. Original editable geometry.
230.3m base side, original slope to146.6m apex, surviving height138.8m.
Block courses and stone surface detail are an illustrative reconstruction.
The downloaded amin etti cutaway model remains in assets for alternate uses.
"""
import bpy,random,math

def make_pyramid():
 rng=random.Random(2303);verts=[];faces=[];matids=[]
 materials=[]
 for i in range(12):
  m=bpy.data.materials.new('Weathered limestone '+str(i));m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');v=.55+rng.random()*.6;p.inputs['Base Color'].default_value=(.55*v,.40*v,.24*v,1);p.inputs['Roughness'].default_value=.88
  tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=1200;tex.inputs['Detail'].default_value=3
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.32;bump.inputs['Distance'].default_value=.04;l.new(tex.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],p.inputs['Normal']);materials.append(m)
 def block(x0,x1,y0,y1,z0,z1):
  k=len(verts);verts.extend([(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)])
  faces.extend([tuple(k+i for i in q) for q in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]]);matids.extend([rng.randrange(12)]*6)
 courses=203;h=138.8/courses
 for j in range(courses):
  z=j*h;half=115.15*(1-z/146.6);length=2*half;n=max(1,round(length/2.4));w=length/n;depth=max(.8,115.15*h/146.6)
  for i in range(n):
   x=-half+i*w;seam=.025
   block(x+seam,x+w-seam,-half,-half+depth,z+.012,z+h-.012)
   block(x+seam,x+w-seam,half-depth,half,z+.012,z+h-.012)
   block(-half,-half+depth,x+seam,x+w-seam,z+.012,z+h-.012)
   block(half-depth,half,x+seam,x+w-seam,z+.012,z+h-.012)
 # Solid truncated core seals the stepped shell and its flat surviving summit.
 top=115.15*(1-138.8/146.6);k=len(verts);verts.extend([(-115.15,-115.15,0),(115.15,-115.15,0),(115.15,115.15,0),(-115.15,115.15,0),(-top,-top,138.8),(top,-top,138.8),(top,top,138.8),(-top,top,138.8)])
 faces.extend([tuple(k+i for i in q) for q in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]]);matids.extend([6]*6)
 mesh=bpy.data.meshes.new('Great Pyramid stepped limestone courses');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Great Pyramid • closed exterior study',mesh);bpy.context.scene.collection.objects.link(o)
 for m in materials:mesh.materials.append(m)
 for f,idx in zip(mesh.polygons,matids):f.material_index=idx
