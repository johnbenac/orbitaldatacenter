// Reproduce with node deployment-checks.mjs 2400 --ai --write
export const aiDeploymentAudit={
  "posesPerPreset": 2401,
  "stepSeconds": 0.5,
  "motionModel": "Sampled rigid-body geometry, full launch envelopes, roll material conservation and independently transformed attachment endpoints. Stiffness, joint loads and flexible-hose stresses require separate analysis.",
  "rows": [
    {
      "id": "text",
      "launcher": "glenn",
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
      "meshFitMarginM": 0.497326026,
      "fit": true,
      "radialClearanceM": 1.122232623,
      "axialClearanceM": 7.0649933
    },
    {
      "id": "voice",
      "launcher": "terran",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 0.958300682,
      "minHardwareGapM": 0.072143693,
      "closestPair": [
        "wing -1/-1 Wound photovoltaic blanket",
        "bus hardware"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          -1.416,
          0.152,
          -1.942
        ],
        [
          -1.125,
          0.112,
          -2.587
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": 0.363480282,
      "fit": true,
      "radialClearanceM": 0.173088176,
      "axialClearanceM": 2.10291889
    },
    {
      "id": "batch",
      "launcher": "glenn",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 1.134988701,
      "minHardwareGapM": 0.060887058,
      "closestPair": [
        "wing -1/-1 Wound photovoltaic blanket",
        "bus hardware"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          -1.865,
          0.159,
          -2.459
        ],
        [
          -1.562,
          0.135,
          -3.333
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": 0.497326026,
      "fit": true,
      "radialClearanceM": 0.700247417,
      "axialClearanceM": 5.448230657
    },
    {
      "id": "agents",
      "launcher": "glenn9",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 1.445439466,
      "minHardwareGapM": 0.042806405,
      "closestPair": [
        "wing -1/-1 Wound photovoltaic blanket",
        "bus hardware"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          -2.359,
          0.168,
          -3.175
        ],
        [
          -2.039,
          0.177,
          -4.153
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": 0.497326026,
      "fit": true,
      "radialClearanceM": 0.416659337,
      "axialClearanceM": 3.932451876
    },
    {
      "id": "finetune",
      "launcher": "terran",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 0.958300682,
      "minHardwareGapM": 0.071609592,
      "closestPair": [
        "wing -1/-1 Wound photovoltaic blanket",
        "bus hardware"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          -1.377,
          0.146,
          -1.545
        ],
        [
          -1.091,
          0.112,
          -2.07
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
      "axialClearanceM": 3.959107725
    },
    {
      "id": "pretrain",
      "launcher": "glenn9",
      "minLeafGapM": 0.094,
      "minSolarRadiatorGapM": 3.973745691,
      "minHardwareGapM": 0.0278,
      "closestPair": [
        "radiator 1/0",
        "bus hardware"
      ],
      "closestAt": 0,
      "closestCentersM": [
        [
          0,
          -4.012,
          4.098
        ],
        [
          -2.168,
          -3.761,
          11.607
        ]
      ],
      "maxHingeGapM": 0,
      "maxHoseEndErrorM": 0,
      "maxLengthErrorM": 0,
      "maxHoseLengthErrorM": 0.000001039,
      "deployClear": true,
      "meshFitMarginM": -20.23689741,
      "fit": false,
      "radialClearanceM": -6.165352209,
      "axialClearanceM": -20.285956424
    }
  ]
};
