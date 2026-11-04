// Prepared files retain a live object URL until a replacement is ready or the page closes.
const ready=new Map();
const escape=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function retainFile(key,blob,name,detail=''){
 if(!(blob instanceof Blob)||!blob.size)throw new Error('The export produced an empty file.');
 const previous=ready.get(key),file={key,blob,name,detail,url:URL.createObjectURL(blob)};
 ready.set(key,file);if(previous)URL.revokeObjectURL(previous.url);return file;
}
export const preparedFile=key=>ready.get(key);
export const fileSize=blob=>blob.size>=1e6?(blob.size/1e6).toFixed(2)+' MB':Math.max(1,Math.round(blob.size/1000))+' kB';
export function fileLink(key,title){const f=ready.get(key);if(!f)return '';return `<a class="btn export filelink" href="${escape(f.url)}" download="${escape(f.name)}" data-tip="Save the prepared ${escape(f.name)} file to your device.">${escape(title)} <span>${fileSize(f.blob)}</span></a>`}
export async function saveWithPicker(key){
 const f=ready.get(key);if(!f)throw Error('Prepare the file first.');
 const handle=await window.showSaveFilePicker({suggestedName:f.name});const writer=await handle.createWritable();await writer.write(f.blob);await writer.close();
}
export function releaseFiles(){for(const f of ready.values())URL.revokeObjectURL(f.url);ready.clear()}

