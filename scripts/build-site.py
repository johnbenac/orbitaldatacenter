#!/usr/bin/env python3
"""Assemble an untouched developer distribution with locally maintained pages."""
import argparse
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
import tempfile

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://orbitaldatacenter.design'
GITHUB = 'https://github.com/johnbenac/orbitaldatacenter'
LINKEDIN = 'https://www.linkedin.com/in/johnbenac/'
DESCRIPTION = ('Explore the feasibility of orbital data centers with a space mission design wizard. '
               'A learning tool for spacecraft sizing, power, thermal systems, and mission tradeoffs.')
IMAGE_ALT = ('Explore the feasibility of orbital data centers — a mission design learning tool '
             'by John Benac, with a Blender visualization of the spacecraft above Earth.')


class CleanHead(HTMLParser):
    """Retain developer styles and scripts while replacing page identity metadata."""
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.parts = []
        self.in_title = False

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'title':
            self.in_title = True
            return
        key = (attrs.get('name') or attrs.get('property') or '').lower()
        if tag == 'meta' and (key in ('description', 'author', 'robots') or
                              key.startswith(('og:', 'twitter:'))):
            return
        if tag == 'link' and 'canonical' in attrs.get('rel', '').lower().split():
            return
        self.parts.append(self.get_starttag_text())

    def handle_startendtag(self, tag, attributes):
        self.handle_starttag(tag, attributes)

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        elif not self.in_title:
            self.parts.append(f'</{tag}>')

    def handle_data(self, data):
        if not self.in_title:
            self.parts.append(data)

    def handle_entityref(self, name):
        self.handle_data('&' + name + ';')

    def handle_charref(self, name):
        self.handle_data('&#' + name + ';')

    def handle_comment(self, data):
        self.parts.append('<!--' + data + '-->')


def metadata(path, title, description):
    url = ORIGIN + path
    image = ORIGIN + '/_site/social-card.png?v=blender-orbit-1'
    person = {'@type': 'Person', '@id': ORIGIN + '/#john-benac', 'name': 'John Benac',
              'url': 'https://johnbenac.com/', 'sameAs': [LINKEDIN]}
    app = {'@type': 'WebApplication', '@id': ORIGIN + '/#workbench',
           'name': 'Orbital Data Center', 'url': ORIGIN + '/',
           'description': DESCRIPTION, 'applicationCategory': 'EducationalApplication',
           'operatingSystem': 'Any', 'browserRequirements': 'JavaScript and WebGL enabled',
           'creator': {'@id': person['@id']}, 'image': image}
    graph = [person, app, {'@type': 'WebSite', '@id': ORIGIN + '/#website',
                           'url': ORIGIN + '/', 'name': 'Orbital Data Center',
                           'creator': {'@id': person['@id']}},
             {'@type': 'AboutPage' if path == '/about/' else 'WebPage',
              '@id': url + '#page', 'url': url, 'name': title, 'description': description,
              'isPartOf': {'@id': ORIGIN + '/#website'},
              'about': {'@id': app['@id']}}]
    fields = {'description': description, 'author': 'John Benac',
              'robots': 'index, follow, max-image-preview:large',
              'twitter:card': 'summary_large_image', 'twitter:title': title,
              'twitter:description': description, 'twitter:image': image,
              'twitter:image:alt': IMAGE_ALT}
    tags = [f'<title>{escape(title)}</title>',
            f'<link rel="canonical" href="{url}">']
    tags += [f'<meta name="{key}" content="{escape(value, quote=True)}">'
             for key, value in fields.items()]
    og = {'title': title, 'description': description, 'type': 'website', 'url': url,
          'site_name': 'Orbital Data Center', 'locale': 'en_US', 'image': image,
          'image:secure_url': image, 'image:type': 'image/png', 'image:width': '1200',
          'image:height': '630', 'image:alt': IMAGE_ALT}
    tags += [f'<meta property="og:{key}" content="{escape(value, quote=True)}">'
             for key, value in og.items()]
    tags += ['<script type="application/ld+json">' +
             json.dumps({'@context': 'https://schema.org', '@graph': graph},
                        ensure_ascii=False).replace('<', '\\u003c') + '</script>']
    return '\n'.join(tags)


def build(source=ROOT, output=ROOT / '.build/public', extensions=ROOT / 'extensions',
          github_published=False):
    source, output, extensions = Path(source).resolve(), Path(output).absolute(), Path(extensions).resolve()
    dist = source / 'dist'
    if not (dist / 'index.html').is_file():
        raise ValueError('Developer release must contain dist/index.html')
    if output.is_symlink() or output.resolve() in (source, dist, extensions):
        raise ValueError('Build output must be separate from source and extensions')
    if output.resolve() in source.parents or output.resolve() in extensions.parents:
        raise ValueError('Build output cannot contain source or extensions')
    if any(p.is_symlink() for p in dist.rglob('*')):
        raise ValueError('Developer distribution must not contain symlinks')
    html = (dist / 'index.html').read_text()
    heads = list(re.finditer(r'<head\b[^>]*>(.*?)</head\s*>', html, re.I | re.S))
    if len(heads) != 1 or html.count('<footer class="pagefoot">') != 1:
        raise ValueError('Developer head/footer integration changed; review this release before publishing')
    clean = CleanHead()
    clean.feed(heads[0].group(1))
    head = ''.join(clean.parts) + '\n' + metadata(
        '/', 'Orbital Data Center | Explore the Feasibility', DESCRIPTION)
    head += '\n<link rel="stylesheet" href="/_site/site.css">\n'
    html = html[:heads[0].start(1)] + head + html[heads[0].end(1):]
    footer = (extensions / 'footer.html').read_text()
    github_link = (f'<a href="{GITHUB}">Source on GitHub</a>' if github_published else
                   '<a href="/about/#source">Source code</a>')
    footer = footer.replace('{{GITHUB_LINK}}', github_link)
    html = html.replace('<footer class="pagefoot">', footer + '\n<footer class="pagefoot">', 1)
    about = (extensions / 'about.html').read_text()
    if about.count('{{HEAD}}') != 1 or about.count('{{SOURCE}}') != 1:
        raise ValueError('About template must have one HEAD and one SOURCE placeholder')
    source_section = (f'<p>Explore the source and follow development on '
                      f'<a href="{GITHUB}">GitHub: johnbenac/orbitaldatacenter</a>.</p>'
                      if github_published else
                      '<p>The public source repository is being prepared at '
                      '<span>github.com/johnbenac/orbitaldatacenter</span>. '
                      'A source link will be available here when it is published.</p>')
    about = about.replace('{{HEAD}}', metadata('/about/',
        'About John Benac & the Project | Orbital Data Center',
        'Meet John Benac, the systems engineer behind Orbital Data Center. '
        'Explore the spacecraft mission workbench and connect on LinkedIn.'))
    about = about.replace('{{SOURCE}}', source_section)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.assemble-', dir=output.parent) as temp:
        stage = Path(temp) / 'public'
        shutil.copytree(dist, stage)
        (stage / 'index.html').write_text(html)
        (stage / 'about').mkdir(exist_ok=True)
        (stage / 'about/index.html').write_text(about)
        (stage / '_site').mkdir()
        for name in ['site.css', 'social-card.png']:
            shutil.copy2(extensions / name, stage / '_site' / name)
        (stage / 'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: ' + ORIGIN + '/sitemap.xml\n')
        (stage / 'sitemap.xml').write_text(
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            ''.join(f'  <url><loc>{ORIGIN}{path}</loc></url>\n' for path in ['/', '/about/']) +
            '</urlset>\n')
        (stage / '404.html').write_text(
            '<!doctype html><html lang="en"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<meta name="robots" content="noindex"><title>Page not found | Orbital Data Center</title>'
            '<body><h1>Page not found</h1><p><a href="/">Return to the workbench</a></p></body></html>')
        # Keep the app's downloadable static-site export self-contained as well.
        assets = json.loads((stage / 'assets.json').read_text())
        assets = sorted(set(assets) | {'about/index.html', '_site/site.css', '_site/social-card.png',
                                      'robots.txt', 'sitemap.xml', '404.html'})
        for name in assets:
            if not (stage / name).is_file():
                raise ValueError(f'Asset manifest references missing file: {name}')
        (stage / 'assets.json').write_text(json.dumps(assets, indent=2) + '\n')
        if output.exists():
            shutil.rmtree(output)
        stage.rename(output)
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path, default=ROOT / '.build/public')
    parser.add_argument('--github-published', action='store_true',
                        help='Enable public source links after verifying the public repository')
    args = parser.parse_args()
    published = args.github_published
    config = ROOT / 'publication.json'
    if config.exists():
        published = published or json.loads(config.read_text()).get('github_published', False)
    print('Assembled website:', build(args.source, args.output, github_published=published))
