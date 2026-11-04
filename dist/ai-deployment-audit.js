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
      "radialClearanceM": 0.69545515,
      "axialClearanceM": 7.11046092,
      "meshFitMarginM": 0.78243131
    },
    {
      "id": "agents",
      "launcher": "glenn9",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.016,
      "minHardwareGapM": 0.009,
      "minCarriageGapM": 0.002,
      "fit": true,
      "radialClearanceM": 0.39939126,
      "axialClearanceM": 5.24582851,
      "meshFitMarginM": 0.53526648
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
      "meshFitMarginM": 0.63318572
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
      "axialClearanceM": -14.23301059,
      "meshFitMarginM": -13.86401059
    }
  ]
};
