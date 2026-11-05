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
      "minHardwareGapM": 0.031,
      "minCarriageGapM": 0.002,
      "fit": true,
      "radialClearanceM": 0.66304145,
      "axialClearanceM": 5.68958013,
      "meshFitMarginM": 0.49732603
    },
    {
      "id": "reference",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.016,
      "minHardwareGapM": 0.031,
      "minCarriageGapM": 0.002,
      "fit": true,
      "radialClearanceM": 0.22039356,
      "axialClearanceM": 3.57800474,
      "meshFitMarginM": 0.33411483
    },
    {
      "id": "optical",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.016,
      "minHardwareGapM": 0.031,
      "minCarriageGapM": 0.002,
      "fit": true,
      "radialClearanceM": 0.219334,
      "axialClearanceM": 3.5693356,
      "meshFitMarginM": 0.33305527
    },
    {
      "id": "carrier",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.016,
      "minHardwareGapM": 0.031,
      "minCarriageGapM": 0.002,
      "fit": true,
      "radialClearanceM": 0.26180634,
      "axialClearanceM": 7.27625329,
      "meshFitMarginM": 0.34546123
    },
    {
      "id": "scale",
      "minLeafGapM": 0.002,
      "minSolarRadiatorGapM": 0.016,
      "minHardwareGapM": 0.031,
      "minCarriageGapM": 0.002,
      "fit": false,
      "radialClearanceM": -38.0752946,
      "axialClearanceM": -84.69349151,
      "meshFitMarginM": -84.32449151
    }
  ]
};
