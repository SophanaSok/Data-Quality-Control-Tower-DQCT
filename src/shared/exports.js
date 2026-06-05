/* buildExportBundle(exportsMap, summary)
   Exports a ZIP bundle (if JSZip present) or a single JSON file as fallback.
   exportsMap: { filename: string -> data (object|string|Blob) }
   summary: object metadata to include as metadata.json
   Returns a Promise that resolves with { blob, filename }
*/
async function buildExportBundle(exportsMap = {}, summary = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `dqct-export-${timestamp}.zip`;

  const makeFileEntry = async (key, value) => {
    if (value instanceof Blob) return { name: key, data: value };
    if (typeof value === 'string') return { name: key, data: new Blob([value], { type: 'text/plain' }) };
    return { name: key, data: new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }) };
  };

  // Prefer JSZip when available
  if (typeof window !== 'undefined' && window.JSZip) {
    const zip = new window.JSZip();
    for (const [name, content] of Object.entries(exportsMap)) {
      const entry = await makeFileEntry(name, content);
      zip.file(entry.name, entry.data);
    }
    zip.file('metadata.json', JSON.stringify(Object.assign({ generatedAt: new Date().toISOString() }, summary), null, 2));
    zip.file('README.txt', 'DQCT export bundle\nFiles included:\n' + Object.keys(exportsMap).join('\n'));
    const blob = await zip.generateAsync({ type: 'blob' });
    return { blob, filename };
  }

  // Fallback: create a single JSON file with bundle structure (no zip)
  const bundle = { metadata: Object.assign({ generatedAt: new Date().toISOString() }, summary), files: {} };
  for (const [name, content] of Object.entries(exportsMap)) {
    if (content instanceof Blob) {
      // attempt to read blob as text
      try {
        const text = await content.text();
        bundle.files[name] = text;
      } catch {
        bundle.files[name] = '<<binary data>>';
      }
    } else if (typeof content === 'string') {
      bundle.files[name] = content;
    } else {
      bundle.files[name] = content;
    }
  }
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  return { blob, filename: `dqct-export-${timestamp}.json` };
}

const diffExportFilenames = {
  diffRecords: "diff_records.json",
  duplicatesFile1: "duplicates_file1.json",
  duplicatesFile2: "duplicates_file2.json",
  duplicatesCross: "duplicates_cross.json",
  changedAndNew: "changed_and_new.json"
};

function serializeJson(data, format = "pretty") {
  return format === "minified" ? JSON.stringify(data) : JSON.stringify(data, null, 2);
}

async function downloadJson(data, filename, options = {}) {
  const blob = new Blob([serializeJson(data, options.format)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "dqct-export.json";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export { buildExportBundle, diffExportFilenames, downloadJson, serializeJson };
