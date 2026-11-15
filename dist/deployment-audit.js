// Saved deployment evidence; provenance and scope are recorded per row.
export const deploymentAudit={
  "posesPerPreset": 2401,
  "stepSeconds": 0.5,
  "motionModel": "Sampled rigid-body geometry, full launch envelopes, roll material conservation and independently transformed attachment endpoints. Stiffness, joint loads and flexible-hose stresses require separate analysis.",
  "rows": [
    {
      "id": "pathfinder",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 0.93,
      "minHardwareGapM": 0.059194966,
      "closestPair": [
        "wing -1/-1 Wound photovoltaic blanket",
        "Solar electrical cassette · end-cap--1"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          -1.275,
          0.143,
          -1.324
        ],
        [
          -1.071,
          0,
          -1.324
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 1.04e-07,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 1.47e-07,
      "deployClear": true,
      "meshFitMarginM": 0.314844298,
      "fit": true,
      "radialClearanceM": 0.314831377,
      "axialClearanceM": 4.351263393,
      "evidence": {
        "status": "remeasured",
        "label": "Completed sweep · 2c86938 · suite timed out",
        "command": "node deployment-checks.mjs",
        "verificationCommand": "python3 scripts/ratchet.py --lane fast",
        "reproductionCommand": "ODC_AUDIT_ONLY=pathfinder node deployment-checks.mjs",
        "runtime": "Node v22.23.5",
        "poses": 2401,
        "stepSeconds": 0.5,
        "verificationSuiteStatus": "timeout",
        "verificationSuiteLimitSeconds": 3000,
        "note": "This preset completed and passed. The full run later reached its unchanged 3000-second limit before Carrier completed; Scale was not reached.",
        "scope": "Sampled rigid-body geometry and independently transformed attachment endpoints; not structural or flexible-cable qualification.",
        "sourceHashes": {
          "dist/protected-solar-collector.js": "f7437ae3713fa7774485a07244474ba493bbaf1934ef4b1e28b76bb3c5d6db8a",
          "dist/deployment.js": "7899f324b176a155738e0154499adb52d9851684348782d3a06c0b6ccacaceae",
          "dist/design.js": "7309a2aa43661f46640527ae5c038e80a91ce42f182e2948d6d812cb7d2b1af9",
          "dist/electrical-harness-scene.js": "27e4530728be59aea0e9a2dcb799b35bde652ee136c4f879889e663deeff72dc",
          "dist/craft.js": "d25979b64860e69061a30b651bc88833ab52633bf4771784f929dc261e89a11a",
          "dist/mission-presets.js": "412df4474ca4225c2eba5149dd8b48273952b93f73cb253618e56380cee23fbb",
          "dist/cable-installation-mass.js": "d6138320a07e6f07da17c6f8b3548df966079493ae9587310bcf6a5675260da6",
          "deployment-checks.mjs": "7144d91d8aae02b7c1b2dc859eb7017ba252a9a540f4c033af7459a19597bdf2",
          "protected-solar-collector-checks.mjs": "748fe43d04b0d892b01a25ce1736a029595a6f811ac2c811392ecf59d528c501"
        },
        "sourceCommit": "2c86938f88fef5196eb2ad839c404b913d491665"
      }
    },
    {
      "id": "reference",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 1.066205063,
      "minHardwareGapM": 0.048002166,
      "closestPair": [
        "wing -1/-1 Wound photovoltaic blanket",
        "Solar electrical cassette · end-cap--1"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          -1.75,
          0.154,
          -2.097
        ],
        [
          -1.546,
          0,
          -2.097
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 1.71e-07,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 1.31e-07,
      "deployClear": true,
      "meshFitMarginM": -0.675968565,
      "fit": false,
      "radialClearanceM": -0.732178983,
      "axialClearanceM": 1.0229933,
      "evidence": {
        "status": "remeasured",
        "label": "Completed sweep · 2c86938 · suite timed out",
        "command": "node deployment-checks.mjs",
        "verificationCommand": "python3 scripts/ratchet.py --lane fast",
        "reproductionCommand": "ODC_AUDIT_ONLY=reference node deployment-checks.mjs",
        "runtime": "Node v22.23.5",
        "poses": 2401,
        "stepSeconds": 0.5,
        "verificationSuiteStatus": "timeout",
        "verificationSuiteLimitSeconds": 3000,
        "note": "This preset completed and passed. The full run later reached its unchanged 3000-second limit before Carrier completed; Scale was not reached.",
        "scope": "Sampled rigid-body geometry and independently transformed attachment endpoints; not structural or flexible-cable qualification.",
        "sourceHashes": {
          "dist/protected-solar-collector.js": "f7437ae3713fa7774485a07244474ba493bbaf1934ef4b1e28b76bb3c5d6db8a",
          "dist/deployment.js": "7899f324b176a155738e0154499adb52d9851684348782d3a06c0b6ccacaceae",
          "dist/design.js": "7309a2aa43661f46640527ae5c038e80a91ce42f182e2948d6d812cb7d2b1af9",
          "dist/electrical-harness-scene.js": "27e4530728be59aea0e9a2dcb799b35bde652ee136c4f879889e663deeff72dc",
          "dist/craft.js": "d25979b64860e69061a30b651bc88833ab52633bf4771784f929dc261e89a11a",
          "dist/mission-presets.js": "412df4474ca4225c2eba5149dd8b48273952b93f73cb253618e56380cee23fbb",
          "dist/cable-installation-mass.js": "d6138320a07e6f07da17c6f8b3548df966079493ae9587310bcf6a5675260da6",
          "deployment-checks.mjs": "7144d91d8aae02b7c1b2dc859eb7017ba252a9a540f4c033af7459a19597bdf2",
          "protected-solar-collector-checks.mjs": "748fe43d04b0d892b01a25ce1736a029595a6f811ac2c811392ecf59d528c501"
        },
        "sourceCommit": "2c86938f88fef5196eb2ad839c404b913d491665"
      }
    },
    {
      "id": "optical",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 1.066205063,
      "minHardwareGapM": 0.048002166,
      "closestPair": [
        "wing -1/-1 Wound photovoltaic blanket",
        "Solar electrical cassette · end-cap--1"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          -1.75,
          0.154,
          -2.097
        ],
        [
          -1.546,
          0,
          -2.097
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 1.71e-07,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 1.31e-07,
      "deployClear": true,
      "meshFitMarginM": -0.675968565,
      "fit": false,
      "radialClearanceM": -0.732178983,
      "axialClearanceM": 1.0229933,
      "evidence": {
        "status": "remeasured",
        "label": "Completed sweep · 2c86938 · suite timed out",
        "command": "node deployment-checks.mjs",
        "verificationCommand": "python3 scripts/ratchet.py --lane fast",
        "reproductionCommand": "ODC_AUDIT_ONLY=optical node deployment-checks.mjs",
        "runtime": "Node v22.23.5",
        "poses": 2401,
        "stepSeconds": 0.5,
        "verificationSuiteStatus": "timeout",
        "verificationSuiteLimitSeconds": 3000,
        "note": "This preset completed and passed. The full run later reached its unchanged 3000-second limit before Carrier completed; Scale was not reached.",
        "scope": "Sampled rigid-body geometry and independently transformed attachment endpoints; not structural or flexible-cable qualification.",
        "sourceHashes": {
          "dist/protected-solar-collector.js": "f7437ae3713fa7774485a07244474ba493bbaf1934ef4b1e28b76bb3c5d6db8a",
          "dist/deployment.js": "7899f324b176a155738e0154499adb52d9851684348782d3a06c0b6ccacaceae",
          "dist/design.js": "7309a2aa43661f46640527ae5c038e80a91ce42f182e2948d6d812cb7d2b1af9",
          "dist/electrical-harness-scene.js": "27e4530728be59aea0e9a2dcb799b35bde652ee136c4f879889e663deeff72dc",
          "dist/craft.js": "d25979b64860e69061a30b651bc88833ab52633bf4771784f929dc261e89a11a",
          "dist/mission-presets.js": "412df4474ca4225c2eba5149dd8b48273952b93f73cb253618e56380cee23fbb",
          "dist/cable-installation-mass.js": "d6138320a07e6f07da17c6f8b3548df966079493ae9587310bcf6a5675260da6",
          "deployment-checks.mjs": "7144d91d8aae02b7c1b2dc859eb7017ba252a9a540f4c033af7459a19597bdf2",
          "protected-solar-collector-checks.mjs": "748fe43d04b0d892b01a25ce1736a029595a6f811ac2c811392ecf59d528c501"
        },
        "sourceCommit": "2c86938f88fef5196eb2ad839c404b913d491665"
      }
    },
    {
      "id": "carrier",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 1.312176408,
      "minHardwareGapM": 0.050567646,
      "closestPair": [
        "wing -1/-1 Wound photovoltaic blanket",
        "bus hardware"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          -2.148,
          0.165,
          -2.912
        ],
        [
          -1.834,
          0.159,
          -3.801
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 1.039e-06,
      "deployClear": true,
      "meshFitMarginM": 0.17431877,
      "fit": true,
      "radialClearanceM": 0.010314018,
      "axialClearanceM": 3.750966218,
      "evidence": {
        "status": "archived",
        "label": "Archived · earlier geometry",
        "retainedInCommit": "64b478f199575262531d33236e6d70ff4fd675d7",
        "note": "Unchanged numerical snapshot retained from the pre-repair source. It is not a measurement of the current geometry."
      }
    },
    {
      "id": "scale",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 17.799706252,
      "minHardwareGapM": 0.0278,
      "closestPair": [
        "radiator -1/0",
        "bus hardware"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          0,
          17.838,
          14.899
        ],
        [
          -9.945,
          17.255,
          -50.742
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 1.039e-06,
      "deployClear": true,
      "meshFitMarginM": -155.302698749,
      "fit": false,
      "radialClearanceM": -31.927396021,
      "axialClearanceM": -155.483536449,
      "evidence": {
        "status": "archived",
        "label": "Archived · earlier geometry",
        "retainedInCommit": "64b478f199575262531d33236e6d70ff4fd675d7",
        "note": "Unchanged numerical snapshot retained from the pre-repair source. It is not a measurement of the current geometry."
      }
    }
  ],
  "evidenceNote": "Pathfinder, Reference and Optical were remeasured at 2401 poses each on the recorded source. The full suite reached its unchanged 3000-second limit before Carrier completed. Carrier and Scale retain their earlier numerical snapshots and are explicitly archived. The recorded command and source hashes identify source snapshot 2c86938.",
  "verification": {
    "command": "node deployment-checks.mjs",
    "via": "python3 scripts/ratchet.py --lane fast",
    "runtime": "Node v22.23.5",
    "status": "timeout",
    "limitSeconds": 3000,
    "completedPresets": [
      "pathfinder",
      "reference",
      "optical"
    ],
    "incompletePresets": [
      "carrier",
      "scale"
    ],
    "runFinishedUtc": "2026-11-15T02:33:41.343586+00:00",
    "note": "The three completed presets passed. Carrier did not complete before the suite limit, and Scale was not reached. This is not a complete passing deployment suite.",
    "sourceCommit": "2c86938f88fef5196eb2ad839c404b913d491665"
  }
};
