// Framing is a viewing preference, independent of the selected engineering
// domain and of the Compute Core cutaway camera.
export const normalizeSpacecraftFocus=value=>value==='entire'?'entire':'core';
export const spacecraftFocusAvailable=(camera,chapter,lens='vehicle')=>camera==='spacecraft'&&!(chapter==='commissioning'&&lens!=='vehicle');

// Fit only the chassis in the nominal observer frame. Appendages never enter
// this extent; manual rotations, zoom and pan remain separate camera inputs.
export function chassisFitHalfHeight(h,right,up,aspect,rotation){
 const inverse=rotation.clone().invert();
 const extent=axis=>{const u=axis.clone().applyQuaternion(inverse);return Math.abs(u.x)*h.bodyWidthM+Math.abs(u.y)*h.bodyHeightM+Math.abs(u.z)*h.bodyLengthM;};
 return Math.max(.1,extent(right)/Math.max(.01,aspect),extent(up))*.58;
}
