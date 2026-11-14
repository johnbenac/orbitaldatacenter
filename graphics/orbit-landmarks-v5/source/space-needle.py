"""Editable architectural study of Seattle's Space Needle in metres.
Saucer profile adapted from Eric G. Suchanek's MIT-licensed satprint model.
Three open support legs, elevator core, glazing and roof ribs added here.
Overall height 184.4m, saucer diameter 42m. Secondary detail is illustrative.
"""
import bpy,math
from mathutils import Vector
def make_needle():
 def material(name,color,metal=.0,rough=.4):
  m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
 steel=material('Needle • pearl-white structural steel',(.72,.74,.76),0,.43)
 glass=material('Needle • blue architectural glazing',(.035,.095,.14),.65,.16)
 roof=material('Needle • warm ivory roof',(.69,.67,.59),0,.46)
 def tube(name,a,b,r,mat,vertices=32):
  a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat)
  for f in o.data.polygons:f.use_smooth=True
  return o
 def lathe(name,profile,mat):
  vs=[];fs=[];N=128
  for z,r in profile:
   for i in range(N):vs.append((r*math.cos(2*math.pi*i/N),r*math.sin(2*math.pi*i/N),z))
  for j in range(len(profile)-1):
   for i in range(N):a=j*N+i;b=j*N+(i+1)%N;fs.append((a,b,b+N,a+N))
  fs.extend([tuple(reversed(range(N))),tuple((len(profile)-1)*N+i for i in range(N))]);m=bpy.data.meshes.new(name);m.from_pydata(vs,[],fs);m.update();o=bpy.data.objects.new(name,m);bpy.context.scene.collection.objects.link(o);o.data.materials.append(mat)
  for f in m.polygons:f.use_smooth=True
  return o
 # Smooth open painted-steel frames replace segmented chrome-like tubes.
 profile=[(0,18),(15,13.6),(40,8.5),(75,5.4),(105,4.9),(122,5.6),(137,7.6),(146,10)]
 def radius(z):
  i=next((i for i in range(len(profile)-1) if z<=profile[i+1][0]),len(profile)-2)
  z0,r0=profile[i];z1,r1=profile[i+1];h=z1-z0;t=(z-z0)/h
  m0=(r1-profile[max(0,i-1)][1])/(z1-profile[max(0,i-1)][0]) if i else (r1-r0)/h
  m1=(profile[min(len(profile)-1,i+2)][1]-r0)/(profile[min(len(profile)-1,i+2)][0]-z0) if i+2<len(profile) else (r1-r0)/h
  return (2*t**3-3*t**2+1)*r0+(t**3-2*t**2+t)*h*m0+(-2*t**3+3*t**2)*r1+(t**3-t**2)*h*m1
 def box_beam(name,a,b,width,depth,mat):
  a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cube_add(size=1,location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.scale=(width,depth,d.length);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
  bevel=o.modifiers.new('Painted edge radius','BEVEL');bevel.width=.025;bevel.segments=3
  normal=o.modifiers.new('Flat architectural face normals','WEIGHTED_NORMAL');normal.keep_sharp=True
  return o
 def section(w,d,t,web):
  return [(-w/2,-d/2),(w/2,-d/2),(w/2,-d/2+t),(web/2,-d/2+t),(web/2,d/2-t),(w/2,d/2-t),(w/2,d/2),(-w/2,d/2),(-w/2,d/2-t),(-web/2,d/2-t),(-web/2,-d/2+t),(-w/2,-d/2+t)]
 for j in range(3):
  angle=2*math.pi*j/3;radial=Vector((math.cos(angle),math.sin(angle),0));tangent=Vector((-math.sin(angle),math.cos(angle),0))
  for side in [-1,1]:
   vs=[];fs=[];N=293
   for i in range(N):
    z=146*i/(N-1);r=radius(z);dr=(radius(min(146,z+.02))-radius(max(0,z-.02)))/(.02 if z in [0,146] else .04)
    direction=(radial*dr+Vector((0,0,1))).normalized();outward=tangent.cross(direction).normalized();spacing=1.65-.5*math.sin(math.pi*z/146)
    c=radial*r+tangent*side*spacing+Vector((0,0,z));w=1.9+.7*abs((z-95)/95);d=1.15
    for u,v in section(w,d,.13,.16):vs.append(tuple(c+tangent*u+outward*v))
   for i in range(N-1):
    for k in range(12):fs.append((i*12+k,i*12+(k+1)%12,(i+1)*12+(k+1)%12,(i+1)*12+k))
   fs.extend([tuple(reversed(range(12))),tuple((N-1)*12+k for k in range(12))]);mesh=bpy.data.meshes.new('Continuous curved I-beam');mesh.from_pydata(vs,[],fs);mesh.update()
   for f in mesh.polygons:f.use_smooth=True
   mesh.set_sharp_from_angle(angle=math.radians(20));o=bpy.data.objects.new('Continuous painted I-beam leg',mesh);bpy.context.scene.collection.objects.link(o);mesh.materials.append(steel)
   bevel=o.modifiers.new('Soft painted steel arrises','BEVEL');bevel.width=.025;bevel.segments=3;bevel.limit_method='ANGLE';bevel.angle_limit=math.radians(20);bevel.harden_normals=True
   normal=o.modifiers.new('Weighted planar flange normals','WEIGHTED_NORMAL');normal.keep_sharp=True
  for z in [12,30,49,68,88,108,128,144]:
   spacing=1.65-.5*math.sin(math.pi*z/146);c=radial*radius(z)+Vector((0,0,z));box_beam('Painted frame cross-member',c-tangent*spacing,c+tangent*spacing,.65,.6,steel)
 # Open elevator/stair frame, rather than a reflective solid cylinder.
 dark=material('Interior charcoal-painted frame',(.085,.095,.105),0,.6)
 posts=[Vector((2.1*math.cos(2*math.pi*j/3),2.1*math.sin(2*math.pi*j/3),0)) for j in range(3)]
 for p in posts:box_beam('Continuous elevator guide column',p,p+Vector((0,0,149)),.36,.36,steel)
 for z in range(3,148,4):
  for j in range(3):
   a=posts[j]+Vector((0,0,z));b=posts[(j+1)%3]+Vector((0,0,z));box_beam('Elevator frame horizontal',a,b,.19,.19,steel)
   box_beam('Interior diagonal bracing',a,b+Vector((0,0,4)),.12,.12,dark)
 for z in [38,87,132]:
  for j in range(3):
   a=2*math.pi*j/3;c=Vector((2.8*math.cos(a),2.8*math.sin(a),z));box_beam('Elevator cabin',c-Vector((0,0,1.7)),c+Vector((0,0,1.7)),1.2,1.1,glass)
 undersurface=material('Recessed dark underside panels',(.075,.085,.095),.05,.65)
 lathe('Saucer underside',[(145,9.5),(149,15.5),(152,20.3),(153,21)],undersurface)
 for i in range(48):
  a=2*math.pi*i/48;box_beam('White radial underside rafter',(9.5*math.cos(a),9.5*math.sin(a),145.8),(20.4*math.cos(a),20.4*math.sin(a),152.1),.23,.48,steel)
 lathe('Saucer lower white rim',[(152.7,21),(153.1,21)],steel)
 lathe('Observation glazing',[(153,19.9),(158.5,19.9)],glass)
 lathe('Roof',[(158.5,21),(159.3,21),(162,16.5),(165,8.5),(167,3)],roof)
 for z in [153,155.5,158.5]:lathe('Window ring',[(z,20.0),(z+.18,20.0)],steel)
 for i in range(80):
  a=2*math.pi*i/80;tube('Window mullion',(20*math.cos(a),20*math.sin(a),153),(20*math.cos(a),20*math.sin(a),158.5),.09,steel,8)
 lathe('Spire',[(167,2),(171,1),(184.4,.12)],steel)
 for i in range(24):
  a=2*math.pi*i/24;tube('Roof radial seam',(3*math.cos(a),3*math.sin(a),167),(20.8*math.cos(a),20.8*math.sin(a),159.5),.065,steel,8)

