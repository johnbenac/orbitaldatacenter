// Reproduce with node deployment-checks.mjs 2400 --write
export const deploymentAudit={
  "posesPerPreset": 2401,
  "stepSeconds": 0.5,
  "motionModel": "Sampled rigid-body geometry, full launch envelopes, roll material conservation and independently transformed attachment endpoints. Stiffness, joint loads and flexible-hose stresses require separate analysis.",
  "rows": [
    {
      "id": "pathfinder",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 0.83,
      "minHardwareGapM": 0.080601569,
      "closestPair": [
        "wing -1/-1 Wound photovoltaic blanket",
        "bus hardware"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          -1.182,
          0.143,
          -1.324
        ],
        [
          -0.902,
          0.095,
          -1.964
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": 0.497326026,
      "fit": true,
      "radialClearanceM": 0.540811022,
      "axialClearanceM": 4.351263393
    },
    {
      "id": "reference",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 0.966205063,
      "minHardwareGapM": 0.071800065,
      "closestPair": [
        "wing -1/-1 Wound photovoltaic blanket",
        "bus hardware"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          -1.596,
          0.154,
          -2.097
        ],
        [
          -1.302,
          0.113,
          -2.887
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": -0.169310946,
      "fit": false,
      "radialClearanceM": -0.398573639,
      "axialClearanceM": 1.0229933
    },
    {
      "id": "optical",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 0.966205063,
      "minHardwareGapM": 0.071800065,
      "closestPair": [
        "wing -1/-1 Wound photovoltaic blanket",
        "bus hardware"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          -1.596,
          0.154,
          -2.097
        ],
        [
          -1.302,
          0.113,
          -2.887
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": -0.169310946,
      "fit": false,
      "radialClearanceM": -0.398573639,
      "axialClearanceM": 1.0229933
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
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": 0.17431877,
      "fit": true,
      "radialClearanceM": 0.010314018,
      "axialClearanceM": 3.750966218
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
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": -155.302698749,
      "fit": false,
      "radialClearanceM": -31.927396021,
      "axialClearanceM": -155.483536449
    }
  ]
};
