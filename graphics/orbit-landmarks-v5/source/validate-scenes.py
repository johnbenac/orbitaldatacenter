"""Inspect packed masters without rendering; assert original craft/camera transforms."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
IDS=['redwire-8kw','starcloud-3','starmind-ai1','orbital-1-202609','orbital-1-202606','star-catcher-self-powered']
def craft():
 return {o.name:[list(row) for row in o.matrix_world] for c in bpy.data.collections if 'exact v56 modeled' in c.name for o in c.objects if o.type=='MESH'}
results=[]
for ident in IDS:
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'original-scenes'/f'{ident}.blend'))
 original=craft();camera=[list(row) for row in bpy.context.scene.camera.matrix_world];lens=bpy.context.scene.camera.data.lens
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'scenes'/f'{ident}.blend'))
 s=bpy.context.scene
 assert craft()==original,ident
 assert [list(row) for row in s.camera.matrix_world]==camera and s.camera.data.lens==lens,ident
 assert not any('cloud' in o.name.lower() for o in s.objects),ident
 assert (s.render.resolution_x,s.render.resolution_y)==(2400,1350),ident
 assert s.render.filepath=='//../renders/'+ident+'.png',ident
 unpacked=[i.name for i in bpy.data.images if i.source=='FILE' and i.users and not i.packed_file and not i.packed_files]
 assert not unpacked,(ident,unpacked)
 assert len([c for c in bpy.data.collections if c.name.startswith('Floating landmark')])==1
 if ident=='star-catcher-self-powered':
  assert any('original Printables geometry' in o.name for o in s.objects)
 audit=json.loads((ROOT/'audits'/f'{ident}.json').read_text())
 assert abs(audit['city_projected'][0]-.5)<.001 and abs(audit['city_projected'][1]-.18)<.001
 results.append(dict(id=ident,camera_unchanged=True,craft_matrices_unchanged=True,craft_meshes=len(original),cloud_free=True,all_images_packed=True,relative_render_path=s.render.filepath,city=audit['city']))
(ROOT/'scene-validation.json').write_text(json.dumps(results,indent=2))
print('VALIDATED',len(results),'packed orbital scenes')
