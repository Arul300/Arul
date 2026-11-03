Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
#!/usr/bin/env python3
"""Remove common metadata parts from OOXML and OpenDocument ZIP packages."""
import re
import sys
import zipfile

SOURCE, TARGET = sys.argv[1], sys.argv[2]
REMOVE_PARTS = {
    'docProps/core.xml', 'docProps/app.xml', 'docProps/custom.xml',
    'meta.xml', 'Thumbnails/thumbnail.png'
}
AI_MARKERS = re.compile(r'(ai|artificial intelligence|generative|stable diffusion|midjourney|dall[·-]?e|firefly|content credentials|c2pa|provenance|openai)', re.I)

with zipfile.ZipFile(SOURCE, 'r') as source, zipfile.ZipFile(TARGET, 'w', zipfile.ZIP_DEFLATED) as target:
    for item in source.infolist():
        if item.filename in REMOVE_PARTS or item.filename.startswith('customXml/'):
            continue
        data = source.read(item.filename)
        # Remove comments that themselves describe AI provenance; the content is otherwise preserved.
        if item.filename.endswith('.xml') and AI_MARKERS.search(data.decode('utf-8', errors='ignore')):
            data = re.sub(rb'<[^>]*(?:comment|property)[^>]*>.*?</[^>]*(?:comment|property)>', b'', data, flags=re.I | re.S)
        target.writestr(item, data)
