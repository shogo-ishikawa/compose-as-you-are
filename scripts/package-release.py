"""Package tracked source only, under a version-named top-level directory."""
import json
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text())['version']
out = root / 'dist'
out.mkdir(exist_ok=True)
files = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
archive = out / f'compose-as-you-are-v{version}.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as target:
    for name in files:
        path = root / name
        if name and path.is_file() and not Path(name).name.startswith('PRIVATE_'):
            target.write(path, f'v{version}/{name}')
print(archive)
