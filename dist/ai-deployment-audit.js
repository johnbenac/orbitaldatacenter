// Reproduce with node deployment-checks.mjs 2400 --ai --write
export const aiDeploymentAudit={
  "posesPerPreset": 2401,
  "stepSeconds": 0.125,
  "motionModel": "Sampled nominal rigid envelopes; full-size leaves, box-bounded installed hardware, and non-attached leaf to carriage clearances. Flexure, backlash and tolerances are excluded.",
  "rows": [
    {
      "id": "text",
      "launcher": "terran",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.016,
      "minHardwareGapM": 0.009,
      "minCarriageGapM": 0.002,
      "fit": true,
      "radialClearanceM": 0.1043933,
      "axialClearanceM": 2.62891166,
      "meshFitMarginM": 0.21811457
    },
    {
      "id": "voice",
      "launcher": "terran",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.016,
      "minHardwareGapM": 0.009,
      "minCarriageGapM": 0.002,
      "fit": true,
      "radialClearanceM": 0.29268906,
      "axialClearanceM": 2.97769874,
      "meshFitMarginM": 0.40788996
    },
    {
      "id": "batch",
      "launcher": "glenn",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.016,
      "minHardwareGapM": 0.009,
      "minCarriageGapM": 0.002,
      "fit": true,
      "radialClearanceM": 0.70644897,
      "axialClearanceM": 7.85724753,
      "meshFitMarginM": 0.445904
    },
    {
      "id": "agents",
      "launcher": "glenn9",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.016,
      "minHardwareGapM": 0.009,
      "minCarriageGapM": 0.002,
      "fit": true,
      "radialClearanceM": 0.65547975,
      "axialClearanceM": 6.76752311,
      "meshFitMarginM": 0.445904
    },
    {
      "id": "finetune",
      "launcher": "terran",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.016,
      "minHardwareGapM": 0.009,
      "minCarriageGapM": 0.002,
      "fit": true,
      "radialClearanceM": 0.44550662,
      "axialClearanceM": 3.86963321,
      "meshFitMarginM": 0.445904
    },
    {
      "id": "pretrain",
      "launcher": "glenn9",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.016,
      "minHardwareGapM": 0.009,
      "minCarriageGapM": 0.002,
      "fit": false,
      "radialClearanceM": -7.66909155,
      "axialClearanceM": -8.91648928,
      "meshFitMarginM": -8.54748928
    }
  ]
};
