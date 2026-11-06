# v32 upstream validation

Date 2026-11-06

## Reproduced input

The supplied `orbital-data-center-v31.zip` has SHA-256

```text
504cfc0fb46f9c8c8a30c6678bb67c8b4298aa17b6c9f4f40ce00ddfc60afdc6
```

Its tracked source matches upstream commit `84e3590da45bde25e67f20956b129a19c53a2a89`. Running the extracted archive with Node v20.19.6 reproduced the reported assertion failure in `engine-checks.mjs` at line 13.

## Intended physical behavior

The CMGs counter the changing angular momentum of the moving terminal. Acquisition and parking can cause brief power transients. During settled tracking, their electrical demand follows the achieved gimbal motion and the complete vehicle disturbance state. The demand at an arbitrary instant during contact can be either above or below the demand before contact.

For post-separation operation, the model estimates cluster electrical power from the maximum absolute gimbal rate, normalized by the gimbal-rate limit and bounded between the installed idle and maneuver allocations. The default cluster has 228 W idle and 580 W maneuver allocations. This rate-based interpolation is an engineering power estimate.

The first post-deployment contact is Punta Arenas, from MET 4994.442 s to 5307.614 s. Its modeled CMG draw is about 228.091 W before contact, 293.580 W at acquisition +0.2 s, 228.088 W at contact +90 s, and 263.717 W while parking two seconds after contact.

## Regression corrections

`engine-checks.mjs` checks acquisition, positive application goodput, increased terminal power during transfer and cumulative delivered bytes. It samples the early acquisition transient and checks the resulting relative mechanism momentum. Five samples spanning approach, acquisition, tracking and parking must have four finite gimbal rates within their limits, power within the installed allocation, exact closure of the rate-based power equation, and a consistent angular-momentum balance.

The thirty-year preview and mission-duration independence fixtures prepare projected states with a shortened exact-history warm-up in an isolated import. They use the production ninety-day representative-block calculation. Contact, short chronological audit and disposal checks import the production simulation directly. The chapter-order assertion reuses its already-evaluated short disposal mission. Stage messages identify progress through the expensive engine checks.

An isolated mutation removing terminal-head contributions to mechanism momentum reduced the acquisition momentum change from 0.753992 N·m·s to 0.000418 N·m·s. The new 0.1 N·m·s fixture threshold rejects that disconnected mechanism. The analytical terminal-head reaction test separately checks the intrinsic and offset-motion contributions.

`ai-service-test.mjs` prepares its day-61.25 projected checkpoint using an isolated model import with a shortened exact-history warm-up. This follows the fixture approach in `attitude-projection-checks.mjs`. The background worker imports the production model and performs detailed consecutive-day propagation from that checkpoint. The test checks the projected state and epoch, supplied-checkpoint rejection, worker progress, delivered results and energy agreement with the synchronous evaluator. Its first-day worker comparison also exercises the production simulation directly.

`ENGINE.md` describes checkpoint propagation, the component-based inertia tensor, vector CMG momentum and the rate-based electrical estimate.

## Reproduction commands

Run these commands from the extracted release directory with Node v20.19.6.

```sh
node engine-checks.mjs
node ai-service-test.mjs
```

The complete engine suite evaluates the thirty-year preview, long-window continuity, age-independence and disposal checks. Allow it to finish independently of the shorter AI service regression.

An earlier run with the full-history fixtures reached a 1,800-second harness limit and received SIGTERM. It emitted no assertion failure and did not produce a completion result. That interrupted run prompted the fixture preparation changes described above.

## Release validation

All 60 default regression suites completed with exit code zero under Node v20.19.6 on Linux x64. All 185 JavaScript and MJS syntax checks passed. The 162-entry asset manifest contains unique paths, and every listed asset exists.

The complete revised engine suite took 768.188 seconds, approximately 12 minutes 48 seconds. Its thirty-year preview and traffic-ledger stage completed at 674.394 seconds. A 600-second per-suite cap interrupts this full engine run. The complete AI service suite took 119.922 seconds. These timings are measurements from this validation runner.

The fixture decisions are described above. The sixty-day production initialization also ran within the full-duration matrix and disposal-view checks. The completed default-suite inventory follows.

| Suite | Result | Elapsed seconds |
| --- | --- | ---: |
| `ai-core-checks.mjs` | Passed | 269.799 |
| `ai-purpose-ui-checks.mjs` | Passed | 42.353 |
| `ai-service-test.mjs` | Passed | 119.922 |
| `attitude-coupling-checks.mjs` | Passed | 29.706 |
| `attitude-dynamics-checks.mjs` | Passed | 0.969 |
| `attitude-engineering-checks.mjs` | Passed | 0.165 |
| `attitude-guidance-checks.mjs` | Passed | 1.423 |
| `attitude-mechanism-checks.mjs` | Passed | 5.299 |
| `attitude-projection-checks.mjs` | Passed | 10.763 |
| `audit-test.mjs` | Passed | 136.094 |
| `bay-equipment-checks.mjs` | Passed | 0.620 |
| `bay-framing-checks.mjs` | Passed | 1.827 |
| `bay-lesson-checks.mjs` | Passed | 0.266 |
| `bay-occlusion-checks.mjs` | Passed | 2.596 |
| `boostback-checks.mjs` | Passed | 0.874 |
| `celestial-sky-checks.mjs` | Passed | 0.224 |
| `choice-cue-checks.mjs` | Passed | 0.068 |
| `comm-verification-checks.mjs` | Passed | 30.555 |
| `commissioning-flight-checks.mjs` | Passed | 9.732 |
| `coordinate-triad-checks.mjs` | Passed | 0.117 |
| `coupling-ui-checks.mjs` | Passed | 346.346 |
| `deployment-checks.mjs` | Passed | 45.205 |
| `design-test.mjs` | Passed | 11.763 |
| `disposal-engine-test.mjs` | Passed | 143.020 |
| `disposal-view-checks.mjs` | Passed | 411.527 |
| `domain-checks.mjs` | Passed | 42.449 |
| `domain-graphics-checks.mjs` | Passed | 6.544 |
| `engine-checks.mjs` | Passed | 768.188 |
| `equipment-list-checks.mjs` | Passed | 14.197 |
| `flight-electronics-checks.mjs` | Passed | 17.809 |
| `flight-frame-checks.mjs` | Passed | 0.467 |
| `flight-software-checks.mjs` | Passed | 9.089 |
| `geometry-checks.mjs` | Passed | 31.784 |
| `gn-control-checks.mjs` | Passed | 52.611 |
| `inertia-checks.mjs` | Passed | 0.221 |
| `input-guidance-test.mjs` | Passed | 0.169 |
| `interface-checks.mjs` | Passed | 0.221 |
| `launch-composition-checks.mjs` | Passed | 0.720 |
| `launch-effects-checks.mjs` | Passed | 1.025 |
| `launch-fleet-checks.mjs` | Passed | 0.319 |
| `launch-hardware-checks.mjs` | Passed | 0.623 |
| `launch-path-checks.mjs` | Passed | 5.847 |
| `launch-site-checks.mjs` | Passed | 0.064 |
| `launch-structure-checks.mjs` | Passed | 0.164 |
| `lifecycle-checks.mjs` | Passed | 10.375 |
| `mass-station-checks.mjs` | Passed | 0.365 |
| `master-launch-checks.mjs` | Passed | 10.004 |
| `master-timeline-checks.mjs` | Passed | 73.483 |
| `matrix-checks.mjs` | Passed | 420.119 |
| `mesh-checks.mjs` | Passed | 1.778 |
| `operating-sweep-checks.mjs` | Passed | 16.748 |
| `orbit-vector-checks.mjs` | Passed | 0.165 |
| `propulsion-architecture-checks.mjs` | Passed | 42.094 |
| `scene-interaction-checks.mjs` | Passed | 10.572 |
| `schematic-checks.mjs` | Passed | 20.171 |
| `starship-cargo-checks.mjs` | Passed | 1.226 |
| `teaching-checks.mjs` | Passed | 19.310 |
| `terminal-activity-checks.mjs` | Passed | 54.009 |
| `terminal-wave-checks.mjs` | Passed | 5.649 |
| `thermal-test.mjs` | Passed | 90.086 |

The engine test source has SHA-256

```text
f2f7b98b13c67062459267288e3a0b3c03c86d281ba1a910f43e50b4362116b3
```

The production model source has SHA-256

```text
7ca10a42afb305e97144767780eff782f6ca5d90a39efe0679908792404fda76
```
