# Parts knowledge production packaging

The readable authoring modules are in `src/parts-knowledge/`. Edit these files when changing a parts article or reference. The four corresponding `dist/part-knowledge-*.js` modules and `dist/part-knowledge-text.js` are generated deployment assets.

This packaging reduces the expanded deployment size without removing article text, changing imagery, rounding values, or requiring an external runtime service. The text modules keep their existing exports and return values. The four inspection instructions that referred to the old “Surrounding assembly” control were updated to its “Installed” name before establishing the packaging equivalence baseline.

## Build and validate

```sh
npm ci
npm run package:parts-knowledge
npm run check:parts-knowledge-package
node scripts/package-parts-knowledge.mjs --check
node parts-knowledge-checks.mjs
```

Acorn is a pinned development dependency. The packaging and runtime decoder use the site's existing vendored JSZip. A fixed ZIP entry date and fixed build order make the generated files reproducible. `--check` verifies that checked-in production artifacts exactly match the authored sources.

## What is packaged

The script parses each JavaScript module with Acorn. It extracts expression-position string literals of at least 120 characters into one deduplicated table, preserving the parsed JavaScript string values. It leaves shorter strings, property keys, directives, module specifiers, template literals, functions and other code intact. Relative static imports are resolved from the authoring location and rewritten for the production module location. This is needed for the launch article module's existing `launchFleet` import.

The generated modules replace each selected literal with an indexed lookup into the shared table. The table is serialized as JSON, compressed into a single-entry ZIP, and embedded as base64 in a generated ES module. On first import, top-level await loads the existing local JSZip if needed, checks the archive CRC, decodes the JSON, validates the table shape and freezes the array. Every importer shares the same decoded module instance. No JavaScript is stored in or executed from the archive; there is no eval, Blob module, dynamic code generation, or new network dependency.

The packager checks an exact UTF-8 JSON byte round trip and deep equality of the original and decoded string values before writing any files. A SHA-256 digest of the uncompressed JSON is recorded in the generated module's comment for review and reproducibility.

## Equivalence coverage

`scripts/check-parts-knowledge-package.mjs` imports both the authored and generated modules. It compares every exported source registry and every exported knowledge function result using the same 17 configurations as `parts-knowledge-checks.mjs`: reference designs, all supported launchers, and alternate propulsion. It also verifies that neither form mutates the hardware configuration or catalog. The normal knowledge checks independently verify article coverage, citations, section navigation, rendered HTML safety and unchanged engineering data.

The source directory and build scripts remain outside `dist`; publish only the production directory through the existing Sites workflow. Do not edit the generated table or attempt to recompress article text manually.
