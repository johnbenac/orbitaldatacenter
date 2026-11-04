# Orbital Data Center

Serve the contents of dist/ from any static HTTP(S) origin. The app uses native ES modules, a bundled copy of Three.js, and a Web Worker for chronological mission analysis. All calculations and package generation run in the client. No runtime API keys, remote compute, or build step are required.

## Use

Six persistent phase buttons organize the same design into mission inputs, subsystem design, integrated vehicle, launch and insertion, operations, and closeout. Phase A provides five starting points and reversible sizing. Phase B opens on one of nine component schematics. Phases D–F include the ten flight chapters and three operational vignettes. The integrated vehicle and compute cutaway provide a temperature overlay and editable operating/survival qualification. Launch configuration shows integration, the pad, launch ascent and separation. The Core camera reveals the internal equipment behind the thermal enclosure. The Help button supports tap-to-inspect, keyboard focus and mouseover explanations.

Size design exposes installed dimensions, resource inventories and inverse sizing targets. Fly design freezes the installed hardware and exposes the mission-wide operating policy. Pick a ground contact from the mission timeline or event browser to see the shared clock, terminal, queue, CMG, and battery state.

The quick mission preview uses representative operational days at later ages. The chronological mission sweep integrates every mission day and records substep extrema, crossings, event counts and cumulative energy and data. Preparing a quantitative PDR runs the sweep before generating the ZIP. A persistent, user-clicked download link appears after preparation and is accessible from Export again during that session. Export also provides the full static site, scenario JSON, or telemetry CSV. Import accepts PDR ZIP and scenario JSON. Scenario links store the settings in their URL fragment.

## Local checks

Run these from the checkout.

    node design-test.mjs
    node engine-checks.mjs
    node audit-test.mjs
    node geometry-checks.mjs
    node mesh-checks.mjs
    node guide-checks.mjs
    node schematic-checks.mjs
    node thermal-test.mjs
    node scene-interaction-checks.mjs
    node lifecycle-checks.mjs

The Model & sources workspace documents the engineering assumptions, sizing formulas, flight comparisons and time resolutions. The reference flight trays and ground network represent an editable design study.
