/**
 * Deduplication Fingerprint Module
 * Generates SHA256 fingerprints from bid records for duplicate detection
 * 
 * Spec: Generate SHA256 from 12 core fields with normalized string/array values
 * Fields: AgentID, ProjectCode, Title, BidStatus, DueDate, PublishedDate, 
 *         AwardedVendorName, LegacyAgentID, ResourceURL, BidDocumentHashes, 
 *         AddendumDocumentHashes, BidDocuments
 */

const MODULE_NAME = "DQCTFingerprint";
const fingerprintCache = new Map();

/**
 * Normalize string field: null → "", trim, collapse multiple spaces
 * Preserve original casing for case-sensitive comparisons
 */
function normalizeString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return String(value).trim();
  return value
    .trim()
    .replace(/\s+/g, " "); // Collapse multiple spaces to single space
}

/**
 * Normalize hash array field: parse if JSON string, null → [], deduplicate, sort
 * Handle comma-separated hashes as well as JSON arrays
 */
function normalizeHashArray(value) {
  if (!value) return [];

    let arr = [];

    // If string that looks like JSON, try parsing
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.startsWith("[")) {
        try {
          arr = JSON.parse(trimmed);
        } catch (e) {
          // If parse fails, treat as comma-separated
          arr = trimmed.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
        }
      } else if (trimmed.length > 0) {
        // Comma-separated or single value
        arr = trimmed.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
      }
    } else if (Array.isArray(value)) {
      arr = value;
    }

    // Normalize each entry, deduplicate, sort alphabetically
    const normalized = arr
      .map((item) => normalizeString(item))
      .filter((item) => item.length > 0); // Remove empty entries

    const unique = [...new Set(normalized)]; // Deduplicate
    return unique.sort(); // Sort alphabetically
  }

/**
 * The 12 core fields used for fingerprinting bid records
 * Order matters for consistent hashing
 */
const FINGERPRINT_FIELDS = [
    "AgentID",
    "ProjectCode",
    "Title",
    "BidStatus",
    "DueDate",
    "PublishedDate",
    "AwardedVendorName",
    "LegacyAgentID",
    "ResourceURL",
    "BidDocumentHashes",
    "AddendumDocumentHashes",
    "BidDocuments"
  ];

/**
 * Build fingerprint payload from a record
 * Returns normalized object with all 12 fields for hashing
 */
function buildFingerprintPayload(record) {
  if (!record || typeof record !== "object") {
    return {};
  }

    const payload = {};

    // String fields (normalize but preserve casing)
    const stringFields = [
      "AgentID",
      "ProjectCode",
      "Title",
      "BidStatus",
      "DueDate",
      "PublishedDate",
      "AwardedVendorName",
      "LegacyAgentID",
      "ResourceURL"
    ];

    stringFields.forEach((field) => {
      payload[field] = normalizeString(record[field]);
    });

    // Hash array fields (parse, deduplicate, sort)
    const hashFields = ["BidDocumentHashes", "AddendumDocumentHashes"];
    hashFields.forEach((field) => {
      payload[field] = normalizeHashArray(record[field]);
    });

    // BidDocuments (special handling: parse and normalize)
    // Extract hash values from document objects if present
    const bidDocs = record.BidDocuments;
    let docHashes = [];
    if (bidDocs) {
      try {
        let docs = bidDocs;
        if (typeof bidDocs === "string") {
          const trimmed = bidDocs.trim();
          if (trimmed.startsWith("[")) {
            docs = JSON.parse(trimmed);
          }
        }
        if (Array.isArray(docs)) {
          docHashes = docs
            .map((doc) => (doc && doc.Hash ? normalizeString(doc.Hash) : ""))
            .filter((h) => h.length > 0);
        }
      } catch (e) {
        // If parsing fails, ignore
      }
    }
    docHashes = [...new Set(docHashes)].sort(); // Deduplicate and sort
    payload.BidDocuments = docHashes;

    return payload;
  }

function getFingerprintCacheKey(record, uniqueKey = "ProjectCode") {
  const normalizedKey = String(uniqueKey || "ProjectCode").trim() || "ProjectCode";
  return `${normalizedKey}::${String(record?.[normalizedKey] ?? "").trim()}`;
}

function clearFingerprintCache() {
  fingerprintCache.clear();
}

/**
 * Generate SHA256 fingerprint from a record
 * Uses native crypto.subtle.digest if available (modern browsers)
 * Falls back to simple hash if crypto not available
 */
async function generateFingerprint(record, uniqueKey = "ProjectCode") {
  const cacheKey = getFingerprintCacheKey(record, uniqueKey);
  if (fingerprintCache.has(cacheKey)) {
    return fingerprintCache.get(cacheKey);
  }

    const payload = buildFingerprintPayload(record);

    // Create canonical JSON string (keys sorted)
    const canonicalJson = JSON.stringify(payload, Object.keys(payload).sort());

    // If crypto API available, use SHA256; otherwise use simple hash
    if (typeof crypto !== "undefined" && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(canonicalJson);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fingerprint = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        fingerprintCache.set(cacheKey, fingerprint);
        return fingerprint;
      } catch (e) {
        console.warn("SHA256 crypto failed, using fallback hash:", e);
        const fingerprint = simpleHash(canonicalJson);
        fingerprintCache.set(cacheKey, fingerprint);
        return fingerprint;
      }
    } else {
      const fingerprint = simpleHash(canonicalJson);
      fingerprintCache.set(cacheKey, fingerprint);
      return fingerprint;
    }
  }

/**
 * Fallback simple hash when crypto.subtle is not available
 * Not cryptographically secure but good enough for client-side deduplication
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Generate fingerprint synchronously (blocking)
 * Uses simpleHash for synchronous operation
 */
function generateFingerprintSync(record, uniqueKey = "ProjectCode") {
  const cacheKey = getFingerprintCacheKey(record, uniqueKey);
  if (fingerprintCache.has(cacheKey)) {
    return fingerprintCache.get(cacheKey);
  }

    const payload = buildFingerprintPayload(record);
    const canonicalJson = JSON.stringify(payload, Object.keys(payload).sort());
    const fingerprint = simpleHash(canonicalJson);
    fingerprintCache.set(cacheKey, fingerprint);
    return fingerprint;
  }

/**
 * Detect near-duplicates: same AgentID + ProjectCode, different fingerprint
 */
function findNearDuplicates(records, fingerprintMap) {
  // fingerprintMap: Map<fingerprint, [record indices with that fingerprint]>
  if (!fingerprintMap || fingerprintMap.size === 0) {
    return [];
  }

    const nearDuplicates = [];
    const agentProjectGroups = new Map(); // Map<"AgentID:ProjectCode", [record indices]>

    // Group records by AgentID + ProjectCode
    records.forEach((record, idx) => {
      const agentId = record?.AgentID || "";
      const projCode = record?.ProjectCode || "";
      const key = `${agentId}:${projCode}`;

      if (!agentProjectGroups.has(key)) {
        agentProjectGroups.set(key, []);
      }
      agentProjectGroups.get(key).push(idx);
    });

    // Look for groups with multiple records but different fingerprints
    agentProjectGroups.forEach((indices, key) => {
      if (indices.length > 1) {
        // Get unique fingerprints in this group
        const fingerprints = new Set();
        indices.forEach((idx) => {
          const fp = fingerprintMap.get(idx);
          if (fp) fingerprints.add(fp);
        });

        // If >1 unique fingerprint, these are near-duplicates
        if (fingerprints.size > 1) {
          nearDuplicates.push({
            agentId: key.split(":")[0],
            projectCode: key.split(":")[1],
            recordIndices: indices,
            fingerprints: Array.from(fingerprints),
            type: "near_duplicate"
          });
        }
      }
    });

    return nearDuplicates;
  }

export {
  MODULE_NAME,
  FINGERPRINT_FIELDS,
  buildFingerprintPayload,
  clearFingerprintCache,
  findNearDuplicates,
  generateFingerprint,
  generateFingerprintSync,
  normalizeHashArray,
  normalizeString
};
