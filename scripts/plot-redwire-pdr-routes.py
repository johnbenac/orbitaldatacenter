#!/usr/bin/env python3
"""Plot saved native route points; this is an explanatory figure, not an audit.

Usage: python3 scripts/plot-redwire-pdr-routes.py
Reads the compact repo-owned view data extracted from the existing native
inspection. No geometry is recomputed or repaired; the original point values,
source commit and baseline digest are retained in that data.
"""
import argparse
import hashlib
import itertools
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import numpy as np

REPO = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("view_data", type=Path, nargs="?",
                    default=REPO / "docs/harnessing-work/redwire-pdr-view-data.json")
parser.add_argument("--output", type=Path,
                    default=REPO / "docs/harnessing-work/redwire-pdr-views.png")
args = parser.parse_args()
raw = args.view_data.read_bytes()
data = json.loads(raw)
if data.get("schema") != "redwire-pdr-route-view/1":
    raise ValueError("Expected compact redwire-pdr-route-view/1 data.")
selected = [next(p for p in data["poses"] if abs(p["progress"] - u) < 1e-10)
            for u in [0, .21, 1]]
route_ids = [f"P-PAY-{i}/0" for i in range(1, 5)] + [f"D-WORKER-{i}/0" for i in range(1, 5)]
colors = ["#ae4218", "#d97915", "#9a2462", "#cf6d88",
          "#146293", "#278eb1", "#287b5c", "#67a157"]

# Saved context was extracted using the application's leaf-pose functions.
# Plotting does not depend on current source geometry or transient evidence.
context = data["context"]
for key, value in data["hardware"].items():
    if abs(value - context["hardware"][key]) > 1e-9:
        raise ValueError(f"Context {key} differs from the saved inspection; do not mix geometry sources.")

# World coordinates use Y up. The plot's displayed vertical coordinate is Y;
# all labels retain the source X/Y/Z names and every panel has the same limits.
def display(points):
    return np.asarray(points, dtype=float)[:, [0, 2, 1]]

width, height, length = (data["hardware"][k] for k in
                         ["bodyWidthM", "bodyHeightM", "bodyLengthM"])
corners = np.array(list(itertools.product([-width/2, width/2],
                                        [-height/2, height/2], [-length/2, length/2])))
box = display(corners)
faces = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4],
         [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]]
all_points = [box]
for pose, platform in zip(selected, context["platform"]):
    all_points.append(display(platform["corners"]))
    for route in pose["routes"]:
        if route["id"] in route_ids:
            all_points.append(display(route["points"]))
combined = np.concatenate(all_points)
low, high = combined.min(axis=0) - .18, combined.max(axis=0) + .18

plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10,
                     "axes.labelcolor": "#485361", "text.color": "#253446"})
fig = plt.figure(figsize=(15, 8.4), facecolor="#fbfcfd")
fig.suptitle("Redwire · installed platform harness geometry", x=.035, y=.97,
             ha="left", fontsize=22, fontweight="bold")
fig.text(.035, .918,
         "Eight actual route centerlines at three saved poses · common scale · body coordinates in metres",
         fontsize=12, color="#526172")

titles = ["Stowed", "Mid-swing", "Deployed"]
for i, (pose, platform, title) in enumerate(zip(selected, context["platform"], titles)):
    ax = fig.add_subplot(1, 3, i+1, projection="3d", facecolor="#fbfcfd")
    ax.set_position([.01 + i*.32, .25, .31, .59])
    ax.add_collection3d(Poly3DCollection([box[f] for f in faces],
        facecolors="#d6dde5", edgecolors="#738291", linewidths=.6, alpha=.10))
    panel = display(platform["corners"])[[0, 1, 3, 2]]
    ax.add_collection3d(Poly3DCollection([panel], facecolors="#d7b66f",
        edgecolors="#927025", linewidths=1.2, alpha=.20))
    hinge = np.array(platform["hinge"])
    hinge_line = display([hinge + [-platform["widthM"]/2, 0, 0],
                          hinge + [platform["widthM"]/2, 0, 0]])
    ax.plot(*hinge_line.T, color="#927025", lw=1.1, ls="--")
    routes = {r["id"]: r for r in pose["routes"]}
    for route_id, color in zip(route_ids, colors):
        points = display(routes[route_id]["points"])
        ax.plot(*points.T, color=color, lw=1.0, alpha=.78)
        loop = display(routes[route_id]["flexPoints"])
        ax.plot(*loop.T, color=color, lw=2.4, alpha=1)
        ax.scatter(*loop[0], marker="s", s=20, color=color, depthshade=False)
        ax.scatter(*loop[-1], marker="^", s=25, color=color, depthshade=False)
    ax.set(xlim=(low[0], high[0]), ylim=(low[1], high[1]), zlim=(low[2], high[2]))
    ax.set_box_aspect(high-low)
    ax.view_init(elev=24, azim=-52)
    ax.set_proj_type("ortho")
    ax.set_xlabel("X (m)", labelpad=7)
    ax.set_ylabel("Z (m)", labelpad=7)
    ax.set_zlabel("Y (m)", labelpad=4)
    ax.set_xticks([-1, 0, 1])
    for axis in [ax.xaxis, ax.yaxis, ax.zaxis]:
        axis.set_pane_color((.98, .985, .99, .15))
        axis._axinfo["grid"].update(color=(.55, .62, .7, .2), linewidth=.6)
    swing = pose["upperRoot"] * 90
    ax.set_title(f"{title}\nprogress {pose['progress']:.2f} · hinge swing {swing:.0f}°",
                 fontsize=14, fontweight="medium", pad=5)

handles = [Line2D([0], [0], color=c, lw=2.4, label=r)
           for r, c in zip(route_ids, colors)]
fig.legend(handles=handles, loc="lower center", bbox_to_anchor=(.5, .16),
           ncol=4, frameon=False, handlelength=2.7, columnspacing=2.8)
fig.text(.035, .133,
         "Bold: flexible hinge section     ■ Fixed clamp     ▲ Moving clamp     Gray: bus envelope     Gold: platform planform",
         fontsize=10, color="#526172")
fig.text(.035, .095,
         "Route geometry figure, not a scene screenshot. Lines show centerlines, not cable diameter. The envelope is not a wall model;",
         fontsize=10, color="#526172")
fig.text(.035, .073,
         "equipment, other routes and detailed solids are omitted here. Their finite-radius clearances are covered by the separate native inspection.",
         fontsize=10, color="#526172")
fig.text(.035, .035,
         f"Saved route source {data['commit'][:12]} · capture {data['createdAt'][:10]} · explanatory selected-pose view, not a continuous-motion certificate",
         fontsize=9, color="#687686")
args.output.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(args.output, dpi=180, facecolor=fig.get_facecolor(), metadata={
    "Description": "Measured route points from native inspection; optional context from application deployment geometry.",
    "Source commit": data["commit"],
    "Baseline SHA-256": data["baselineSha256"],
    "View data SHA-256": hashlib.sha256(raw).hexdigest(),
})
plt.close(fig)
print(args.output)
