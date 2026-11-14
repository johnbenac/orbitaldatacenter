// Project geometry allocations shared by rendering, launch accommodation and
// allowed operating motion. Supplier materials, pressure and cycle life remain
// separate requirements; these dimensions do not represent qualification.
export const protectedFluidAllocation=Object.freeze({
 rootStandOffM:.34,rootPlumbingReserveM:.10,
 headerMarginM:.24,minimumHeaderOffsetM:.075,rootClampWidthFraction:.32,
 rootClampInboardM:.15,fixedClampZM:-.64,movingClampZM:-.18,fixedClampLiftM:.08,
 bulkheadWidthFraction:.10,flexLengthM:.98,flexRadiusM:.014,flexBendM:.084,
 pipeRadiusM:.018,pipeBendM:.108,unionPortXM:.13,unionPortYM:.15,
 statorPortZM:-.18,statorCenterZM:-.14,statorLengthM:.14,
 rotorZM:-.04,unionRadiusM:.19,unionLeadXM:.19,
 unionCrossYM:.25,unionCrossZM:-.14,pitchPipeYM:.40,
 pitchStatorOffsetM:.48,pitchRotorOffsetM:.36,pitchTransferRadiusM:.10,
 fixedFeedBackM:.80,
 pitchTransferPortZM:-.14,pitchElbowZM:-.26,pitchInboardXM:.45,
 rollDeliveryXM:.045,rollDeliveryPortZM:-.01,rollDeliveryElbowZM:.16,
 rollDeliveryElbowHeightM:.06,
 returnOuterMarginM:.62,returnStandOffM:.24,returnTipInsetM:.10,
 socketHalfM:.04,socketContainmentRadiusM:Math.sqrt(3)*.04+.001
});

export function protectedUnionOutletControls(a,xa,off,side,sign){
 // A transverse pipe lies inside the first folded-panel gap. The turn to the
 // header occurs outboard of the panel edge, preserving its full thickness.
 return [[xa-side*.28,a[1],a[2]],[xa,off,a[2]]];
}
