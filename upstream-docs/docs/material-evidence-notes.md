# Spacecraft material and finish evidence

Reviewed 7 November 2026. Evidence revision: `odc-material-evidence-2026-11-r1`.

## Purpose and evidence boundary

The material bank identifies what an observer is looking at: structural metal, a surface treatment, a thermal blanket, a photovoltaic assembly, an optical surface, or a deliberately unresolved material. The master equipment list supplies the installed assignment and its mass owner. The renderer uses that assignment. These are PDR material and finish allocations, with enough subordinate detail to explain visible construction; they are not a fabrication bill of materials.

The primary-source register is [material-evidence.js](../dist/material-evidence.js). Every source record includes its supported claim, applicable boundary, document location and review date. `materialSourceIds` maps the material vocabulary to supporting sources. That mapping is a lookup aid: a manufacturer benchmark does not establish that every reference spacecraft uses that product.

| Assignment status | Meaning |
| --- | --- |
| Documented | The applicable reference explicitly identifies this material class. Other details can remain allocated. |
| Inferred | The study adopts a plausible material from a relevant mechanism or hardware analogy. The reference vehicle's selection is not established. |
| PDR allocation | The workbench deliberately chooses a material or finish so the preliminary design can be represented. |
| Unresolved | An appearance is needed, but the available evidence does not support naming the installed material or complete coating system. |

The texture itself is always an illustrative representation. Even a documented material does not make its rendered wrinkle pattern, machining marks, cell pitch, roughness or optical response measured data.

## Findings that change the depiction

### Blankets and their outer covers

The familiar amber-gold appearance of many spacecraft blankets can come from polyimide over aluminum. It is not evidence for a gold structural surface. NASA's MLI specimen study also distinguishes the outer covers from the concealed reflective films and separator layers. The new material vocabulary must preserve that distinction. See [NASA's MLI optical-property paper](https://ntrs.nasa.gov/api/citations/20070017980/downloads/20070017980.pdf) and [NASA/JPL's temperature-control explanation](https://science.nasa.gov/learn/basics-of-space-flight/chapter11-4/).

White protective covers have a different construction and surface character. [Dunmore describes Beta cloth](https://www.dunmore.com/products/beta-cloth.html) as PTFE-impregnated glass cloth. Its woven outer appearance should remain distinct from wrinkled amber film, white thermal paint and glass radiator tiles. Assigning a Beta-cloth cover does not establish a complete micrometeoroid shield.

[Sheldahl's Red Book](https://www.sheldahl.com/wp-content/uploads/2023/07/RedBook.pdf) distinguishes the exposed polymer and exposed metal sides of aluminized films, as well as additional protective coatings. Blanket film orientation, outer protection, electrical bonding and seams therefore remain explicit selection work. The current thermal model's effective blanket properties should not be replaced by visible RGB colors or an average guessed from the white/amber areas.

### Radiator construction and the Redwire source case

The strongest new provider-specific material evidence is in the [Redwire paper, printed pages 8–9](https://rdw.com/wp-content/uploads/2026/05/RDW26-053-ODC-Power-Thermal-Study-White-Paper-R11-Digital.pdf). It explicitly identifies silicon photovoltaic cells and coated aluminum radiator face sheets. AZ-93 white paint is an example finish, and POCO foam or aluminum honeycomb are possible core fills. The material register should record the aluminum face sheets as documented, retain the choice among example finishes and cores as an allocation or inference, and distinguish a configured OSR surface from the paper's white-paint example. The separate heat spreader is not explicitly specified as aluminum by that passage.

Glass OSR and white paint require different textures. [Qioptiq's data sheet](https://www.excelitas.com/file-download/download/public/58606?filename=Qioptiq_Space-Qualified_Solar_Reflectors_Datasheet.pdf) specifies thin CMX/CMO glass reflectors and alternative coatings. Its glass types should not be renamed fused silica. A separate [NASA researcher discussion](https://www.nasa.gov/podcasts/welcome-to-rocket-ranch/episode-2-some-like-it-hot/) provides a silver/quartz OSR precedent. The generic library can represent glass over a reflective backing without declaring either exact supplier construction.

[AZ Technology identifies AZ-93](https://www.aztechnology.com/product/1/az-93) as nonspecular white. Its [composition disclosure](https://www.aztechnology.com/uploadimage/166612182291353.pdf) supports the zinc-oxide/potassium-silicate material family. A matte white texture is appropriate; metallic radiator stripes or a glass-tile grid would describe a different finish. The source paper's thermal assumptions and the paint manufacturer's product data have their own conditions and must not be substituted for one another silently.

### Structures, arrays and pressure vessels

[Beyond Gravity's structural portfolio](https://www.beyondgravity.com/en/satellites/mechanical-solutions/satellite-structures) supports aluminum and carbon-composite face-sheet families. Its [central-structure data sheet](https://www.beyondgravity.com/sites/default/files/media_document/2024-01/Beyond-Gravity-Satellite-Central-Structures.pdf) explicitly describes carbon-composite faces over aluminum honeycomb. That is construction evidence, not a reason to show honeycomb across an intact outer face. Core should be visible only at a cut edge or in a section.

[NASA's ROSA description](https://www.nasa.gov/centers-and-facilities/glenn/solar-cells-tested-on-flexible-array-design/) identifies carbon-fiber composite booms. This supports a restrained composite-boom representation for the modeled roll-out mechanism. It does not disclose the particular fiber, resin, layup or protection of every scaled reference design. Clear and black anodize are treatments over aluminum; [Goddard's anodize study](https://ntrs.nasa.gov/api/citations/19950025269/downloads/19950025269.pdf) also shows why the process must eventually be selected and verified.

[Northrop Grumman's PMD tanks](https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pmd-tanks) are described as all-titanium. Neutral titanium is therefore a defensible inference for the scaled study's exposed liquid-tank shells. Its [pressurant family](https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pressurant-tanks) includes both titanium and composite-overwrapped vessels, so a carbon-wound helium bottle remains a deliberate allocation. [NASA's COPV overview](https://www.nasa.gov/centers-and-facilities/nesc/deceptively-complex-composite-overwrapped-pressure-vessels-copv-remain-a-challenge-for-engineers-to-unravel/) supports the distinction between outer composite and pressure liner.

The titanium shielding assignment is a separate analogy. [Juno's NASA/JPL press kit](https://www.jpl.nasa.gov/news/press_kits/juno/spacecraft/) documents its titanium electronics vault. That precedent does not transfer Juno's thickness, dose attenuation or shielding performance to a LEO data center.

### Small visible hardware

[ArianeGroup's S400 table](https://www.space-propulsion.com/spacecraft-propulsion/apogee-motors/) specifies platinum alloy for the chamber and throat. It does not identify the entire expansion bell. A neutral metallic bell with an unresolved alloy is more defensible than an invented carbon, niobium or all-platinum construction.

The active pumped-loop model already allocates aluminum passages and stainless headers. [Goddard's ammonia heat-pipe practice](https://extapps.ksc.nasa.gov/Reliability/Documents/Preferred_Practices/1209.pdf) supplies a compatibility precedent, not a qualification of the particular pumped loop or high-temperature heat-lift concept. Copper-colored flow paths must not be interpreted as copper-wetted ammonia tubing. Copper conductors and dry thermal straps remain separate uses.

[Spectrolab](https://www.spectrolab.com/photovoltaics.html), [Sharp](https://global.sharp/solar/en/space-qualified/) and [ESA](https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Inside_a_solar_cell) support distinct silicon/multijunction cell assemblies and protective coverglass. An active cell face, its coverglass and the inactive blanket back should have separate identities, even where the coverglass appearance is integrated into one render material.

The [Anywaves portfolio](https://content.anywaves.com/hubfs/Anywaves-Datasheets/PORTFOLIO-ANYWAVES_compressed.pdf), printed page 7, identifies a Vespel radome with SG121FD white paint for the benchmark S-band TT&C antenna. The compact version uses a different polymer. This gives a strong precedent for the white cover appearance without turning the workbench's generic antenna into that purchased part.

[Glenair's SpaceWire cable](https://cdn.glenair.com/speedline/pdf/963-080-26.pdf) illustrates why a cable's buried polyimide layer should not automatically become its visible jacket: that example has an FEP exterior. Its [connector specifications](https://www.glenair.com/micro-d/low-profile-metal-and-plastic-shell-micro-d/pdf/connector-specification.pdf) support gold-over-nickel contact finishes on a different base material. Small contacts, exposed copper conductors, insulation and housings should retain those separate identities. Board and optical-window precedents are in the source register; their exact installed construction remains unselected.

## Implementation rules from the evidence

1. Material assignments belong to installed parts or surface layers and cite their parent MEL WBS. A finish or concealed layer has no independently added mass when its parent already contains it.
2. Keep existing hardware dimensions, counts, deployment, mass, power and thermal equations. A material depiction must not silently resize a panel or change the selected solar technology or radiator coating.
3. Source strength attaches to the individual assignment. A documented silicon choice does not document the entire photovoltaic blanket, support structure or visible cell circuit.
4. Use physical finishes in normal spacecraft views. Diagnostic colors for fluid identity, temperature or electrical activity are overlays; they do not define the material.
5. Texture scale, normal-map amplitude and roughness remain rendering allocations. Give them controlled IDs so they can be audited and reused, without claiming they are measured engineering properties.
6. Keep unresolved items visible in the record. A plausible appearance is useful at PDR when the unresolved alloy, coating or layup is disclosed.

## Remaining selection work

The next material decisions need component specifications or interface data: structure grades and joints; blanket outer protection and thermal zoning; radiator finish process and core; photovoltaic stack and electrical laydown; pressure-vessel shell/liner construction; optical and RF coating systems; and the heat-lift assembly's refrigerant/material envelope. These are named open items, not inferred supplier commitments.

The reviewed public sources establish material families and a few specific reference choices. They do not provide complete released material bills for all six orbital data-center concepts. Manufacturer images remain topology and appearance evidence unless an accompanying specification identifies the material.

## Register verification

The pure-data evidence module was syntax-checked and every material-to-source ID was resolved. It contains no DOM access, external fetch, model mutation or material-property substitution. The implementation can therefore use the same evidence records in the reference library, MEL and exported review packet.
