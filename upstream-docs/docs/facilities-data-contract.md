# Public test-facility atlas data contract

One record represents a real campus; `assets` represents its individually named test systems. Distances are metres, masses kilograms. Publicly documented geometry is immutable when a test article changes size. Schematic pedestals, wall thicknesses and equipment arrangement must be identified as reconstruction assumptions.

```js
{
 id: 'nasa-armstrong', name: 'Space Environments Complex', shortName: 'NASA Armstrong',
 operator: 'NASA Glenn Research Center', ownership: 'government', // commercial, academic, public-private
 country: 'United States', countryCode: 'US', city: 'Sandusky, Ohio',
 address: 'Street / postal address', addressSourceIds: ['contact'],
 location: {lat: 41.35, lon: -82.65, precision: 'campus', sourceIds: ['contact'], note: 'Approximate campus locator, not a surveyed equipment position.'},
 status: 'operational', // announced, historical, closed when explicitly known
 summary: 'Short sourced description.',
 access: 'Sourced public access / commercial enquiry statement; booking status not inferred.',
 accessSourceIds: ['overview'], url: 'https://official.example/facility',
 reviewed: '2026-11-08',
 sources: [{id:'overview',title:'Official operator facility overview',url:'https://...',publisher:'NASA',accessed:'2026-11-08',note:'Geometry table / section identifier.'}],
 assets: [{
  id:'vacuum-chamber', name:'Named thermal-vacuum chamber', kind:'thermal-vacuum',
  // kind values used by the existing part viewer: thermal-vacuum, thermal-cycle,
  // vibration, acoustic, rf-chamber, optical-bench, mass-properties, load-frame,
  // pressure-bench, electrical-bench, clean-inspection, deployment, propulsion-stand
  description:'What this system does; distinguish vacuum shell from usable thermal space.',
  geometry:{
   type:'cylinder-horizontal', // cylinder-vertical, box-room, shaker-round, shaker-square, bench
   dimensions:{diameterM:4.5,lengthM:11.8}, // boxes widthM,heightM,depthM; shakers diameterM or widthM/depthM
   dimensionRole:'chamber-interior', // working-envelope, chamber-exterior, table-surface, room-interior
   sourceIds:['overview'],
   notes:'Dimensions describe the published vacuum chamber; the shroud is smaller.',
   assumptions:['Shell thickness and supports are schematic.']
  },
  // Only include a working envelope if that envelope is actually published.
  envelope:{shape:'box',widthM:2.5,heightM:3,depthM:4.2,sourceIds:['overview'],basis:'Published thermal tent working space.'},
  // Cylinder envelope: {shape:'cylinder',diameterM:...,lengthM:...,axis:'y'|'z',...}.
  // A shaker table is an interface, not an article envelope; do not put its area here.
  // Door is a separate transport constraint, never a chamber-volume dimension.
  door:{widthM:2.5,heightM:3,sourceIds:['overview'],basis:'Published access opening.'},
  limits:{payloadKg:1000,forceSineKN:100,forceRandomKN:80,maxCgHeightM:2,temperatureMinK:100,temperatureMaxK:400,pressurePa:0.001,splDb:150},
  limitSourceIds:{payloadKg:['overview'],forceSineKN:['overview']},
  specifications:[{label:'Useful non-geometric published fact',value:'Text with unit',sourceIds:['overview']}],
  sourceIds:['overview'],
  modelNotes:'Any distinction or limitation visitors must understand.'
 }]
}
```

Omit unknown numerical values; never use zero or invented sizes to make a fit pass. Record publicly stated equipment limits, not booking availability or certification. Geometry without a published working envelope supports a dimensional reconstruction but an article-fit verdict remains unassessed. A named capability with no dimensions may be listed with `geometry: null`; a campus must still have at least one publicly dimensioned modeled asset. Dates refer to source review, not confirmation that a facility has available bookings.
