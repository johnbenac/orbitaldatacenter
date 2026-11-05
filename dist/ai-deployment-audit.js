// Reproduce with node deployment-checks.mjs 2400 --ai --write
export const aiDeploymentAudit={
  "posesPerPreset": 2401,
  "stepSeconds": 0.5,
  "motionModel": "Sampled rigid-body geometry, full launch envelopes, roll material conservation and independently transformed attachment endpoints. Stiffness, joint loads and flexible-hose stresses require separate analysis.",
  "rows": [
    {
      "id": "text",
      "launcher": "terran",
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
      "id": "voice",
      "launcher": "terran",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 0.878300682,
      "minHardwareGapM": 0.031685577,
      "closestPair": [
        "wing -1/1",
        "wing -1/1 CylinderGeometry"
      ],
      "closestAt": 0.08666666666666667,
      "closestCentersM": [
        [
          -1.906,
          0,
          4.422
        ],
        [
          -1.314,
          0.176,
          2.863
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": 0.39498401,
      "fit": true,
      "radialClearanceM": 0.382643614,
      "axialClearanceM": 3.844443665
    },
    {
      "id": "batch",
      "launcher": "glenn",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 0.878300682,
      "minHardwareGapM": 0.032432737,
      "closestPair": [
        "radiator 1/0",
        "bank 1 CylinderGeometry"
      ],
      "closestAt": 0.71875,
      "closestCentersM": [
        [
          0,
          -1.572,
          4.829
        ],
        [
          -1.062,
          -0.742,
          1.79
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": 0.497326026,
      "fit": true,
      "radialClearanceM": 0.609961999,
      "axialClearanceM": 7.827344062
    },
    {
      "id": "agents",
      "launcher": "glenn9",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 0.878300682,
      "minHardwareGapM": 0.027307471,
      "closestPair": [
        "radiator 1/0",
        "bank 1 CylinderGeometry"
      ],
      "closestAt": 0.7204166666666667,
      "closestCentersM": [
        [
          0,
          -1.858,
          5.968
        ],
        [
          -1.279,
          -0.742,
          2.083
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": 0.497326026,
      "fit": true,
      "radialClearanceM": 0.520575341,
      "axialClearanceM": 6.429158886
    },
    {
      "id": "finetune",
      "launcher": "terran",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 0.878300682,
      "minHardwareGapM": 0.03246177,
      "closestPair": [
        "wing -1/1",
        "wing -1/1 CylinderGeometry"
      ],
      "closestAt": 0.25083333333333335,
      "closestCentersM": [
        [
          -4.005,
          0,
          3.37
        ],
        [
          -1.178,
          0.176,
          2.281
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": 0.39498401,
      "fit": true,
      "radialClearanceM": 0.391099638,
      "axialClearanceM": 5.220056998
    },
    {
      "id": "pretrain",
      "launcher": "glenn9",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 1.689030322,
      "minHardwareGapM": 0.005541522,
      "closestPair": [
        "radiator -1/1",
        "bank -1 CylinderGeometry"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          0,
          1.891,
          13.204
        ],
        [
          -3.451,
          1.383,
          2.028
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": -16.959083177,
      "fit": false,
      "radialClearanceM": -7.547153845,
      "axialClearanceM": -17.028583177
    }
  ]
};
