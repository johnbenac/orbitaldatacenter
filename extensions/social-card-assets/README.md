# Social preview sources

`orbit.png` is the original 1800×1350 Blender render used for the LinkedIn banner.
The spacecraft configuration is illustrative. It is not evidence of feasibility.
See `ASSET-CREDITS.txt` for Earth/cloud texture and skybox attribution.

`../social-card.html` composes the render, Inter typography, project mark, and
approved messaging into a 1200×630 Open Graph image. Serve `extensions/` locally,
open `social-card.html` in Chromium with a 1200×630 viewport and device scale 1,
wait for images and fonts, and capture the viewport to `../social-card.png`.

The assembly script publishes only the finished PNG. Source images, fonts, and
this HTML stay outside the deployed application. Retain the credits in the image
when changing its layout, and change the image URL version in `scripts/build-site.py`
when replacing the PNG so sharing services can fetch the new asset.
