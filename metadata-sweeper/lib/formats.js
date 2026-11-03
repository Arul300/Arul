export const FORMATS = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'tif', 'tiff', 'gif', 'heic'],
  pdf: ['pdf'],
  office: ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'],
  video: ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi']
};

export function extensionFor(name = '') {
  const part = name.split('.').pop();
  return name.includes('.') ? part.toLowerCase() : '';
}

export function categoryFor(name) {
  const ext = extensionFor(name);
  return Object.entries(FORMATS).find(([, extensions]) => extensions.includes(ext))?.[0] ?? null;
}

export function isSupported(name) {
  return categoryFor(name) !== null;
}
