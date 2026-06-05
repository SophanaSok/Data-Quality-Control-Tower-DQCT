import assert from "node:assert/strict";

import { diffRecords, findDuplicates } from "../src/modules/diff/engine.js";
import { serializeJson } from "../src/shared/exports.js";
import { extractRecordsFromPayload, parseJsonText } from "../src/shared/parser.js";
import * as Fingerprint from "../src/modules/validation/fingerprint.js";
import { validateFiles } from "../src/modules/validation/engine.js";
import { getDefaultStandardProfile } from "../src/modules/validation/profiles.js";

globalThis.DQCTFingerprint = Fingerprint;

const profile = getDefaultStandardProfile();
assert.equal(profile.rules.length, 37, "Standard Profile should expose all 37 rules");

const validRecord = {
  AgentName: "Source Portal",
  AgentID: "AG001",
  LegacyAgentID: "LEG001",
  ResourceURL: "https://example.test/portal",
  ProjectCode: "SRC1234567890",
  Title: "Network upgrade",
  BidURL: "https://example.test/bids/SRC1234567890",
  BidStatus: "Open for Bidding",
  PublishedDate: "2026-01-01",
  DueDate: "2026-02-01",
  AwardedVendorName: "",
  BidDocuments: [{ Title: "spec.pdf", URL: "https://example.test/spec.pdf", Hash: "0123456789abcdef0123456789abcdef" }],
  AddendumDocuments: [],
  BidTabulations: [],
  AwardDocuments: [],
  BidDocumentHashes: ["0123456789abcdef0123456789abcdef"],
  AddendumDocumentHashes: [],
  BidTabulationHashes: [],
  AwardDocumentHashes: [],
  Description: "Core infrastructure work"
};

const validation = validateFiles(
  [{ name: "valid.json", status: "ok", records: [validRecord] }],
  profile.rules,
  {
    runtimeOverrides: new Set(),
    getPrimaryId: (record) => record.ProjectCode,
    inferFieldType: (value) => Array.isArray(value) ? "array" : value === null ? "null" : typeof value
  }
);
assert.equal(validation.results.length, 0, "Complete Standard Profile record should pass");

const payload = parseJsonText(JSON.stringify({ Export: [validRecord] }));
const extracted = extractRecordsFromPayload(payload);
assert.equal(extracted.rootArray, "Export");
assert.equal(extracted.records.length, 1);

const unsupportedWrapper = extractRecordsFromPayload({ Items: [validRecord] });
assert.match(unsupportedWrapper.error, /Expected root array/);

const baseline = {
  Export: [
    { ProjectCode: "SRC0000000001", Title: "Original", Created: "old" },
    { ProjectCode: "SRC0000000001", Title: "Duplicate", Created: "old" }
  ]
};
const comparison = {
  Export: [
    { ProjectCode: "SRC0000000001", Title: "Updated", Created: "new" },
    { ProjectCode: "SRC0000000002", Title: "New", Created: "new" }
  ]
};

const diff = diffRecords(baseline, comparison, { uniqueKey: "ProjectCode", ignoreFields: ["Created"] });
assert.equal(diff.baselineCount, 2);
assert.equal(diff.comparisonCount, 2);
assert.equal(diff.changedCount, 1);
assert.equal(diff.newCount, 1);

const duplicates = findDuplicates(baseline, comparison, { uniqueKey: "ProjectCode" });
assert.equal(duplicates.duplicatesFile1.duplicateCount, 1);
assert.equal(duplicates.duplicatesFile2.duplicateCount, 0);
assert.equal(duplicates.duplicatesCross.length, 1);

assert.equal(serializeJson({ a: 1 }, "minified"), "{\"a\":1}");
assert.equal(serializeJson({ a: 1 }, "pretty"), "{\n  \"a\": 1\n}");

console.log("Smoke tests passed");
