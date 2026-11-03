const fileInput = document.querySelector('#file');
const dropzone = document.querySelector('#dropzone');
const cleanButton = document.querySelector('#clean');
const fileLabel = document.querySelector('#file-label');
const message = document.querySelector('#message');
const report = document.querySelector('#report');
let selected;

function choose(file) {
  selected = file;
  cleanButton.disabled = !file;
  fileLabel.textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Drop a file here or browse';
  message.textContent = file ? 'Ready to inspect and clean locally.' : 'Your file stays on this computer and is deleted after processing.';
}
fileInput.addEventListener('change', () => choose(fileInput.files[0]));
['dragenter', 'dragover'].forEach((event) => dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach((event) => dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', (event) => choose(event.dataTransfer.files[0]));
function list(target, entries) {
  const root = document.querySelector(target); root.innerHTML = '';
  if (!entries.length) root.innerHTML = '<li class="empty">No readable metadata fields</li>';
  entries.slice(0, 20).forEach(({ field, value, aiRelated }) => { const item = document.createElement('li'); item.innerHTML = `<b>${field}${aiRelated ? ' <mark>AI-related</mark>' : ''}</b><span>${value}</span>`; root.append(item); });
}
function display(data) {
  document.querySelector('#removed').textContent = data.removedCount;
  document.querySelector('#ai-found').textContent = data.aiRelatedFound.length;
  document.querySelector('#remaining').textContent = data.after.length;
  list('#before', data.before); list('#after', data.after);
  document.querySelector('#notes').textContent = data.notes.join(' ');
  report.classList.remove('hidden'); report.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
cleanButton.addEventListener('click', async () => {
  if (!selected) return;
  cleanButton.disabled = true; cleanButton.innerHTML = 'Cleaning locally…'; message.textContent = 'Inspecting and removing supported metadata. Keep this page open.';
  try {
    const body = new FormData(); body.append('file', selected);
    const response = await fetch('/api/clean', { method: 'POST', body });
    if (!response.ok) throw new Error((await response.json()).error || 'Unable to clean the file.');
    const encoded = response.headers.get('X-Metadata-Report');
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))));
    const file = await response.blob(); const url = URL.createObjectURL(file); const a = document.createElement('a');
    a.href = url; a.download = `cleaned-${selected.name}`; a.click(); URL.revokeObjectURL(url);
    display(data); message.textContent = 'Cleaned file downloaded. Review the report below.';
  } catch (error) { message.textContent = error.message; }
  finally { cleanButton.disabled = false; cleanButton.innerHTML = 'Clean & download <span>→</span>'; }
});
document.querySelector('#reset').addEventListener('click', () => { selected = null; fileInput.value = ''; choose(null); report.classList.add('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' }); });
