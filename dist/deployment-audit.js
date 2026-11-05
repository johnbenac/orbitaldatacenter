// Reproduce with node deployment-checks.mjs 2400 --write
export const deploymentAudit={
  "posesPerPreset": 2401,
  "stepSeconds": 0.5,
  "motionModel": "Sampled rigid-body geometry, full launch envelopes, roll material conservation and independently transformed attachment endpoints. Stiffness, joint loads and flexible-hose stresses require separate analysis.",
  "rows": [
    {
      "id": "pathfinder",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 0.746250228,
      "minHardwareGapM": 0.039992267,
      "closestPair": [
        "wing -1/1",
        "wing -1/1 CylinderGeometry"
      ],
      "closestAt": 0.2966666666666667,
      "closestCentersM": [
        [
          -4.016,
          0,
          2.623
        ],
        [
          -0.991,
          0.148,
          1.942
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": 0.497326026,
      "fit": true,
      "radialClearanceM": 0.663041449,
      "axialClearanceM": 5.492199953
    },
    {
      "id": "reference",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 0.878300682,
      "minHardwareGapM": 0.032176299,
      "closestPair": [
        "wing -1/1",
        "wing -1/1 CylinderGeometry"
      ],
      "closestAt": 0.13875,
      "closestCentersM": [
        [
          -2.977,
          0,
          4.751
        ],
        [
          -1.439,
          0.176,
          3.084
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": 0.112585403,
      "fit": true,
      "radialClearanceM": 0.065390766,
      "axialClearanceM": 3.226584589
    },
    {
      "id": "optical",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 0.878300682,
      "minHardwareGapM": 0.032180669,
      "closestPair": [
        "wing -1/1",
        "wing -1/1 CylinderGeometry"
      ],
      "closestAt": 0.13875,
      "closestCentersM": [
        [
          -2.977,
          0,
          4.746
        ],
        [
          -1.439,
          0.176,
          3.084
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": 0.112585403,
      "fit": true,
      "radialClearanceM": 0.064331203,
      "axialClearanceM": 3.226584589
    },
    {
      "id": "carrier",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 1.025204308,
      "minHardwareGapM": 0.022096593,
      "closestPair": [
        "radiator 1/0",
        "bank 1 CylinderGeometry"
      ],
      "closestAt": 0.715,
      "closestCentersM": [
        [
          0,
          -1.672,
          5.459
        ],
        [
          -1.258,
          -0.858,
          1.898
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": 0.07887193,
      "fit": true,
      "radialClearanceM": 0.039341133,
      "axialClearanceM": 6.022098427
    },
    {
      "id": "scale",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 3.143003265,
      "minHardwareGapM": 0.005027313,
      "closestPair": [
        "radiator -1/1",
        "bank -1 CylinderGeometry"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          0,
          3.345,
          55.711
        ],
        [
          -13.853,
          2.531,
          5.139
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": -143.831355691,
      "fit": false,
      "radialClearanceM": -37.454221184,
      "axialClearanceM": -143.900855691
    }
  ]
};
