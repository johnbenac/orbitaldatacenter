// Georeferenced, locally bundled launch-range surroundings. The imagery and
// height samples are independent of the schematic launch infrastructure.
import {regions,details,sourceCatalog} from './assets/launch-sites/catalog.js';

export const launchGeographyRevision='odc-launch-geography/1';
export const launchGeographies=regions;
export const launchGeographySources=sourceCatalog;

const assignments={
 'cape-lc16':['space-coast','cape-lc16'],
 'cape-lc36a':['space-coast','cape-lc36'],
 'cape-lc36b':['space-coast','cape-lc36'],
 'ksc-lc39a':['space-coast','ksc-lc39a'],
 'ksc-starship':['space-coast','ksc-lc39a'],
 'cape-slc37':['space-coast','cape-slc37'],
 'cape-slc41':['space-coast','cape-slc41'],
 'starbase-pad2':['starbase','starbase'],
 'louisiana-study':['pecan-island','pecan-island'],
 'vandenberg-slc6':['vandenberg','vandenberg-slc6'],
 'vandenberg-slc3e':['vandenberg','vandenberg-slc3e'],
 'kourou-ela4':['kourou','kourou'],
 'wenchang-lc101':['wenchang','wenchang'],
 'wenchang-study':['wenchang','wenchang']
};

export function geographyForSite(siteId){
 const key=typeof siteId==='string'?siteId:siteId?.id, assignment=assignments[key];
 if(!assignment)return null;
 const [regionId,detailId]=assignment,region=regions[regionId];
 return region?{...region,siteId:key,detail:details[detailId]??null}:null;
}

export function geographySummaryForSite(siteId){
 const g=geographyForSite(siteId);if(!g)return null;
 return {
  schema:launchGeographyRevision,id:g.id,name:g.name,bounds:g.bounds,
  imagery:g.image,detail:g.detail,elevation:g.elevation,
  landmarks:g.landmarks,sources:g.sources,
  geometryBasis:'True geographic imagery and sampled elevation surround an approximate launch-site pin. The modeled pad, infrastructure and added scene vegetation remain illustrative; this scenery is not a survey or a current construction record.'
 };
}
