from pathlib import Path
import hashlib
import json
import urllib.request

root = Path(__file__).resolve().parents[3]
base = 'https://lynch715.github.io/mayor-simulator/'
paths = ['index.html', 'manifest.webmanifest', 'backups/index-before-honors-20261031.html', 'tests/honors/browser-qa.html']
results = []
for path in paths:
    url = base + ('' if path == 'index.html' else path)
    request = urllib.request.Request(url, headers={'Cache-Control': 'no-cache', 'Pragma': 'no-cache'})
    with urllib.request.urlopen(request, timeout=40) as response:
        data = response.read()
        status = response.status
    expected = (root / path).read_bytes()
    results.append({'path': path, 'status': status, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'matches': data == expected})
report = {'url': base, 'allMatch': all(row['matches'] for row in results), 'files': results}
out = Path(__file__).with_name('payload-verification.json')
out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
if not report['allMatch']:
    raise SystemExit(1)
