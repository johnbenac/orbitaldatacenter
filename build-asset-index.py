"""Rebuild the losslessly compressed asset inventory used by static-site export."""
from pathlib import Path
import json
import zipfile

root = Path(__file__).resolve().parent / 'dist'
legacy = root / 'assets.json'
if legacy.exists():
    legacy.unlink()
files = sorted(str(path.relative_to(root)) for path in root.rglob('*')
               if path.is_file() and path.name != 'assets.json.zip')
payload = (json.dumps(files, separators=(',', ':'), ensure_ascii=False) + '\n').encode()
info = zipfile.ZipInfo('assets.json', date_time=(2026, 11, 7, 0, 0, 0))
info.compress_type = zipfile.ZIP_DEFLATED
info.external_attr = 0o644 << 16
archive_path = root / 'assets.json.zip'
with zipfile.ZipFile(archive_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    archive.writestr(info, payload)
with zipfile.ZipFile(archive_path) as archive:
    assert archive.read('assets.json') == payload
print(f'{len(files)} assets; {len(payload):,} original bytes → {archive_path.stat().st_size:,} packaged bytes')
