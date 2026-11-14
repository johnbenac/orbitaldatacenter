# Parts learning articles

The parts navigator combines configuration data with independently authored learning articles. Keep the selected design's quantities and evidence in the catalog; do not copy those values into static editorial prose.

## Module contract

Each knowledge module exports a source registry and a resolver:

```js
export const flightKnowledgeSources = {
  'flight-example': {
    title: 'Exact document or page title', organization: 'Publisher',
    url: 'https://verified.example/document', kind: 'Technical guide',
    description: 'What the reader will find here.', section: 'Optional useful chapter/page',
    reviewed: '2026-11-07'
  }
};
export function flightKnowledge(record, catalog, hardware) {
  // Return null for records outside this module's responsibility.
  return {
    key: 'stable-editorial-topic', summary: 'A useful explanation in two or three sentences.',
    sections: [
      {id:'purpose', title:'Purpose and place in the system', paragraphs:[
        {text:'Original, accurate explanatory prose.', sources:['flight-example']}
      ]},
      {id:'operation', title:'How it works', paragraphs:[{text:'...',sources:[]}]},
      {id:'engineering', title:'Interfaces and design choices', paragraphs:[{text:'...',sources:[]}]}
    ],
    suppliers:[{name:'Actual manufacturer / institution', offering:'Named product, service, or reference hardware', note:'Explain its relevance and evidence boundary.', sources:['flight-example']}],
    alternatives:[{name:'Alternative architecture', description:'When it is useful.', tradeoff:'What changes or becomes harder.', sources:['flight-example']}],
    inspection:['What to notice in this part model; do not imply unresolved internals are modeled.'],
    terms:[{term:'Term', definition:'Plain-language definition.'}],
    relatedIds:['flight:02.03'],
    sourceIds:['flight-example']
  };
}
```

Use `materialKnowledgeSources` / `materialKnowledge`, `groundKnowledgeSources` / `groundKnowledge`, and `launchKnowledgeSources` / `launchKnowledge` in their corresponding modules. Article text must be plain text; the renderer escapes it. Source references are registry IDs, never raw markup. Prefer explanatory paragraphs to repetitive bullet lists. Each article needs distinct part-specific information, credible supplier/reference examples when available, meaningful alternatives, and a curated reading list.

## Evidence rules

- Verify external links and claims using web research. Prefer original NASA/ESA publications, standards bodies, manufacturer documentation, mission reports, and payload guides. Avoid relying on third-party summaries for technical claims.
- Explain the part's role, operation, interfaces, and tradeoffs. Write original teaching prose; do not copy brochures. Respect source quotation and summarization limits.
- A supplier product is an example, not the installed item, unless the design's evidence explicitly establishes that selection. Never invent suppliers, qualification, compatibility, ratings, flight heritage, or hardware features.
- Context is reactive: inspect `record`, its parent, and `hardware` for architecture-dependent thermal paths, propulsion, launcher family, and current configured quantities. Do not describe a passive heat-pipe design as a pumped loop, or a speculative cargo mechanism as provider hardware.
- Unknown or unmodeled allocations still deserve an educational article, with their modeling limit stated separately.
- Related part IDs are filtered to the current catalog. Keep model inspection notes accurate for the available model.
- The article renderer provides a separate "In this design" section from live catalog data and a complete source list with reading descriptions. Do not duplicate boilerplate evidence disclaimers throughout every paragraph.

## Scope split

- `part-knowledge-flight.js`: flight parent MEL allocations, including fluid inventories.
- `part-knowledge-materials.js`: flight child/material-detail records.
- `part-knowledge-ground.js`: ground and site records, including service connections.
- `part-knowledge-launch.js`: launch vehicle records and launch-category separation connections.

