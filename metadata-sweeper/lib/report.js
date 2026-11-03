Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
const AI_PATTERN = /(ai|artificial intelligence|generative|stable diffusion|midjourney|dall[·-]?e|firefly|content credentials|c2pa|provenance|openai)/i;

export function flattenMetadata(value, prefix = '', output = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenMetadata(item, `${prefix}[${index}]`, output));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => flattenMetadata(item, prefix ? `${prefix}.${key}` : key, output));
  } else if (value !== undefined && value !== null && value !== '') {
    output.push({ field: prefix, value: String(value), aiRelated: AI_PATTERN.test(`${prefix} ${value}`) });
  }
  return output;
}

export function summarize(before, after, notes = []) {
  const beforeEntries = flattenMetadata(before);
  const afterEntries = flattenMetadata(after);
  return {
    before: beforeEntries,
    after: afterEntries,
    removedCount: Math.max(0, beforeEntries.length - afterEntries.length),
    aiRelatedFound: beforeEntries.filter((entry) => entry.aiRelated),
    notes
  };
}
