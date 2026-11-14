# Orbital Data Center

Orbital Data Center is a static Three.js engineering workbench. The spacecraft, subsystem diagrams, event playback and exported results use one client-side numerical model. The distribution includes the renderer, its assets and the mission-integration worker.

The current engineering basis is **workbench/model 22.0**, **design rules ODC-MB-001 Rev B**, and **r2 reference architecture families**, with the **ODC-01 Rev I** installation retained for legacy studies. This is a living preliminary design near the end-of-Phase-B level of detail; visitors are reviewers, and there is no formal PDR closure to achieve. Configurable missions evaluate an installed spacecraft; the workbench does not require every selectable mission to close.

**Harnessing follows the Redwire trial: steps 1–3 only.** The [Redwire result](docs/harnessing-work/redwire-pdr-routing.md) records the installed-route inspection, platform inspection controls, selected-pose movement checks and individual harness mass accounting. Its master equipment list includes every complete harness, and the calculated cable/termination mass enters the vehicle totals once. See the [active scope](docs/harnessing-pdr-scope.md) and revised [Harnessing Plan](https://chatgpt.com/library?file_id=libfile_fde3_f-0f515944425c8191b5830d023851c0b1_0cb434008e808191ac4277e8c6f9d899&account_id=personal). The public preliminary review continues; other concepts remain queued until requested. Completed installation repairs remain; the detailed H12 material-proof campaign stays deferred.

To run the checkout locally, start a static server from the project directory and open http://localhost:8000.

```sh
python3 -m http.server 8000 --directory dist
```

To deploy, upload the contents of `dist/` to an HTTP(S) static host, preserving the relative paths. Scenario links restore a configuration from the URL fragment on that host.

## Design reference orbital data centers

Open **Design reference data centers** (`?reference=designs`) to inspect the catalog, compare published characteristics, and open a configured study. The default reference is **Redwire 8 kW**. The four main entries are Redwire, Starcloud-3, SpaceX Starmind AI1 and Orbital-1 / Reflex. Orbital's June 2026 configuration is retained as a historical comparison; Star Catcher's self-powered node is an analytical benchmark. Historical and analytical entries remain visibly identified.

| Reference | Published power boundary | Published spacecraft mass | Evidence |
| --- | --- | --- | --- |
| Redwire 8 kW | 8 kW compute + 2 kW spacecraft services | Unpublished | [Power and thermal engineering study](https://rdw.com/wp-content/uploads/2026/05/RDW26-053-ODC-Power-Thermal-Study-White-Paper-R11-Digital.pdf) |
| Starcloud-3 | 235 kW stated; IT/generation and average/peak boundaries unspecified | Approximately 2,000 kg | [Factory interview with attributed company figures](https://www.sourcery.vc/p/breaking-23b-starcloud-factory-tour) |
| Starmind AI1 | 175 kW average compute; up to 250 kW peak compute | Unpublished | [SpaceX AI1 specification](https://new.spacex.com/spacexai/starmind) |
| Orbital-1 / Reflex · September 2026 | Peak power approaching 250 kW; accounting boundary unspecified | Unpublished | [Platform development announcement](https://www.reflexaerospace.com/press-releases/orbital-selects-reflex-as-exclusive-satellite-platform-partner-space-data-center-constellation) |
| Orbital · June 2026 | Approximately 100 kW solar generation | Roughly 2,000 kg | [Historical company announcement](https://orbital.inc/press/orbital-100000-constellation.html) |
| Star Catcher self-powered node | 250 kW average total; approximately 192.3 kW IT derived using PUE 1.3 | 10,275 kg calculated from 41.1 kg per total kW | [Analytical self-powered baseline](https://www.star-catcher.com/news/the-orbital-data-center-power-problem-and-how-to-solve-it) |

`dist/reference-centers.js` is the immutable source catalog. Quantities retain units, accounting boundaries, source IDs and arithmetic derivations. `dist/reference-evidence.js` attaches dated evidence to individual dimensions, counts, connections and equipment choices: published specifications, qualitative manufacturer imagery, supplier intent, regulatory applications, source-derived quantities, project allocations and unresolved fields. The catalog presents an evidence graphic and an expandable field/source matrix. Evidence counts are not qualification progress. Unpublished values remain `null`.

The implementation boundary, source versions, conservation invariants and remaining qualification work are documented in [Architecture differentiation r2](docs/architecture-differentiation-r2.md).

The August 4 AI1 page-data archive supplies a dated 210 kW array rating, 250 W/m² solar density and 160 m² liquid-radiator statement. The first two imply 840 m² effective collecting area only if their rating conditions match. The radiator face convention is unresolved: the catalog retains a separate stated-area field, while the runnable study explicitly chooses 160 m² planform and two emitting faces. September Orbital never inherits June's mass or span. Starmind's ambiguous 75 kW/t does not supply a fabricated mass. Starcloud's 400-foot deployable statement is not treated as full span or collecting area; its May 200 kW / 3 t and October 235 kW / 2 t statements retain distinct source dates.

`dist/reference-configurations.js` supplies complete, repeatable **reference-family studies**, revision `odc-study-2026-11-r2`. Opening one proposes its entire configuration for review. Each family drives the installed geometry, equipment and thermal connections, while public facts remain separate from the engineering realization:

| Reference | Installed family | Source constraints and explicit interpretation |
| --- | --- | --- |
| Redwire | `redwire-platform` | Two 2 m × 20 m ROSA wings, one 3.25 m square compute/radiator platform, passive payload transport and a separately allocated auxiliary-bus heat path. |
| Starcloud-3 | `starcloud-inline` | Thin central bay, two inline radiator/PV sequences and two optical stations. Dimensions, segmentation and mapping of the initial terminal procurement remain explicit interpretations or allocations. |
| Starmind AI1 | `starmind-cross` | 75 m × 30 m deployed constraint, broad paired solar wings, opposed radiator blades and independently modeled half-duty pumping loops. |
| Orbital June | `orbital-rack` | Rack-centered layout and 100 m full solar span. April imagery is a historical visual antecedent; 100 kW means generation, not IT. |
| Orbital September | `orbital-reflex` | Separate Reflex-led revision with a preliminary allocated layout; no borrowed June mass or span. |
| Star Catcher self-powered | `heatlift-study` | Distinct cold side, powered heat pump and hot radiator. 1,100 m² PV; analytical COP/rating and geometry; no claimed packaged manufacturer vehicle. |

Missing bus equipment remains a declared allocation. Published source geometry is not enlarged to make a resource budget pass. The comparison shows model dimensions, mass, performance, shortfalls, applicability and unresolved evidence separately. A conservative allocated bus mass does not refute a company mass statement with a different power or mission boundary.

The installed communications package independently selects Ka backup and S-band TT&C while retaining the family’s optical stations. The AI1 recipe uses optical plus S-band as a project allocation and omits the common large Ka terminal. Other r2 and legacy defaults retain the full package. Omitted equipment is removed from geometry, mass, power, service and verification; no S-band means an unresolved independent command/tracking path. Bench tests of absent radios are not applicable and receive no qualification credit.

Redwire’s dossier includes a separate fixed-reference thermal comparison at the published 8 and 10 kWt payload loads. It distinguishes source spatial maxima from modeled lumped interface temperatures and exposes a 2 kW bus sensitivity. This comparison is independent of edited spacecraft inputs. The operational bus strap is an additional allocation with an unassessed hinge route, distinct from the paper’s electrical-only hinge arrangement.

**Source mission** and **Common comparison** preview identical installed hardware under different mission conditions. `dist/reference-missions.js` supplies explicit altitude, inclination, epoch and RAAN/LTAN: Redwire retains 1,500 km SSO; Starcloud and Orbital select clearly allocated altitudes inside their filing envelopes; AI1's exact altitude and LTAN remain allocations. The common case is 550 km circular, 53° and five years. Case selection changes the catalog preview; opening the study reviews the complete proposed inputs. Neither action silently sizes hardware.

The standard resource screen retains EOL resources, the conservative zero-beta eclipse bound and the shared margin policy. A separately labeled environmental screen uses the minimum sampled sunlight fraction from seasonal geometry in the first and last mission year. Its graphic shows the sampled eclipses beside the zero-beta bound. Zero sampled eclipse does not establish uninterrupted sunlight or mission-wide closure. Epoch/LTAN, sampling limits, model applicability and qualification are presented separately. Users can change a mission until it fails; shortfalls remain visible.

### Reference identity and saved variants

`referenceCenterId` identifies the public concept. `referenceCenterRevision` identifies the workbench recipe and is distinct from the source publication's revision. `architectureFamily` identifies the actual installed topology; `referenceMissionCase` records the source/common starting case. Vehicle, mission and analysis identifiers describe the installed configuration and evaluation conditions. Editing a study retains its reference association while identifying it as a modified variant. Importing a scenario restores its saved inputs rather than rebuilding from a newer recipe.

`dist/reference-configurations-r1.js` preserves all six complete version-50 input snapshots and their original descriptions. A legacy study defaults to `protected-core` and its original common mission. `buildReferenceDesign(id, {revision: 'odc-study-2026-11-r1'})` retrieves that archived configuration; `buildReferenceDesign(id, {missionCase: 'source'})` or `{missionCase: 'common'}` opens the current family recipe. An unchanged earlier recipe is identified as earlier rather than falsely marked edited. Current recipes disclose changed hardware fields. Updating to the current reference remains an explicit reviewable action.

**Payload Operations** controls the customer workload and evaluates it against the installed spacecraft. Choosing live text, voice, batch inference, research/engineering, fine-tuning or training changes workload assumptions without silently replacing the reference's hardware. Whole-reference selection and explicit sizing actions remain separate, reviewable design changes.

## Arrange the workspace and capture graphics

The navigation toggle in the top bar hides or shows the Data Center Designs, Mission Domains and References sidebar on desktop. It starts open on a fresh page load. Closing it gives the workbench the available width, and reopening it restores the sidebar's chosen width. Mobile keeps its slide-out drawer.

Drag the grip below the 3D view or a Phase B schematic to change its height. The divider beside the 3D view adjusts its width relative to the guide, and the desktop navigation rail has a draggable right edge. Sizes are saved in the current browser. **Reset layout** restores the defaults; a focused grip also supports arrow keys, Shift + arrow for larger steps, and Home or double-click to reset that dimension. Camera orbit, pan and zoom retain their existing controls.

**Save image** downloads a PNG of the arranged view, including visible scene labels, legends and the background. It renders up to a 3840-pixel edge, subject to the renderer's framebuffer and eight-megapixel allocation limit, and briefly holds the mission clock while preparing imagery. **Record video** captures the selected visualization using its existing playback controls. Video uses up to a 1920-pixel edge; the software 3D fallback records at the displayed resolution to keep the animation and controls responsive. **Stop & download** finishes a local MP4 when the browser supports it, otherwise WebM. The filename extension follows the encoder. A recording timer stays visible while scrolling; changing the captured workspace or leaving the tab finishes the recording. Clips are limited to ten minutes or 256 MiB. A **Download again** link retains the latest file if the browser does not start an automatic download.

Capture controls also accompany subsystem schematics, ground-processing and umbilical diagrams, communications test paths, orbital power/thermal plots and flight-control graphics. Their current CSS animation and numerical state are sampled into the output. The controls export the selected artwork without page navigation, editing controls or screen-sharing permission. `workspace-layout.js`, `capture-ui.js` and `capture-artwork.js` own this presentation behavior; layout and capture settings do not change the engineering design.

## Fly the launch vehicle

In Phase A, choose Launch Vehicle and a compatible facility. The change preview shows the launch-site assignment and the insertion angles for departure from that site at the design epoch. Phase D opens the full stack, pad works and vehicle detail cameras. The first-minute controls use real mission seconds. In Earth Orbit the site marker and the ascent trace share the same Earth rotation as the spacecraft.

Open `?phase=D&domain=launcher&chapter=pad&launcher=starship&met=-8` to watch Super Heavy and Starship at Starbase Pad 2. Substitute `falconHeavy` for the LC-39A mission or `ariane64` for ELA-4 in French Guiana. These examples start with a site-matched insertion orbit. An imported study retains its specified orbit and reports its separation from the site-local ascent until the visitor adopts the site-derived angles.

## Launch sites and umbilicals

**Explore pad services** opens the selected launch position in Phase D. **Launch site** frames its fixed infrastructure, **Umbilicals** inspects the selected connection, and **Pad works** follows the launch table and exhaust routing. The service workbench below the viewer provides a diagram, selectable functional circuits, physical connection states and mission-clock milestones. It also appears in the Launch Vehicle design and analysis workspaces. Selecting an internal spacecraft/carrier interface uses an explicitly marked inspection cutaway; other views restore the fairing.

`dist/launch-sites.js` is the immutable catalog of seven ranges, twelve complexes and fourteen launch-position records. Fifteen allowed vehicle/site combinations cover all ten fleet variants. A complex can contain multiple mounts: the Falcon and proposed Starship installations at LC-39A share a complex identity but retain separate support and service records. Both Terran R recovery options use LC-16. The compatibility helpers normalize a mismatched imported site to the selected vehicle's default, and selectors offer only compatible sites.

`dist/launch-site-infrastructure.js` records support structures, lightning protection, water supply/suppression, exhaust works and commodity services with per-feature sources and evidence states. Documented infrastructure, proposals, study assumptions and unknowns are distinct. The renderer does not infer lightning masts or water towers from regional scenery. An unknown layout is not a claim that the real site has no protection. Commodity vessels are symbols for the identified services, not an asserted tank inventory. Map pins and spatial offsets remain approximate.

`dist/launch-umbilicals.js` defines a separate preliminary service architecture for every fleet variant and assigned launch position. Functional circuits include distinct fuel/oxidizer allocations for each liquid stage, vehicle electrical services, payload checkout power/data, environmental conditioning, and the retained spacecraft/carrier interface. Rows are functional service paths rather than physical connector or hose counts. The ground connection releases at the modeled launch boundary; retained payload power/data conductors and separation circuits release at spacecraft separation. Physical connection is separate from electrical energization or fluid flow. Publicly unallocated pinouts, current limits, pressures, purge/pressurant routing and extraction loads remain open mission-ICD work. The spacecraft's flight-bus voltage is not used as an assumed ground-supply rating.

`dist/launch-pad-infrastructure.js` and `dist/launch-umbilical-visuals.js` consume those records. Geometry is built once per configuration; deterministic clock state moves the ground heads and retained leads without rebuilding meshes during playback. Flight receptacles remain on their own stages. A selected service is highlighted by static routing markers, which do not claim measured flow. The water effects, UI and master timeline share `launchWaterSequence`; unresolved water architectures produce no invented deluge event.

The **Design rules & margins** workspace's **Launch sites & umbilicals** section carries the selected-site plan, service/disconnect diagram, complete connection register, responsibility and evidence requirements. `dist/launch-ground-plan.js` supplies the same controlled record to offline baseline HTML/JSON and the PDR archive. The archive adds `launch-ground/launch-ground-plan.html`, the selected site and full relational catalog, the vehicle-specific umbilical design, a connection CSV and interface-verification CSV. Playback and camera selection cannot change the spacecraft design or accept any verification item.

Focused checks (`launch-site-checks.mjs`, `launch-umbilical-checks.mjs`, `launch-pad-visuals-checks.mjs` and `launch-ground-plan-checks.mjs`) cover catalog relationships and evidence, all 15 vehicle/site routes and 209 functional circuits, independent fluid services, both disconnect boundaries, arbitrary rewind, retained hardware, cutaway restoration and site-driven water/lightning geometry. The geometry checks sample retained leads against rising core, upper-stage and booster bodies; this detects illustrative mesh interference, not verified flight clearance. `pdr-ui-checks.mjs` covers the actual controls and `pdr-export-checks.mjs` verifies a real PDR ZIP round trip. Existing launch support, exhaust, flight trajectory and integration-facility checks remain part of verification.

### Launch vehicle appearance and geographic surroundings

**Surroundings** is a new Phase D camera beside **Launch site**. It opens a broader geographic view, retaining ordinary orbit, pan and the existing finite zoom range. The location badge identifies the selected launch mount and range. Short leader labels identify geographic features beside their anchors; the integration-facility annotation style remains unchanged. The launch-site record includes an actual aerial thumbnail and an expandable imagery/elevation source record. Use `lens=surroundings` in a Phase D pad URL to open that view directly.

`dist/launch-geography.js` associates every launch-position record with one of six bundled regional landscapes and the appropriate local imagery patch. `dist/assets/launch-sites/catalog.js` records bounds, image dimensions, native source resolution, bundled ground sample size, acquisition dates, elevation datum, attribution and source URLs. U.S. geographic imagery/elevation, French orthophotos and Copernicus satellite imagery are used according to available coverage; exact datasets and licenses accompany the assets. Source imagery can predate the current pad. Future unassigned launch mounts remain labeled regional studies. The Kourou pin now locates the mapped Ariane 6 launch-pad area within ELA-4 instead of the broad complex center.

`dist/launch-environment.js` maps those rasters onto elevation meshes in local metres (+X east, −Z north), without vertical exaggeration. Regional and detailed levels meet at matching boundaries; local grading preserves the modeled flame trench. Geographic terrain, coastlines and visible roads come from the source imagery. Image-guided vegetation, water reflections, fine concrete/asphalt texture, illustrative daylight and atmospheric continuation outside the data extent are presentation details. The surrounding landscape does not supply verified building dimensions, facility allocations or operating procedures. Its provenance is included in the design-rules workspace's launch-ground record and exported JSON/HTML.

Vehicle markings are provided by `dist/launch-livery.js`: SpaceX, Blue Origin, Relativity Space, United Launch Alliance, Arianespace/ArianeGroup and CASC/CALT. Artwork conforms to the actual cylindrical or fairing radius profile and belongs to its own retained or separable part. Parametric and unflown vehicle markings are illustrative placements, not a particular mission's paint plan. Painted aluminium, bare aluminium, stainless weld bands, composite skirts and ceramic tiles use separate color and surface-data textures. The existing customer mission patch is retained. Asset provenance and surface-generation instructions are in `dist/assets/launch-vehicles/README.md`.

The WebGL launch pipeline uses color-managed textures, filtered environment reflections, anisotropic sampling, bounded shadow maps and atmospheric distance. It selects a high-performance context when available. The Canvas fallback supports texture repeats, tint, cutout alpha, versioned texture-cache invalidation, vertex colors, distance fog and a camera-relative panoramic sky. It reuses projection buffers and culls out-of-view objects. GPU reflections and normal-map detail remain WebGL features. No display embellishment changes the mass, power, thermal or performance calculations.

Only the selected site's imagery and elevation load, with a visible loading status. Assets are served locally with the Site; no Google API, map-service token or external runtime imagery request is required. Changing launch assemblies cancels pending geographic loads and releases their textures, including roughness, bump and normal maps. `launch-rendering-checks.mjs` verifies the fallback texture/alpha/fog/sky contracts; geographic checks verify real asset bounds and elevation, alongside the existing launch and camera checks.

## Follow flight pointing

**Studio lighting is the default** for new views and scenarios without a lighting choice. Realistic lighting remains selectable; saved scenarios and explicit `lighting=realistic` links retain that choice. The lighting control changes visibility only; solar generation and thermal calculations continue to use the modeled environment.

**Mission insignia.** The sidebar, loading artwork and vehicle livery use `dist/mission-patch.svg`. The optical reduction in `dist/mark.svg` supports small favicons. Run `python tools/build-identity.py` with Pillow and Inkscape to rebuild the static PNG, ICO, splash and ZIP assets. Visitors can download the artwork from **Mission patch** in the footer.

### Earth from orbit

The Earth Orbit globe retains its existing NASA imagery, progressive 4K base and selected 16K surface tiles. The close spacecraft and launch cameras use a separate regional imagery controller: **81,920 × 40,960 day and night maps and a 40,960 × 20,480 cloud field**, selected by their projected texel size across the visible Earth. These are downsampled from larger NASA originals, not enlarged low-resolution maps. Camera, Earth rotation and actual drawing-buffer dimensions determine the required regions; expanding the viewport requests more detail. The close-camera implementation is shared by every subsystem's orbital view.

Three bounded texture atlases and one geographic page table retain up to 49 visible pages per layer on devices with a 4096-pixel texture limit, or 9 with a 2048 limit. Three concurrent image requests and an eight-parent decode cache bound loading; ready coarse coverage remains until its finer replacements arrive. All images are bundled with the Site and the offline download. A loading indicator accompanies refinement, and unchanged redraws reuse the completed Earth layer. No runtime imagery service or API key is required.

Both cameras use the same Sun-driven surface, raised clouds, cloud shadows, night emission, ocean glint and atmospheric slant paths. Earth lighting follows the inertial Sun regardless of the spacecraft's Studio lighting selection.

The Canvas renderer intersects the Earth analytically per pixel, retaining the same regional detail and continuous horizon without inheriting the general scene renderer's 2048-pixel texture cap or sphere tessellation. Only the smooth interior atmospheric light field is interpolated on an 8-pixel grid; geographic imagery, cloud edges, the limb and depth remain sampled per pixel. A cached Earth layer avoids rebuilding it for unchanged foreground-only redraws. Native WebGL uses the same appearance constants and cloud/atmosphere geometry. These are visual appearance models; the mission radiation, thermal and orbit calculations remain independently defined.

The surface is the September 2004 Blue Marble Next Generation composite; night lights are Black Marble 2016. Close views use the native grayscale lights-only sectors, decoded as sRGB display intensity before tint and emission. The overview retains its existing color night map and context mask. The cloud field preserves the broad NASA Blue Marble pattern and adds aligned observed detail from the original 2001 cloud hemispheres where valid; the existing broad field completes polar regions and narrow source joins. These are archival visual composites, not live weather or calibrated light-intensity products. Source URLs, dimensions, checksums, credits and exact processing are recorded in `dist/vendor/earth/` and `dist/vendor/earth-detail/`, with reproducible preparation scripts under `scripts/`. The Model & sources panel links the NASA records.

`earth-detail-checks.mjs` verifies complete visible-region coverage, LOD selection, resize demand, Earth rotation/dateline registration, parent retention, bounded loading, cache settlement and cancellation. `earth-rendering-checks.mjs` checks geographic sampling, illumination and depth. `earth-gpu-checks.py` compiles globe and observer shaders in GLSL100 and GLSL300 and reads back actual GPU pixels to verify atlas addressing, color transfer and fallback against CPU sampling. Existing orbital-frame and camera checks protect observer position, Sun direction and free navigation. Expand viewport also supports an in-page expanded view when native browser fullscreen is unavailable; Escape returns to the workbench.

**Flight vectors** starts on in orbital views. Cyan shows inertial velocity and gold points toward the Sun, including in eclipse. Lavender points to the selected station when it is above its configured elevation mask. The Earth Orbit arrow ends at the station. The closer cameras use shortened arrows for inspection. The switch is saved in shared designs, and `vectors=off` opens a clean view. The sky uses a bundled equatorial Milky Way survey and the same Sun direction as the lighting model.

Open `?phase=E&domain=attitude&chapter=contact&met=9390&play=0` for the live-text starter just before its sunlit pass over Canberra. Play from there or select a contact in the orbit-response plot. The Spacecraft camera follows the local orbital frame. Compute Core follows the bus, and Earth Orbit shows the station, ground track and spacecraft. Switching cameras preserves the instant.

The same realized vehicle axes, four wing-drive angles (a common command), two fluid-carrying radiator roots and terminal boresight drive the geometry, projected sunlight, Earth exposure, drag, joint power, link acquisition and thermal balance. The operational radiators rotate at the root after their outer hinges lock. Phase B explains the mode priorities and actuator limits. Phase C compares editable pointing laws at matched instants. In Phase E, playback and event selection operate the clock.

## Navigate the mission

Opening Phase F prepares the carried mission-age inventory, disposal trajectory and displayed engineering window in a local background worker. The calculation card reports actual preparation stages and elapsed time, and Cancel leaves the prior workspace in place. Direct Phase F links and reloads use the same preparation path. Prepared checkpoints and plot data are reused when the view opens; the full chronological sweep remains separately identified while a preview is shown. If workers are unavailable, the same solver yields between bounded computation slices.

The phase tabs select the kind of work. The domain navigation selects the subsystem or question. The same sixteen domains are available in all six phases.

| Phase | Work in this phase |
| --- | --- |
| A · Mission inputs | Evaluate mission and workload inputs on the installed reference study or saved variant, review explicit sizing proposals, and select the retirement route. |
| B · Subsystem design | The Preliminary design section shows the installed configuration, engineering graphic, numerical checks and evidence needed at PDR. The Analysis section below shows the clock, charts, operating quantities and ledger. Follow buses, coolant loops, payload queues, actuator momentum, mass allocations or natural and induced environmental loads. |
| C · Integrated vehicle | Inspect assembled hardware in 3D. Pin the current design and change one input to compare responses at matching mission times. Full chronological comparisons add whole-mission quantities and histories. |
| D · Launch and insertion | Inspect the stowed stack, fairing fit and assembly clearances. Follow ascent and release. The spacecraft trims after its appendages lock. |
| E · Operations | Use the shared clock to inspect commissioning, compute bursts, ground contacts, reboost and momentum unloading. |
| F · Decommissioning | Review the selected retirement maneuver, actual consumption, achieved trajectory and endpoint. Targeted reentry follows a modeled surviving reference body. Graveyard transfer reports the raised orbit. |

The domains are Mission CONOPS, Environment, Flight Dynamics, Payload Operations, Data & Delivery, Communications, Electrical Power, Thermal, Attitude Determination & Control, Propulsion, Mass Budget, Launch & Insertion, Launch Vehicle, Mechanical Design, Command & Data Handling, and Flight Software. Design reference selection is a persistent design workspace, independent of the mission domains.

In Phase E, open Communications and its engineering instruments. Select a ground pass on the timeline. Read the terminal acquisition, dish direction, CMG draw, pack charge and recorder queue at the same instant. Move the 24-hour window later in the mission to inspect the effects of aging hardware.

The thermal view maps six modeled nodes to fixed Kelvin color scales. Select a node to inspect its operating or survival range, temperature and signed margin. The selected-window and chronological-mission reviews also report excursions.

## PDR design workspaces

All sixteen domains contain an instantiated preliminary design: a parameterized engineering graphic, installed design quantities, numerical capability checks, applicable GOLD references, explicit evidence gaps and PDR / later verification products. The **Design rules & margins** workspace's **Domain assessments** tab opens the review workspace for each domain; **Architecture & interfaces** connects the reference mission, topology decision and shared subsystem interfaces.

The installed vehicle and mission case have separate reproducible identifiers. Changing the orbit, environment, workload or service target evaluates the existing hardware. Selecting a sizing action proposes a revised configuration; once accepted, the installed quantities are retained. Solar sizing includes the adopted >15% EOL power screen, and dry mass carries the separate >10% basic-mass PDR headroom. Unknown item growth, qualification, uncertainty or provider evidence remains open even when numerical screens meet.

Each domain reports three separate results: **numerical capability**, **study/interface applicability**, and **evidence and acceptance**. An installation can have a numerical shortfall while remaining inside a model's supported range. An orbit beyond the nominal drag source range marks the affected flight-dynamics and propulsion analyses; it does not invalidate the unchanged compute hardware. Inside an allocated study envelope does not establish qualification. Nominal operating life is assessed separately from PDR reserve compliance, so an unmet PDR reserve does not by itself imply zero operating life.

The quantitative PDR retains a primary graphic for every active domain and the supplemental domain graphics. The architecture program supplies seven standalone SVGs for seasonal illumination, matched packaging, electrical distribution, thermal transport, compute fabric, the Earth-service route, and structural/control bounds. The offline reports preserve the same status axes, assumptions and interface records as the workbench.

The package includes `design/configuration-contract.json`, `design/energy-system.json`, `design/service-architecture.json`, `design/architecture-trade.json`, and `design/applicability.json`. The reference dossier retains the physical manifest, actual launch interface, mission and sampled source environment, field evidence, assembly checks and separate qualification status. Redwire’s fixed-reference thermal comparison is also exported as `reference/source-thermal-comparison.json`. `mission-baseline/architecture-program.html` and its JSON record connect the decisions, evidence products and public comparisons. Standalone program drawings are under `interfaces/`; domain records, original graphics and supplemental SVGs are under `domains/`. The bounded `pdr-*-checks.mjs` suites exercise calculations, hardware/mission invariants, actual input and sizing events, and the export/import round trip.

## Design rules and shared engineering policy

**Design rules & margins** (`?reference=mission`) establishes ODC-MB-001 Rev B: the tailored systems engineering management plan for PDR at the end of Phase B, fixed margin definitions, a complete GSFC-STD-1000I rule disposition register, equipment maturity evidence and PDR closure products. It separates project adoption from completed verification. All 77 active GOLD rules and 59 reserved slots are accounted for. Read-only policy and the current design assessment can be downloaded as a complete HTML plan, JSON or rule CSV; the same records are included in the quantitative PDR package.

The persistent **Spacecraft architecture**, **Master equipment list** and **Master timeline** views are available from every phase under Data Center Designs. Their active records derive from the selected physical family or saved variant. The protected central core, four solar wings and two articulated radiator banks remain the legacy `protected-core` family. Current references use their distinct payload and deployment topology. Lifecycle phase never selects a different architecture, and changed mission conditions evaluate the installed design. Published dimensions and declared engineering allocations retain their evidence boundaries. Legacy matched architecture trades retain their own comparison conditions rather than replacing the selected reference's configuration.

The matched architecture trade compares that integrated installation with a compact core/external backbone and attached compute/radiator modules, holding useful load, orbit, life and major resources constant. Candidate estimates carry additional hinges, fluid or electrical interfaces, local shielding and compute obscuration as applicable. Only the selected topology uses the integrated station layout and tapered-fairing check. The alternatives have defined PDR selection gates and do not masquerade as qualified flight vehicles. A sized variant can exceed a component study limit, an engine's published range or a launch vehicle's available envelope.

The equipment list gives separate power, dimensions and mass bases and sources. Mechanical Design filters equipment stations by WBS, part number or subsystem and calculates the selected group’s center of mass. Command & Data Handling records spacecraft commands and housekeeping alongside the AI payload. The equipment list separates supplier reference masses from the vehicle allocations and rolls them up through dry, wet and launch mass. CSV and JSON retain the work breakdown structure, source information and sizing basis. The quantitative PDR includes the installed equipment register, vessel volumes, engine stations, mass properties at depletion states and geometric clearance screens.

## Explicit subsystem interfaces

**Electrical power.** The selected 120 V reference family and optional 400 V development family have finite MPPT, payload, service, battery-converter and distribution ratings. The installed family's two or four source wings feed a regulated main bus, isolated 48 V payload branches and a 28 V flight/service rail. Routed wire lengths, conductor sizes, current and voltage-drop limits determine harness mass and loss. The `solarDelivery` input covers cell packing and array mismatch; MPPT conversion and harness loss are calculated separately. Battery C-rates remain bounded by installed conversion capacity. Source-cell voltage, protection, arcing/EMC, rotary interfaces and exact supplier qualification remain evidence tasks. The 400 V case is a project development allocation, not inherited 120 V flight qualification. Source boundaries are recorded in [energy-system.js](dist/energy-system.js).

**Thermal transport.** The selected family determines the transport graph. Redwire compute rides on its radiator, using an allocated local spreader/heat-pipe path and a separate bus thermal path without a remote payload pump. AI1 has two independent half-duty loop allocations, each with duty and standby pumps. The retained common pumped circuit has a shared pump station and two isolatable parallel branches; those branches alone do not establish independent redundant loops. The analytical heat-lift family has cold and hot stores and a powered compressor: hot-side rejection includes its served electrical work. Pumped cases retain pressure, velocity, capacity and fluid-property screens; high-temperature heat lift receives no ammonia-correlation credit. Finite thermal stores, conservative exchanges, implicit radiation and explicit heater loads advance the temperatures. Physical emitting area remains distinct from coupling and bypass state. Contact resistance, component temperature limits and qualification stay visible. See [architecture-thermal.js](dist/architecture-thermal.js), [thermal-network.js](dist/thermal-network.js) and [ENGINE.md](ENGINE.md).

**Compute and Earth service.** Repeated trays have an explicit host, memory, cold-plate, electrical and data boundary. Additional host modules are counted only when the tray's included resources do not cover the allocation. The onboard fabric selects finite 25/50/100/200/400 Gbit/s physical ports, uses an 80% useful-rate allocation, and checks topology, bisection, cable routing and local memory placement. The common optical interface allocates at most 1,600 Mbit/s per direction from a 2 Gbit/s line rate. Starcloud's two installed terminal stations use the separately sourced up-to-25 Gbit/s intersatellite capability, with the customer fraction and gateway still allocated. The direct optical Earth receiver remains a distinct 2 Gbit/s allocation; compatibility with those terminals is unverified. A relay cycle loses the greater of the configured handover and a 35 s acquisition requirement. Neither one nor two terminals receive automatic simultaneous make-before-break service credit. Provider compatibility, receiver ephemeris, peer scheduling and optical ground-weather availability remain unassessed. These definitions are in [service-architecture.js](dist/service-architecture.js).

**Checkpoint custody.** Training reserves two restart slots. A pending write consumes the installed storage interface over time while the last complete checkpoint remains intact. The model advances the committed recovery point only when the entire pending package has been written. Requests during an active save are deferred; a partial file is not counted as a completed save. Payload hashes, autonomous recovery and power-loss behavior remain verification requirements. Fast representative-day projections identify their custody estimates; chronological integration retains the discrete commit history. See [data-custody.js](dist/data-custody.js).

**Mechanical, navigation and assurance.** Preliminary beam bounds and a conservative longeron-only load path expose structural/control and launch-load sensitivities. Mechanism torque calculations use documented analysis-stage factors against explicit project output requirements. GNSS and independent S-band ground tracking have separate position, velocity and insertion-correction requirements; the nominal propagator still assumes exact state. Propulsion reports a deterministic uncertainty sensitivity alongside the unresolved statistical 3σ gate. Shield areal mass and Al-equivalent thickness receive no invented dose or SEE credit. Component application differences, five-year life allocations, command independence, isolation and recovery provisions are recorded with their remaining evidence in [architecture-trades.js](dist/architecture-trades.js).

## Save, share and export

Start from a design reference to obtain a complete configured study, then explore mission and subsystem choices. The catalog's **Open reference study** action reviews the complete replacement configuration. Payload Operations workload changes keep the installed hardware; explicit sizing actions can propose a different installation.

The compact current-design bar provides **Save as…** and **Saved designs**. Named designs preserve inputs, sizing mode and thermal requirements. Open, import, download and unload them in **Saved designs**. Existing scenario links and earlier preset JSON files reopen their stored configuration.

In Phase A, hover or focus an input for selection advice. Its **?** button opens the basis, worked example where available, and links to the relevant source sections. **Model & sources** includes a searchable field guide. GEVS and the Goddard GOLD Rules anchor environmental verification and margin guidance. Worked study values, equipment references and mission requirements are identified separately.

**Payload Operations** assigns one Earth customer workload to the installed design: live text, live voice, batch inference, agentic research or engineering, fine-tuning, or training. The design-change dialogue shows changes to workload assumptions and calculated performance. Flight phases inspect the committed goal. Saved files that predate the purpose field open under live text. Older purpose-domain links are redirected into the current workload workspace.

The service analysis records customer outcomes against the modeled direct contacts or an explicitly assumed relay allocation. The selected-day study and the optional multi-day order study have independent horizons. Training requires calibration evidence to claim target quality. The model transfer budget gives ideal active transfer times after the selected artifact is released. PDR exports include the installed compute estimate and selected-window customer metrics.

**Launch Vehicle** compares carrier configurations and their reference payload, fairing and recovery assumptions. **Launch & Insertion** follows the selected spacecraft on that carrier through integration and release. In design phases a change review shows replaced inputs, retained interfaces to check, updated coupled quantities and any exceeded sizing limits. Cancel or apply the proposal before switching hardware. A carrier change keeps the active sizing mode and the mission-specific allowance.

**Master timeline** is under Data Center Designs. Open `?reference=timeline` for the liftoff callout, or `?reference=timeline&segment=countdown&events=all` for the full final count. Four approximate ground-processing dates and two launch-control planning calls precede the animated hour before release. The early flight record ends at the close of the first complete ground-station window beginning after deployment, or after 24 hours of operations if none completes. An earlier mission boundary can shorten the window. The CSV and JSON carry the complete unfiltered sequence, reference association, saved recipe revision and active vehicle/mission/analysis identity. They are included in the quantitative PDR under `operations/master-timeline`.

**Mechanical Design** shows how each stowed solar roll and each rigid folded radiator transfers inertial load into a long face of the primary box. The cutaway, drawings, component stations, launch restraints, tray lattice and tapered fairing screen use the shared installation coordinates. Phase D offers end-on and side elevations of the stowed spacecraft. The live-text factory build pairs the revised spine with New Glenn for clearance in the forward taper. Explicit launcher selections in imported designs retain their original value.

**Flight Software** follows the same mode executive and encoder feedback that drive the vehicle. Inspect priority, body and engine permissions, terminal lock, or the two-sided radiator exposure. Pointing guides show the achieved geometry. The acute angle to a radiator face normal is 90° at grazing incidence.

**Share** restores the scenario, phase, domain, camera, clock and selected event. **Export & import** provides scenario JSON, telemetry CSV, a static-site bundle and the quantitative PDR ZIP. Scenario JSON and PDR packages can be imported from a design phase.

Reference-linked scenario JSON includes a portable snapshot of the published record and its source URLs alongside the exact saved inputs. The PDR adds `design/design-reference.json`, with the published reference separated from the active modeled metrics, assumptions and resource assessment. `reference/design-reference-comparison.json` carries the entire source catalog and the active study in separate records; its CSV companion is a long-form table of published quantities, units, boundaries, derivations and source URLs. `review-revision.json` also retains the reference and recipe identifiers. Existing archive filenames, `scenario.json`, and the `mission-baseline/` policy folder remain compatible with earlier imports; the latter preserves ODC-MB-001 policy and the complete GOLD disposition register.

The quick mission preview uses representative days for later mission ages. **Run mission analysis** integrates each mission day in sequence in a local Web Worker. Preparing a PDR uses the chronological run and includes the printable quantitative review, design budgets, evaluated clearances, thermal requirements, time histories and verification data. After preparation, the download link remains available in the current session.

## Calculation feedback

Costly actions acknowledge the input immediately and show the current calculation stage and elapsed time. Design changes run the sizing assessment and matched mission preview in a dedicated local worker before opening **Review design change**. **Cancel calculation** stops that worker and retains the installed design. Accepting a reviewed proposal has its own feedback while the spacecraft, diagrams and budgets refresh. Navigation, mission-window changes, comparisons, imports and site packaging use the same activity display; archive progress reports the actual file count and compression progress.

The activity card uses live status announcements, keyboard-accessible cancellation and a reduced-motion presentation. Related controls remain unavailable only while their action runs, preventing duplicate proposals. The numerical models and review criteria are unchanged. Browsers without module workers show the same feedback and run the comparison locally; cancellation cannot interrupt a synchronous calculation in that fallback.

New expensive actions should use `runWork` in `dist/app.js`. Reuse its active job for nested work, report actual stages, yield before synchronous calculation, and keep cancellation available only before committing a design. Keep worker calculation and main-thread rendering separate; never add an artificial wait or simulated percentage.

## Commissioning playback

Open Phase E and select **Deploy spacecraft**, or use `?phase=E&domain=conops&chapter=commissioning`. The 20-minute study sequence begins at mission elapsed time 900 s. You can scrub it, pause it, select a stage or inspect the moving tip drum and radiator knuckle. At sequence end the clock pauses for verification. Continue to operations to follow the mission.

Four roll-out solar blankets stay attached at their individual roots. Two side-mounted radiator banks swing at their permanent root hinges, open their outer panels, latch and then admit coolant. The Sources and Architecture pages link the flight and supplier publications used for these mechanisms.

## Local verification

From the checkout, run the production-model regression suites with Node.js.

```sh
node design-test.mjs
node engine-checks.mjs
node audit-test.mjs
node disposal-engine-test.mjs
node geometry-checks.mjs
node deployment-checks.mjs
node deployment-checks.mjs 2400 --ai
node mesh-checks.mjs
node schematic-checks.mjs
node thermal-test.mjs
node scene-interaction-checks.mjs
node domain-graphics-checks.mjs
node domain-checks.mjs
node matrix-checks.mjs
node lifecycle-checks.mjs
node coupling-ui-checks.mjs
node launch-fleet-checks.mjs
node input-guidance-test.mjs
node mission-baseline-checks.mjs
node pdr-flight-checks.mjs
node pdr-resources-checks.mjs
node pdr-service-checks.mjs
node pdr-integration-checks.mjs
node pdr-ui-checks.mjs
node pdr-export-checks.mjs
node design-review-task-checks.mjs
node work-feedback-checks.mjs
node architecture-design-checks.mjs
node architecture-geometry-checks.mjs
node architecture-energy-checks.mjs
node architecture-integration-checks.mjs
node architecture-radio-runtime-checks.mjs
node reference-centers-checks.mjs
node reference-history-checks.mjs
node reference-thermal-comparison-checks.mjs
node pdr-applicability-checks.mjs
node energy-design-checks.mjs
node service-architecture-checks.mjs
node checkpoint-runtime-checks.mjs
node ai-purpose-ui-checks.mjs
node ai-core-checks.mjs
node ai-service-test.mjs
```

**Model & sources** documents equations, reference conditions, technology assumptions and model boundaries. **Numerical checks** provides reproducible comparisons in the workbench. Data volumes use decimal GB and TB, mission elapsed time is measured from the selected UTC epoch, and component temperatures use kelvin.


## Launcher-specific spacecraft processing

Phase D / Integration now includes the launcher- and site-specific processing route, an annotated 3D facility, and a separate ground-processing rehearsal. Labels are on by default and follow the spacecraft, service connections, ground carts, fixtures and receiving hardware. The original compact pins sit beside each object with short leaders; crowded pins are hidden instead of being moved into left/right label columns. Work area again uses the full integration-area framing and its original finite zoom range during processing rehearsals. Ground equipment and Test point cameras support detailed service inspection.

Clicking a leader centers its object once, preserving the current zoom, viewing angle and camera preset. It does not select or track a service connection. Pan, rotation, wheel zoom, keyboard controls and touch gestures remain available when started over a label. Close inspection cameras can zoom back out to the surrounding facility or launch site; broad overview cameras retain their original finite zoom range. Home resets the current camera's pan and zoom. `leader-camera-checks.mjs` covers leader focus, overlay gestures, close-camera retreat and saved-view restoration.

`processing-facilities.js` contains 14 facility records covering all 15 supported launcher/site combinations. Provider-documented routes, facilities in development and study concepts retain distinct evidence states. Astrotech is assigned only where the guide establishes the route; other uses are candidates. Wallops is a reference and possible offsite test-service context, not a launch-site assignment to this fleet. Local power, grounding, cleanroom, fluid compatibility, crane capacity, transport route and operating acceptance remain mission-specific open items. The geometry represents schematic work areas, not surveyed building CAD.

Eight rehearsals cover receipt/cleanliness, battery charging, spacecraft propellant loading, coolant service, RF checkout, optical alignment, mass/interface metrology and closeout. `groundProcessingState()` drives the 2D diagrams and cached 3D cues from one normalized progress value. Playback has its own clock, pauses on navigation and backgrounding, and stops service activity when pickup begins. The compact player beside the 3D view and the detailed processing panel share controls. Nothing in a rehearsal changes installed equipment, propellant mass, flight SOC, the mission clock or verification acceptance. RF playback preserves the selected S-band/Ka bench; optical uses the existing enclosed fixture.

Fuel and oxidizer have separate portable skids, source/recovery vessels, transfer paths and explanatory animation windows. No real loading rate, pressure or operational valve procedure is prescribed. The ammonia flight-coolant circuit stays separate from the secondary ground-cooling loop through a conceptual heat exchanger. Battery energy follows configured design targets and is labeled illustrative. Detailed communications experiments remain available in their original workbench.

The source-linked planning matrix separates factory environmental qualification/acceptance from receiving, site functional/compatibility checks and configuration handover. GEVS Rev B, the Wallops range/I&T handbooks, Astrotech services, provider user guides and NASA fluid-servicing references establish the planning basis. Preliminary environments and the verification approach belong at PDR; final test specifications and approved operating procedures remain later controlled products. Every rehearsal evidence item stays open.

**Design rules & margins** has a Ground processing section and includes the full plan in its offline HTML/JSON. Quantitative PDR ZIPs add `ground-processing/processing-plan.html`, `processing-plan.json`, `verification-plan.csv` and `facility-and-gse.json`. Static flight-load and energy targets are exported separately from illustrated playback readings. The existing approximate campaign dates and compressed handling timeline are retained.

Focused checks: `processing-facilities-checks.mjs`, `ground-processing-checks.mjs`, `bay-annotations-checks.mjs`, `bay-framing-checks.mjs`, `bay-occlusion-checks.mjs`, `bay-lesson-checks.mjs`, `mission-baseline-checks.mjs`, `master-launch-checks.mjs`, `pdr-integration-checks.mjs`, `pdr-ui-checks.mjs`, and the actual ZIP round trip in `pdr-export-checks.mjs`. The UI regression covers operation selection, seek state, navigation cancellation and unchanged design identities. Existing failing assertions in `interface-checks.mjs` (agents starter) and `bay-equipment-checks.mjs` (pretrain/glenn9 pickup) were reproduced against unmodified published source; neither is introduced by this update.
