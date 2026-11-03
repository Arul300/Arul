Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
# Metadata Sweeper

A polished **local-first** web app for removing standard embedded metadata from supported images, PDFs, Office documents, and videos. It reports readable metadata before and after cleaning, highlights likely AI-related metadata markers, and gives the user a cleaned-file download.

> **Honest boundary:** this is file hygiene, not an AI-detection bypass. It cannot reliably establish a file's AI origin, remove every provenance mechanism, remove visual/semantic watermarks, or make AI-generated media undetectable.

## What it supports

| File type | Formats | Cleaning approach |
|---|---|---|
| Images | JPG, JPEG, PNG, WEBP, TIFF, GIF, HEIC | `exiftool -all=` removes standard EXIF/IPTC/XMP and supported embedded metadata fields. |
| PDF | PDF | `exiftool -all=` removes conventional PDF metadata where supported. |
| Office | DOCX, XLSX, PPTX, ODT, ODS, ODP | Strips common package metadata (`docProps`, `meta.xml`, custom XML, thumbnails) locally. |
| Video | MP4, MOV, M4V, WEBM, MKV, AVI | `ffmpeg` drops container metadata while stream-copying, then `exiftool` performs a second metadata cleanup. |

The report labels fields containing common terms such as **C2PA**, **Content Credentials**, **Stable Diffusion**, **Midjourney**, **Firefly**, and similar. This label is a practical cue—not proof of AI generation. The app also checks the first 4 MB for common C2PA/JUMBF/content-credentials markers and reports its limited result.

## Privacy and safety

- The browser connects only to `localhost`; nothing is uploaded to a third-party service by this app.
- The server creates random temporary filenames, accepts one supported file at a time, and applies a 500 MB limit.
- The uploaded source and generated output are deleted after the download response finishes.
- Shell utilities are invoked with fixed argument arrays, not through a shell.
- File names are sanitized for downloads. The app does not execute or render uploaded documents.

## Requirements

- Node.js 20+
- [ExifTool](https://exiftool.org/) for images and PDFs (and video cleanup pass)
- [FFmpeg](https://ffmpeg.org/) for videos
- Python 3 standard library for Office documents—no Python packages required

Examples on Ubuntu/Debian:

```bash
sudo apt install libimage-exiftool-perl ffmpeg python3
```

## Run locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). For development, use `npm run dev`.

## Tests

```bash
npm test
```

The included tests cover supported-format routing and AI-marker report classification. Before relying on a cleaned file in a sensitive workflow, inspect it independently with your preferred metadata viewer and retain the original securely.

## Limitations worth knowing

- Results depend on the format and installed tool versions. Password-protected, corrupted, DRM-protected, or unusual files may fail.
- The Office cleaner targets package-level properties; it deliberately preserves document body content, which may itself contain author names or AI-related text.
- Stream-copy cleanup keeps video/audio content unchanged where possible, but a particular container/codec combination can be unsupported by FFmpeg.
- C2PA and other provenance systems can use structures that general metadata tools do not remove. A reported absence is **not** a guarantee.
- This project does not remove pixel-level watermarks or attempt anti-forensics.

## Project structure

```text
public/              responsive browser interface
lib/                 format routing and metadata-report logic
scripts/             local Office-package cleaner
test/                Node test suite
server.js            localhost HTTP server and cleaning pipeline
```
