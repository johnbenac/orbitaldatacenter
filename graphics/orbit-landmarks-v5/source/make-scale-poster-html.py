"""Derive poster-scale-strip.html from poster.html: put the common-scale landmark lineup
(renders/landmark-scale-strip.png) in the footer bar between the CTA text and the URL.
poster.html itself is not modified.  Cards are reordered smallest to largest landmark. Run: python3 source/make-scale-poster-html.py
"""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FOOTER_H=330           # px; was 156
STRIP_H=292            # px height of the lineup image inside the footer
audit=json.loads((ROOT/'audits/landmark-scale-strip.json').read_text())
res_x,res_y=audit['resolution'];margin=audit['margin_m'];ppm_render=audit['px_per_m']
strip_w=round(STRIP_H*res_x/res_y);k=STRIP_H/res_y   # css px per render px
css_per_m=ppm_render*k
x0=min(i['x_min'] for i in audit['items'])
NAMES={'liberty':'46 m','pyramid':'139 m','taj':'73 m','eiffel':'324 m','bigben':'96 m','needle':'184 m'}
labels=[]
for i in audit['items']:
    cx=(((i['x_min']+i['x_max'])/2)-x0+margin)*css_per_m
    top=STRIP_H-((i['height_m']+margin)*css_per_m)   # css y of the landmark's top edge
    text=NAMES[i['key']]
    # Eiffel's tip reaches the image top: put its label beside the tip, others centred above.
    if i['key']=='eiffel':
        labels.append(f'<span class="h" style="left:{cx+14:.0f}px;top:{max(top,0):.0f}px;text-align:left;transform:none">{text}</span>')
    else:
        labels.append(f'<span class="h" style="left:{cx:.0f}px;top:{top-28:.0f}px">{text}</span>')
css=(
 f'footer{{height:{FOOTER_H}px;padding:16px 30px;gap:26px}}'
 'footer p{flex:none}footer a{flex:none;font-size:52px;letter-spacing:-1.6px}'
 f'.scale{{position:relative;flex:none;width:{strip_w}px;height:{STRIP_H}px;margin-top:auto}}'
 '.scale img{display:block;width:100%;height:100%}'
 '.scale .h{position:absolute;transform:translateX(-50%);font-size:22px;line-height:1;white-space:nowrap;color:#2a3644}'
 '.scale .note{position:absolute;left:0;top:0;font-size:21px;line-height:1.2;color:#2a3644;white-space:nowrap;font-weight:600}'
 f'body{{grid-template-rows:190px minmax(0,1fr) {FOOTER_H}px}}'
 'article .frame{aspect-ratio:auto;flex:1 1 0}'
)
html=(ROOT/'poster.html').read_text()
block=(f'<div class="scale"><img alt="Statue of Liberty, Great Pyramid, Taj Mahal, Eiffel Tower, Big Ben and Space Needle '
       'side by side at one common scale" src="renders/landmark-scale-strip.png"/>'
       '<span class="note">Landmarks shown to one scale</span>'+'</div>')
# Reorder the six cards smallest->largest landmark: Liberty, Taj, Big Ben, Pyramid, Needle, Eiffel.
cards=re.findall(r'<article>.*?</article>',html,flags=re.S);assert len(cards)==6
for new_i,old_i in enumerate([0,2,4,1,5,3]):pass
ordered=[cards[i] for i in [0,2,4,1,5,3]]
html=html.replace(''.join(cards),''.join(ordered),1);assert ''.join(ordered) in html
html=html.replace('</style>','</style><style>'+css+'</style>',1)
html=html.replace('<footer><p>Explore the design of<br/>orbital data centers</p>','<footer><p>Explore the design of<br/>orbital data centers</p>'+block,1)
assert 'class="scale"' in html
(ROOT/'poster-scale-strip.html').write_text(html);print('wrote poster-scale-strip.html',strip_w,'x',STRIP_H)
