// Normalized side elevations for the fleet cards. +Y is up in the 3D scene;
// these paths run from nose at y=12 to the engine plane at y=144.
export function spacexSilhouette(id){
 if(id==='starship'){
  const welds=Array.from({length:14},(_,i)=>`M29  ${70+i*4.7}h8`).join('');
  return `<g><path d="M28.6 142V67h8.8v75z" fill="#b8c4c7"/><path d="M29.2 141V75m6.8 66V73" stroke="#72828a" stroke-width=".8"/><path d="${welds}" stroke="#8e9da1" stroke-width=".35"/><path d="M28.4 67v-3h9v3z" fill="#33444e" stroke="#a6b8bc" stroke-width=".5"/><path d="M30 65v1m2-1v1m2-1v1m2-1v1" stroke="#cfdbda"/><path d="M28.8 71l-3.6 1v1.6l3.6-.6m8.3-2 3.4 1v1.6l-3.4-.6" fill="#73868b" stroke="#536672" stroke-width=".55"/><path d="M28.5 64V32c0-9 1.8-15 4.5-20 3 5.4 4.5 11.1 4.5 20v32z" fill="#b9c6c8"/><path d="M28.5 64V32c0-9 1.8-15 4.5-20-1.6 5.7-1.8 11.6-1.8 20v32z" fill="#34454e"/><path d="M28.9 47l-3.3 10.1v6.7l3.3-1m8.1-15.8 3.3 10.2v6.6l-3.3-1M29.9 23l-2.6 6.8v4.2l2.1-1.4m6.7-9.6 2.5 6.8v4.2l-2.1-1.4" fill="#7d9097" stroke="#52656e" stroke-width=".45"/><path d="m28.8 141-1.3 2.2h11l-1.4-2.2" fill="#596973"/></g>`;
 }
 if(id==='falconHeavy'){
  const core=(x,side)=>`<g transform="translate(${x},0)"><path d="M-3.4 141V${side?68:62}${side?'q.2-6 3.4-9.5 3.2 3.7 3.4 9.5':'h6.8'}v${side?73:79}z" fill="#e4e7e5" stroke="#809099" stroke-width=".5"/><path d="M-3.4 73h6.8v2.4h-6.8zm0 67v-16l1.4 1.3 1.7 15h.5l1.7-15 1.4-1.3v16z" fill="#394650"/><path d="M-3.2 141l-.7 2.1h7.8l-.7-2.1z" fill="#65737c"/></g>`;
  return `<g>${core(25.6,true)}${core(40.4,true)}${core(33,false)}<path d="M29.6 62V44l-1.6-3.8V26q0-6.8 5-12 5 5.2 5 12v14.2l-1.6 3.8v18z" fill="#e2e8e6" stroke="#809099" stroke-width=".65"/><path d="M29.6 56h6.8v7h-6.8z" fill="#3b4852"/><path d="M31 16q-2.8 5.6-2.2 12v12" fill="none" stroke="#f8f9ee"/></g>`;
 }
 return '';
}
