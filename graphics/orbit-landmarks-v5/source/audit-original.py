import bpy,json,math
from pathlib import Path
from mathutils import Vector
r=Path(__file__).resolve().parents[1];out={}
for path in (r/'original-scenes').glob('*.blend'):
 bpy.ops.wm.open_mainfile(filepath=str(path));s=bpy.context.scene;c=s.camera
 craft=[o for co in bpy.data.collections if 'exact v56 modeled' in co.name for o in co.objects if o.type=='MESH']
 pts=[o.matrix_world@Vector(v) for o in craft for v in o.bound_box];center=sum(pts,Vector())/len(pts)
 depth=-(c.matrix_world.inverted()@center).z;frame=c.data.view_frame(scene=s);width=(max(p.x/-p.z for p in frame)-min(p.x/-p.z for p in frame))*depth;height=(max(p.y/-p.z for p in frame)-min(p.y/-p.z for p in frame))*depth
 out[path.stem]={'lens':c.data.lens,'depth':depth,'width':width,'height':height,'objects':[o.name for o in s.objects if o not in craft]}
(r/'original-framing.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))
