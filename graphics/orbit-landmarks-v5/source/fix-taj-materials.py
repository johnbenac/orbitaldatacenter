"""Convert the asset's legacy glTF specular/glossiness materials explicitly.
The generic Blender importer can expose specular maps before diffuse maps;
selecting the first image makes otherwise white facade panels black.
"""
import bpy,json,struct,re
from pathlib import Path
def fix_taj_materials(root,objects):
 root=Path(root);data=(root/'assets/taj.glb').read_bytes();n=struct.unpack_from('<I',data,12)[0];document=json.loads(data[20:20+n]);binary=data[28+n:];directory=root/'assets/taj-diffuse';directory.mkdir(exist_ok=True)
 entries={m['name']:m for m in document['materials']};cache={}
 for mat in {m for o in objects for m in o.data.materials if m}:
  name=mat.name if mat.name in entries else re.sub(r'\.\d{3}$','',mat.name)
  if name not in entries:continue
  entry=entries[name];legacy=entry.get('extensions',{}).get('KHR_materials_pbrSpecularGlossiness',{});tex=legacy.get('diffuseTexture')
  mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear();links=mat.node_tree.links;out=nodes.new('ShaderNodeOutputMaterial');p=nodes.new('ShaderNodeBsdfPrincipled');p.inputs['Roughness'].default_value=.55;p.inputs['Metallic'].default_value=0;p.inputs['Base Color'].default_value=tuple(legacy.get('diffuseFactor',[.8,.79,.76,1]));links.new(p.outputs['BSDF'],out.inputs['Surface'])
  if tex:
   index=document['textures'][tex['index']]['source']
   if index not in cache:
    image=document['images'][index];view=document['bufferViews'][image['bufferView']];start=view.get('byteOffset',0);ext='.png' if image.get('mimeType')=='image/png' else '.jpg';path=directory/(str(index)+ext);path.write_bytes(binary[start:start+view['byteLength']]);cache[index]=bpy.data.images.load(str(path),check_existing=True)
   node=nodes.new('ShaderNodeTexImage');node.image=cache[index];node.image.colorspace_settings.name='sRGB';links.new(node.outputs['Color'],p.inputs['Base Color'])
