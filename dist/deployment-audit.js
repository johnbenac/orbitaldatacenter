// Reproduce with node deployment-checks.mjs 2400 --write
export const deploymentAudit={
  "posesPerPreset": 2401,
  "stepSeconds": 0.125,
  "motionModel": "Sampled nominal rigid envelopes; full-size leaves, box-bounded installed hardware, and non-attached leaf to carriage clearances. Flexure, backlash and tolerances are excluded.",
  "rows": [
    {
      "id": "pathfinder",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.016,
      "minHardwareGapM": 0.009,
      "minCarriageGapM": 0.002,
      "fit": true,
      "radialClearanceM": 0.44550662,
      "axialClearanceM": 4.36833556,
      "meshFitMarginM": 0.63318572
    },
    {
      "id": "reference",
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
      "id": "optical",
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
      "id": "carrier",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.016,
      "minHardwareGapM": 0.009,
      "minCarriageGapM": 0.002,
      "fit": false,
      "radialClearanceM": -0.37215762,
      "axialClearanceM": 3.48751796,
      "meshFitMarginM": -0.22036078
    },
    {
      "id": "scale",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.00561726,
      "minHardwareGapM": 0.009,
      "minCarriageGapM": 0.002,
      "fit": false,
      "radialClearanceM": -38.0752946,
      "axialClearanceM": -212.251744,
      "meshFitMarginM": -211.882744
    }
  ]
};
