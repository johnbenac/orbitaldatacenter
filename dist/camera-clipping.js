// Perspective depth precision is concentrated near the eye. A microscopic
// fixed near plane can quantize metre-scale surfaces into the same depth value.
// Keep at least 0.5% of the eye-to-focus range, while retaining any larger
// scene-specific clearance. The focus stays 200 near-plane distances away even
// while zooming into an object, so close inspection still has useful headroom.
export function stablePerspectiveNear(distance,preferredNear=0){
 const range=Number.isFinite(distance)&&distance>0?distance:0;
 const preferred=Number.isFinite(preferredNear)&&preferredNear>0?preferredNear:0;
 return Math.max(.00001,range*.005,preferred);
}
