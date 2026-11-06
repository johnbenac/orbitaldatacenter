import {icon} from './icons.js';

// Direction belongs to the viewer. Every instrument samples the forward flight record at MET.
export function flightButtons(direction,label,{loading=false,primary='btn',id=''}={}){
 const attr=loading?'data-loading-play':'data-action',fwd=direction>0,back=direction<0;
 const forward=loading?'':'flightplay',reverse=loading?'reverse':'flightreverse';
 const forwardAria=loading?' aria-label="'+(fwd?'Pause payload loading':label==='Replay loading'?'Replay payload loading':'Play payload loading')+'"':'';
 return '<button type="button" class="'+primary+'" '+attr+'="'+forward+'"'+(id?' id="'+id+'"':'')+forwardAria+' aria-pressed="'+fwd+'">'+icon(fwd?'pause':'play',14)+' '+(fwd?'Pause':label)+'</button>'+
  '<button type="button" class="btn flight-reverse" '+attr+'="'+reverse+'" aria-pressed="'+back+'" aria-label="'+(back?'Pause reverse playback':'Play in reverse')+'" data-tip="Retrace the recorded mission at the selected playback speed.">'+(back?icon('pause',14):'<svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M13 2 3 8l10 6Z"/></svg>')+' '+(back?'Pause reverse':'Reverse')+'</button>';
}
