import {routeLength} from './connection-routes.js';

/** An explicit non-proof span union must cover every actual centreline metre. */
export function motionSpansCoverRoute(route,spans){
 const points=route?.renderedPoints||route?.points;
 if(!Array.isArray(points)||!Array.isArray(spans)||!spans.length||spans.some(m=>!m||m.proofOnly||!Number.isFinite(m.startM)||!Number.isFinite(m.endM)||m.startM<0||m.endM<m.startM))return false;
 let covered=0;for(const m of [...spans].sort((a,b)=>a.startM-b.startM)){if(m.startM>covered+1e-10)return false;covered=Math.max(covered,m.endM);}const length=routeLength(points);return Number.isFinite(length)&&covered+1e-10>=length;
}
