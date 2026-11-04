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
      "meshFitMarginM": 0.445904
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
      "fit": true,
      "radialClearanceM": 0.04207379,
      "axialClearanceM": 5.42061694,
      "meshFitMarginM": 0.15830455
    },
    {
      "id": "scale",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.01368167,
      "minHardwareGapM": 0.009,
      "minCarriageGapM": 0.002,
      "fit": false,
      "radialClearanceM": -38.0752946,
      "axialClearanceM": -119.44999033,
      "meshFitMarginM": -119.08099033
    }
  ]
};
