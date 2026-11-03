Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryFor, isSupported } from '../lib/formats.js';
import { summarize } from '../lib/report.js';

test('recognises supported formats without relying on case', () => {
  assert.equal(categoryFor('portrait.JPEG'), 'image');
  assert.equal(categoryFor('slides.pptx'), 'office');
  assert.equal(categoryFor('clip.mp4'), 'video');
  assert.equal(isSupported('unsafe.exe'), false);
});
test('report flags likely AI-related standard metadata', () => {
  const report = summarize({ XMP: { CreatorTool: 'Stable Diffusion', Author: 'Sam' } }, {});
  assert.equal(report.before.length, 2);
  assert.equal(report.after.length, 0);
  assert.equal(report.aiRelatedFound.length, 1);
});
