import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import express from 'express';
import multer from 'multer';
import { categoryFor, isSupported } from './lib/formats.js';
import { summarize } from './lib/report.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const uploads = path.join(root, 'uploads');
const output = path.join(root, 'output');
await Promise.all([fs.mkdir(uploads, { recursive: true }), fs.mkdir(output, { recursive: true })]);

const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(root, 'public'), { etag: false, maxAge: 0 }));
const storage = multer.diskStorage({
  destination: uploads,
  filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}-${path.basename(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024, files: 1 } });

function run(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { windowsHide: true });
    let stderr = '';
    process.stderr.on('data', (data) => { stderr += data; });
    process.on('error', reject);
    process.on('close', (code) => code === 0 ? resolve() : reject(new Error(stderr || `${command} exited ${code}`)));
  });
}
async function exifJson(file) {
  return new Promise((resolve) => {
    const process = spawn('exiftool', ['-j', '-G1', '-a', file]);
    let data = '';
    process.stdout.on('data', (chunk) => { data += chunk; });
    process.on('close', () => { try { resolve(JSON.parse(data)[0] ?? {}); } catch { resolve({}); } });
    process.on('error', () => resolve({}));
  });
}
function binarySignals(file) {
  return fs.readFile(file).then((data) => {
    const sample = data.subarray(0, Math.min(data.length, 4 * 1024 * 1024)).toString('latin1');
    return ['C2PA', 'JUMBF', 'Content Credentials'].filter((signal) => sample.toLowerCase().includes(signal.toLowerCase()));
  }).catch(() => []);
}
function safeDownloadName(name) { return name.replace(/[^a-zA-Z0-9._-]/g, '_'); }

app.post('/api/clean', upload.single('file'), async (req, res) => {
  const source = req.file?.path;
  if (!source) return res.status(400).json({ error: 'Choose one file to clean.' });
  const original = req.file.originalname;
  if (!isSupported(original)) { await fs.unlink(source).catch(() => {}); return res.status(415).json({ error: 'Unsupported format. Choose a listed image, PDF, Office, or video format.' }); }
  const category = categoryFor(original);
  const cleaned = path.join(output, `${crypto.randomUUID()}-cleaned-${safeDownloadName(original)}`);
  try {
    const [before, signals] = await Promise.all([exifJson(source), binarySignals(source)]);
    if (category === 'office') {
      await run('python3', [path.join(root, 'scripts', 'clean_office.py'), source, cleaned]);
    } else if (category === 'video') {
      const intermediate = `${cleaned}.mux`;
      await run('ffmpeg', ['-y', '-i', source, '-map', '0', '-map_metadata', '-1', '-c', 'copy', intermediate]);
      await run('exiftool', ['-all=', '-overwrite_original', '-o', cleaned, intermediate]);
      await fs.unlink(intermediate).catch(() => {});
    } else {
      await run('exiftool', ['-all=', '-overwrite_original', '-o', cleaned, source]);
    }
    const after = await exifJson(cleaned);
    const fullReport = summarize(before, after, [
      `Processed locally by this server; the source upload is deleted after the response.`,
      signals.length ? `Possible provenance container marker(s) found before cleaning: ${signals.join(', ')}. Their removal is format- and tool-dependent; verify independently if that matters.` : 'No common C2PA/JUMBF/Content Credentials marker was found in the inspected file prefix.',
      'This removes standard embedded metadata and supported metadata markers. It cannot reliably remove visual watermarks, alter pixels, erase every provenance system, or make AI-generated media undetectable.'
    ]);
    // Keep response headers small even when a malicious or unusual file contains huge metadata.
    const report = { ...fullReport, before: fullReport.before.slice(0, 100), after: fullReport.after.slice(0, 100) };
    res.set({ 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="cleaned-${safeDownloadName(original)}"`, 'X-Metadata-Report': Buffer.from(JSON.stringify(report)).toString('base64url') });
    res.download(cleaned, `cleaned-${safeDownloadName(original)}`, async () => {
      await Promise.all([fs.unlink(source).catch(() => {}), fs.unlink(cleaned).catch(() => {})]);
    });
  } catch (error) {
    await Promise.all([fs.unlink(source).catch(() => {}), fs.unlink(cleaned).catch(() => {})]);
    res.status(500).json({ error: `Cleaning could not finish: ${error.message}. Install the required local tools listed in the README.` });
  }
});
app.use((error, _req, res, _next) => res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 500 MB local limit.' : 'The file could not be accepted.' }));
app.listen(process.env.PORT || 3000, () => console.log('Metadata Sweeper is ready at http://localhost:3000'));
