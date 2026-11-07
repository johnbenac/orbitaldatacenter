"""Exercise production Earth shaders with Mesa's headless GLES driver.

Compile both GLSL versions used by Three r160, then read actual GPU pixels from
the observer's production virtual-imagery lookup. Synthetic geographic pages
check UV orientation, mixed LOD/slot addressing, antimeridian wrapping, sRGB
decode before bilinear filtering, cloud linear data, and missing-page fallback.
No browser, display server, hardware GPU, or third-party Python package needed.
"""
import ctypes as C
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent
EXTRACT = r"""
import * as T from './dist/vendor/three.module.js';
import {createEarthAppearance,createEarthObserverAppearance,earthCloudCoverage} from './dist/earth-appearance.js';
import {EARTH_DETAIL as D,createEarthDetail,sampleEarthDetail} from './dist/earth-detail.js';
globalThis.document={createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(v){}})};
const earth=createEarthAppearance({gpu:true,maxTextureSize:8192,anisotropy:1,onReady(){}});
const observer=createEarthObserverAppearance({base:earth,gpu:true,maxTextureSize:1560,anisotropy:1,onReady(){}});
const include=s=>s.replace(/#include <([\w_]+)>/g,(_,name)=>{
 if(!(name in T.ShaderChunk))throw Error('Unknown shader chunk '+name);
 return include(T.ShaderChunk[name]);
});
const precision='precision highp float;\nprecision highp int;\n#define HIGH_PRECISION\n';
const common='uniform mat4 viewMatrix;\nuniform vec3 cameraPosition;\nuniform bool isOrthographic;\n';
const vert=precision+common+'uniform mat4 modelMatrix;\nuniform mat4 modelViewMatrix;\nuniform mat4 projectionMatrix;\nuniform mat3 normalMatrix;\nattribute vec3 position;\nattribute vec3 normal;\nattribute vec2 uv;\n';
const frag=precision+common+'#define TONE_MAPPING\n'+T.ShaderChunk.tonemapping_pars_fragment+'\nvec3 toneMapping(vec3 c){return ACESFilmicToneMapping(c);}\n'+T.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 c){return LinearTosRGB(c);}\n';
const out=[];
const versions=version=>({
 vertex:version===300?'#version 300 es\n#define attribute in\n#define varying out\n#define texture2D texture\n':'',
 fragment:version===300?'#version 300 es\n#define varying in\n#define texture2D texture\nout highp vec4 pc_fragColor;\n#define gl_FragColor pc_fragColor\n':''
});
for(const [name,mesh] of [['globe surface',earth.surface],['globe atmosphere',earth.atmosphere],['observer surface',observer.surface],['observer atmosphere',observer.atmosphere]]){
 const m=mesh.material,defines=Object.entries(m.defines||{}).map(([k,v])=>'#define '+k+' '+v+'\n').join('');
 for(const version of [100,300]){
  const v=versions(version);
  out.push({name:name+' GLSL '+version,vertex:v.vertex+defines+vert+include(m.vertexShader),fragment:v.fragment+defines+frag+include(m.fragmentShader)});
 }
}
// Allocate real manager state: its actual texture colorSpace and flipY settings
// determine the GPU upload, and the production CPU sampler supplies parity.
const fixture=createEarthDetail({maxTextureSize:1560,maxPages:9,loadParent:()=>()=>{}});
const camera=new T.PerspectiveCamera(45,1,.001,100);camera.position.set(0,0,2);camera.lookAt(0,0,0);
const mesh=new T.Mesh(new T.SphereGeometry(1,8,4),new T.MeshBasicMaterial());
fixture.prepare(camera,mesh,{width:64,height:64});
const state=fixture.state;
state.tableData.fill(0);for(const data of state.atlasData)data.fill(0);
const gray=c=>[c,c,c,255];
const pages=[
 {layer:0,level:4,col:0,row:35,slot:[2,0],colors:[[32,96,160,255],[192,64,16,255],[16,224,80,255],gray(128)]},
 {layer:0,level:4,col:159,row:35,slot:[0,2],colors:[[208,24,72,255],[40,176,232,255],[80,144,48,255],[168,88,216,255]]},
 {layer:0,level:1,col:7,row:2,slot:[1,1],colors:[[224,32,64,255],[32,224,64,255],[64,32,224,255],[160,112,48,255]]},
 {layer:0,level:4,col:80,row:40,slot:[0,0],colors:[gray(0),gray(255),gray(64),gray(128)]},
 {layer:1,level:4,col:159,row:35,slot:[2,2],colors:[gray(128),gray(64),gray(224),gray(32)]},
 {layer:2,level:3,col:0,row:17,slot:[1,2],colors:[gray(64),gray(128),gray(192),gray(224)]},
 {layer:2,level:3,col:79,row:17,slot:[2,1],colors:[gray(32),gray(96),gray(160),gray(208)]}
];
for(const page of pages){
 const data=state.atlasData[page.layer];
 for(let y=0;y<D.pitch;y++)for(let x=0;x<D.pitch;x++){
  const color=page.colors[(y>=D.border+D.pageSize/2?2:0)+(x>=D.border+D.pageSize/2?1:0)];
  const offset=((page.slot[1]*D.pitch+y)*state.atlasSize+page.slot[0]*D.pitch+x)*4;
  data.set(color,offset);
 }
 const span=2**(D.maxLevel-page.level);
 for(let y=page.row*span;y<(page.row+1)*span;y++)for(let x=page.col*span;x<(page.col+1)*span;x++){
  const cell=((page.layer*D.tableRows+y)*D.tableColumns+x)*4;
  state.tableData.set([...page.slot,page.level+1,255],cell);
 }
}
const samples=[];
function point(name,pageIndex,x,y,shift=0){
 const page=pages[pageIndex],columns=D.columns*2**page.level,rows=D.rows*2**page.level;
 samples.push({name,layer:page.layer,u:(page.col+x)/columns+shift,vTop:(page.row+y)/rows});
}
point('day north-west orientation',0,.25,.25);
point('day south-east orientation',0,.75,.75);
point('day eastern dateline',1,.75,.25);
point('day negative longitude wraps west',1,.75,.25,-1);
point('day longitude above one wraps east',0,.25,.25,1);
point('day coarse page fine-table-cell address',2,.2,.7);
point('day coarse second quadrant',2,.8,.2);
point('day sRGB decode precedes bilinear interpolation',3,.5,.25);
point('night atlas plane and sRGB decode',4,.25,.25);
point('night south row orientation',4,.25,.75);
point('cloud linear data and lower native LOD',5,.75,.25);
point('cloud eastern dateline lower row',6,.75,.75);
point('cloud negative longitude wrap',6,.75,.75,-1);
samples.push({name:'day missing page uses global fallback',layer:0,u:.55,vTop:.1},
 {name:'night missing page reports unready',layer:1,u:.55,vTop:.1},
 {name:'cloud missing page uses global fallback',layer:2,u:.55,vTop:.1});
const globals={day:[17,34,51,255],clouds:gray(64)};
const decode=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
for(const sample of samples){
 const value=[0,0,0],ready=sampleEarthDetail(state,sample.layer,sample.u,sample.vTop,value);
 if(sample.layer===2){const c=earthCloudCoverage(ready?value[0]:globals.clouds[0]/255);sample.expected=[c,c,c,1];}
 else if(ready)sample.expected=[...value,1];
 else if(sample.layer===0)sample.expected=[...globals.day.slice(0,3).map(decode),0];
 else sample.expected=[0,0,0,0];
 sample.checkRgb=sample.layer!==1||ready;
}
// Independent semantic anchors ensure CPU/GPU agreement cannot conceal a
// shared north/south, slot, fallback, or encoded-vs-linear mistake.
const near=(a,b)=>Math.abs(a-b)<1e-5;
const anchor=(name,expected)=>{const s=samples.find(s=>s.name===name);if(!expected.every((v,i)=>near(v,s.expected[i])))throw Error('CPU fixture semantic anchor failed: '+name);};
anchor('day north-west orientation',[32,96,160].map(decode).concat(1));
anchor('day south-east orientation',gray(128).slice(0,3).map(decode).concat(1));
anchor('day eastern dateline',[40,176,232].map(decode).concat(1));
anchor('day negative longitude wraps west',[40,176,232].map(decode).concat(1));
anchor('day longitude above one wraps east',[32,96,160].map(decode).concat(1));
anchor('day coarse page fine-table-cell address',[64,32,224].map(decode).concat(1));
anchor('day sRGB decode precedes bilinear interpolation',[.5,.5,.5,1]);
anchor('night atlas plane and sRGB decode',[decode(128),decode(128),decode(128),1]);
const cloud128=earthCloudCoverage(128/255);anchor('cloud linear data and lower native LOD',[cloud128,cloud128,cloud128,1]);
const production=observer.surface.material.fragmentShader;
const mainOffset=production.indexOf('void main()');
if(mainOffset<0)throw Error('Observer main() not found');
const fixtureMain=`
uniform vec2 fixtureUv;
uniform int fixtureLayer;
void main(){
 if(fixtureLayer==0){vec4 ready=earthDetailDayAt(fixtureUv);gl_FragColor=vec4(dayColor(fixtureUv),ready.a);}
 else if(fixtureLayer==1)gl_FragColor=earthDetailNightAt(fixtureUv);
 else{
  float lon=(fixtureUv.x-.5)*TAU,lat=(fixtureUv.y-.5)*PI;
  vec3 n=vec3(cos(lat)*cos(lon),sin(lat),-cos(lat)*sin(lon));
  float c=cloudCoverage(n);gl_FragColor=vec4(vec3(c),1.0);
 }
}`;
for(const version of [100,300]){
 const v=versions(version);
 out.push({name:'observer virtual imagery readback GLSL '+version,readback:true,
 vertex:v.vertex+precision+'attribute vec2 fixturePosition;varying vec3 worldPoint;void main(){worldPoint=vec3(0.0);gl_Position=vec4(fixturePosition,0.0,1.0);}',
 fragment:v.fragment+frag+include(production.slice(0,mainOffset)+fixtureMain)});
}
console.log(JSON.stringify({sources:out,fixture:{
 constants:D,atlasSize:state.atlasSize,pages,samples,globals,
 textures:state.atlases.map(map=>({srgb:map.colorSpace===T.SRGBColorSpace,flipY:map.flipY})),
 tableFlipY:state.table.flipY
}}));
fixture.dispose();mesh.geometry.dispose();mesh.material.dispose();observer.dispose();earth.dispose();
"""


def bind(lib, name, result, *arguments):
    fn = getattr(lib, name)
    fn.restype, fn.argtypes = result, list(arguments)
    return fn


def run():
    extracted = json.loads(subprocess.check_output(
        ['node', '--input-type=module', '-e', EXTRACT], cwd=ROOT, text=True))
    sources, fixture = extracted['sources'], extracted['fixture']
    egl = C.CDLL('libEGL.so.1')
    pointer, integer, boolean = C.c_void_p, C.c_int, C.c_uint
    ip = C.POINTER(integer)
    get_proc = bind(egl, 'eglGetProcAddress', pointer, C.c_char_p)
    get_display = C.CFUNCTYPE(pointer, C.c_uint, pointer, ip)(
        get_proc(b'eglGetPlatformDisplayEXT'))
    display = get_display(0x31DD, None, None)  # EGL_PLATFORM_SURFACELESS_MESA
    major, minor = integer(), integer()
    assert bind(egl, 'eglInitialize', boolean, pointer, ip, ip)(display, C.byref(major), C.byref(minor))
    assert bind(egl, 'eglBindAPI', boolean, C.c_uint)(0x30A0)  # OPENGL_ES_API
    # ES3 supports both production shader language versions and native sRGB
    # RGBA8 texture decoding, as Three uses for the day/night DataTextures.
    attributes = (integer * 13)(0x3033, 1, 0x3040, 0x40, 0x3024, 8, 0x3023, 8, 0x3022, 8, 0x3021, 8, 0x3038)
    config, count = pointer(), integer()
    assert bind(egl, 'eglChooseConfig', boolean, pointer, ip, C.POINTER(pointer), integer, ip)(display, attributes, C.byref(config), 1, C.byref(count)) and count.value
    surface_attributes = (integer * 5)(0x3057, 1, 0x3056, 1, 0x3038)
    surface = bind(egl, 'eglCreatePbufferSurface', pointer, pointer, pointer, ip)(display, config, surface_attributes)
    context_attributes = (integer * 3)(0x3098, 3, 0x3038)
    context = bind(egl, 'eglCreateContext', pointer, pointer, pointer, pointer, ip)(display, config, None, context_attributes)
    assert context and surface
    current = bind(egl, 'eglMakeCurrent', boolean, pointer, pointer, pointer, pointer)
    assert current(display, surface, surface, context)

    def gl(name, result, *arguments):
        return C.CFUNCTYPE(result, *arguments)(get_proc(name.encode()))

    create_shader = gl('glCreateShader', C.c_uint, C.c_uint)
    shader_source = gl('glShaderSource', None, C.c_uint, integer, C.POINTER(C.c_char_p), ip)
    compile_shader = gl('glCompileShader', None, C.c_uint)
    shader_status = gl('glGetShaderiv', None, C.c_uint, C.c_uint, ip)
    shader_log = gl('glGetShaderInfoLog', None, C.c_uint, integer, ip, pointer)
    create_program = gl('glCreateProgram', C.c_uint)
    attach = gl('glAttachShader', None, C.c_uint, C.c_uint)
    link = gl('glLinkProgram', None, C.c_uint)
    program_status = gl('glGetProgramiv', None, C.c_uint, C.c_uint, ip)
    program_log = gl('glGetProgramInfoLog', None, C.c_uint, integer, ip, pointer)
    delete_shader = gl('glDeleteShader', None, C.c_uint)
    delete_program = gl('glDeleteProgram', None, C.c_uint)
    print('Native driver: ' + gl('glGetString', C.c_char_p, C.c_uint)(0x1F02).decode())

    def readback(program):
        unsigned_pointer = C.POINTER(C.c_uint)
        gen_textures = gl('glGenTextures', None, integer, unsigned_pointer)
        bind_texture = gl('glBindTexture', None, C.c_uint, C.c_uint)
        active_texture = gl('glActiveTexture', None, C.c_uint)
        texture_parameter = gl('glTexParameteri', None, C.c_uint, C.c_uint, integer)
        texture_image = gl('glTexImage2D', None, C.c_uint, integer, integer, integer, integer, integer, C.c_uint, C.c_uint, pointer)
        texture_sub_image = gl('glTexSubImage2D', None, C.c_uint, integer, integer, integer, integer, integer, C.c_uint, C.c_uint, pointer)
        uniform_location = gl('glGetUniformLocation', integer, C.c_uint, C.c_char_p)
        uniform_i = gl('glUniform1i', None, integer, integer)
        uniform_f = gl('glUniform1f', None, integer, C.c_float)
        uniform_2f = gl('glUniform2f', None, integer, C.c_float, C.c_float)
        get_error = gl('glGetError', C.c_uint)
        use = gl('glUseProgram', None, C.c_uint)
        use(program)
        gl('glPixelStorei', None, C.c_uint, integer)(0x0CF5, 1)  # UNPACK_ALIGNMENT
        gl('glDisable', None, C.c_uint)(0x0BD0)  # DITHER
        gl('glDisable', None, C.c_uint)(0x0BE2)  # BLEND
        gl('glViewport', None, integer, integer, integer, integer)(0, 0, 1, 1)
        textures = []
        buffer = C.c_uint()

        def upload(name, width, height, data=None, srgb=False, nearest=False):
            identifier = C.c_uint()
            gen_textures(1, C.byref(identifier))
            unit = len(textures)
            textures.append(identifier)
            active_texture(0x84C0 + unit)
            bind_texture(0x0DE1, identifier)
            texture_parameter(0x0DE1, 0x2801, 0x2600 if nearest else 0x2601)
            texture_parameter(0x0DE1, 0x2800, 0x2600 if nearest else 0x2601)
            texture_parameter(0x0DE1, 0x2802, 0x812F)
            texture_parameter(0x0DE1, 0x2803, 0x812F)
            payload = (C.c_ubyte * len(data)).from_buffer_copy(data) if data is not None else None
            texture_image(0x0DE1, 0, 0x8C43 if srgb else 0x8058, width, height, 0, 0x1908, 0x1401, payload)
            uniform_i(uniform_location(program, name.encode()), unit)
            assert get_error() == 0, f'{name}: texture upload failed'
            return unit

        try:
            definition = fixture['constants']
            atlas_size = fixture['atlasSize']
            pitch, border = definition['pitch'], definition['border']
            assert pitch == definition['pageSize'] + 2 * border
            assert not fixture['tableFlipY'], 'Production page-table upload unexpectedly flips rows'
            for index, name in enumerate(['earthDetailDay', 'earthDetailNight', 'earthDetailClouds']):
                metadata = fixture['textures'][index]
                assert not metadata['flipY'], 'Production atlas upload unexpectedly flips north/south'
                assert metadata['srgb'] == (index != 2), 'Production atlas color space changed'
                upload(name, atlas_size, atlas_size, srgb=metadata['srgb'])
                for page in fixture['pages']:
                    if page['layer'] != index:
                        continue
                    # Four distinct measured code values in a page make both
                    # geographic orientation and the physical slot observable.
                    middle = border + definition['pageSize'] // 2
                    colors = [bytes(color) for color in page['colors']]
                    north = colors[0] * middle + colors[1] * (pitch - middle)
                    south = colors[2] * middle + colors[3] * (pitch - middle)
                    pixels = north * middle + south * (pitch - middle)
                    payload = (C.c_ubyte * len(pixels)).from_buffer_copy(pixels)
                    texture_sub_image(0x0DE1, 0, page['slot'][0] * pitch, page['slot'][1] * pitch,
                                      pitch, pitch, 0x1908, 0x1401, payload)
                    assert get_error() == 0, 'Fixture page upload failed'
            columns, rows = definition['tableColumns'], definition['tableRows']
            table = bytearray(columns * rows * 3 * 4)
            for page in fixture['pages']:
                span = 2 ** (definition['maxLevel'] - page['level'])
                value = bytes([*page['slot'], page['level'] + 1, 255])
                for y in range(page['row'] * span, (page['row'] + 1) * span):
                    for x in range(page['col'] * span, (page['col'] + 1) * span):
                        offset = ((page['layer'] * rows + y) * columns + x) * 4
                        table[offset:offset + 4] = value
            upload('earthDetailTable', columns, rows * 3, table, nearest=True)
            upload('dayMap', 1, 1, bytes(fixture['globals']['day']), srgb=True)
            upload('cloudsMap', 1, 1, bytes(fixture['globals']['clouds']))
            uniform_f(uniform_location(program, b'earthDetailSize'), atlas_size)

            # One oversized triangle covers the one-pixel pbuffer without an
            # edge/coverage ambiguity. No whole-planet lighting enters this test.
            gl('glGenBuffers', None, integer, unsigned_pointer)(1, C.byref(buffer))
            gl('glBindBuffer', None, C.c_uint, C.c_uint)(0x8892, buffer)
            vertices = (C.c_float * 6)(-1, -1, 3, -1, -1, 3)
            gl('glBufferData', None, C.c_uint, C.c_ssize_t, pointer, C.c_uint)(0x8892, C.sizeof(vertices), vertices, 0x88E4)
            attribute = gl('glGetAttribLocation', integer, C.c_uint, C.c_char_p)(program, b'fixturePosition')
            assert attribute >= 0
            gl('glEnableVertexAttribArray', None, C.c_uint)(attribute)
            gl('glVertexAttribPointer', None, C.c_uint, integer, C.c_uint, C.c_ubyte, integer, pointer)(attribute, 2, 0x1406, 0, 0, None)
            draw = gl('glDrawArrays', None, C.c_uint, integer, integer)
            read_pixels = gl('glReadPixels', None, integer, integer, integer, integer, C.c_uint, C.c_uint, pointer)
            pixel = (C.c_ubyte * 4)()
            worst = 0.0
            for sample in fixture['samples']:
                uniform_2f(uniform_location(program, b'fixtureUv'), sample['u'], 1 - sample['vTop'])
                uniform_i(uniform_location(program, b'fixtureLayer'), sample['layer'])
                draw(0x0004, 0, 3)
                read_pixels(0, 0, 1, 1, 0x1908, 0x1401, pixel)
                assert get_error() == 0, sample['name'] + ': GPU draw/readback failed'
                channels = range(4) if sample['checkRgb'] else [3]
                error = max(abs(pixel[channel] - sample['expected'][channel] * 255) for channel in channels)
                worst = max(worst, error)
                assert error <= 2, (sample['name'] + f': GPU RGBA {list(pixel)} does not match '
                                    f'CPU linear reference {[round(c * 255, 3) for c in sample["expected"]]}')
            print(f'  {len(fixture["samples"])} actual GPU pixel cases PASS; max error {worst:.3f}/255')
            gl('glDisableVertexAttribArray', None, C.c_uint)(attribute)
        finally:
            use(0)
            if buffer.value:
                gl('glDeleteBuffers', None, integer, unsigned_pointer)(1, C.byref(buffer))
            if textures:
                values = (C.c_uint * len(textures))(*(texture.value for texture in textures))
                gl('glDeleteTextures', None, integer, unsigned_pointer)(len(textures), values)

    try:
        for source in sources:
            shaders = []
            program = create_program()
            for key, stage in [('vertex', 0x8B31), ('fragment', 0x8B30)]:
                shader = create_shader(stage)
                shaders.append(shader)
                data = C.c_char_p(source[key].encode())
                shader_source(shader, 1, C.byref(data), None)
                compile_shader(shader)
                okay, log = integer(), C.create_string_buffer(8192)
                shader_status(shader, 0x8B81, C.byref(okay))
                if not okay.value:
                    shader_log(shader, len(log), None, log)
                    raise AssertionError(source['name'] + ' ' + key + ': ' + log.value.decode())
                attach(program, shader)
            link(program)
            okay, log = integer(), C.create_string_buffer(8192)
            program_status(program, 0x8B82, C.byref(okay))
            if not okay.value:
                program_log(program, len(log), None, log)
                raise AssertionError(source['name'] + ' link: ' + log.value.decode())
            print(source['name'] + ': compile and link PASS')
            if source.get('readback'):
                readback(program)
            for shader in shaders:
                delete_shader(shader)
            delete_program(program)
    finally:
        current(display, None, None, None)
        bind(egl, 'eglDestroyContext', boolean, pointer, pointer)(display, context)
        bind(egl, 'eglDestroySurface', boolean, pointer, pointer)(display, surface)
        bind(egl, 'eglTerminate', boolean, pointer)(display)


if __name__ == '__main__':
    run()
