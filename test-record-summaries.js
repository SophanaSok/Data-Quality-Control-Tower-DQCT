// Simple test for record summaries transformation
// Usage: node test-record-summaries.js

// Simulated buildRecordSummaries function (copied from the engine)
function buildRecordSummaries(files, flatResults) {
  const recordSummaries = [];
  const failuresByRecord = new Map();

  // Group failures by (fileName, recordIndex)
  flatResults.forEach((failure) => {
    const key = `${failure.fileName}:${failure.recordIndex}`;
    if (!failuresByRecord.has(key)) {
      failuresByRecord.set(key, []);
    }
    failuresByRecord.get(key).push(failure);
  });

  // Build summaries for each record in each file
  files.forEach((file) => {
    if (file.status === "error") {
      // Skip error files
      return;
    }

    const records = file.records || [];
    records.forEach((record, recordIndex) => {
      const key = `${file.name}:${recordIndex + 1}`;
      const recordFailures = failuresByRecord.get(key) || [];

      // Classify failures by severity
      const errorFailures = recordFailures.filter((f) => f.severity === "high");
      const warningFailures = recordFailures.filter((f) => f.severity === "medium");
      const infoFailures = recordFailures.filter((f) => f.severity === "low");

      // Determine qa_status
      let qa_status = "PASS";
      if (errorFailures.length > 0) {
        qa_status = "FAIL";
      } else if (warningFailures.length > 0) {
        qa_status = "PASS_WITH_WARNINGS";
      }

      recordSummaries.push({
        row_number: recordIndex + 1,
        file_name: file.name,
        AgentID: record?.AgentID || "",
        ProjectCode: record?.ProjectCode || "",
        Title: record?.Title || "",
        BidStatus: record?.BidStatus || "",
        fingerprint: "",
        qa_status,
        error_count: errorFailures.length,
        warning_count: warningFailures.length,
        info_count: infoFailures.length,
        errors: errorFailures.map((f) => ({
          field: f.field,
          ruleId: f.ruleId,
          ruleType: f.ruleType,
          expected: f.expected,
          actual: f.actual
        })),
        warnings: warningFailures.map((f) => ({
          field: f.field,
          ruleId: f.ruleId,
          ruleType: f.ruleType,
          expected: f.expected,
          actual: f.actual
        })),
        infos: infoFailures.map((f) => ({
          field: f.field,
          ruleId: f.ruleId,
          ruleType: f.ruleType,
          expected: f.expected,
          actual: f.actual
        }))
      });
    });
  });

  return recordSummaries;
}

// Test data
const testFiles = [
  {
    name: "test.json",
    status: "ready",
    records: [
      {
        AgentID: "AGENT-001",
        ProjectCode: "PROJ-001",
        Title: "Test Project",
        BidStatus: "Open"
      },
      {
        AgentID: "AGENT-002",
        ProjectCode: "PROJ-002",
        Title: "",
        BidStatus: "Closed"
      }
    ]
  }
];

const testFailures = [
  {
    fileName: "test.json",
    recordIndex: 2,
    field: "Title",
    ruleId: "R08",
    ruleType: "required",
    severity: "high",
    expected: "non-empty value",
    actual: ""
  },
  {
    fileName: "test.json",
    recordIndex: 2,
    field: "DueDate",
    ruleId: "R14",
    ruleType: "required_if",
    severity: "medium",
    expected: "required when BidStatus equals Open for Bidding",
    actual: ""
  }
];

// Run test
const summaries = buildRecordSummaries(testFiles, testFailures);

console.log("✓ Record Summaries Generated:\n");
summaries.forEach((summary) => {
  console.log(`Record ${summary.row_number} (${summary.file_name}):`);
  console.log(`  Agent: ${summary.AgentID}, Project: ${summary.ProjectCode}, Title: ${summary.Title}`);
  console.log(`  Status: ${summary.qa_status}`);
  console.log(`  Errors: ${summary.error_count}, Warnings: ${summary.warning_count}, Info: ${summary.info_count}`);
  if (summary.errors.length > 0) {
    console.log(`  Errors: ${summary.errors.map((e) => `${e.field} (${e.ruleId})`).join(", ")}`);
  }
  if (summary.warnings.length > 0) {
    console.log(`  Warnings: ${summary.warnings.map((w) => `${w.field} (${w.ruleId})`).join(", ")}`);
  }
  console.log();
});

// Verify results
console.log("✓ Test Summary:");
const record1 = summaries.find((s) => s.row_number === 1);
const record2 = summaries.find((s) => s.row_number === 2);

console.log(`  Record 1 - Status: ${record1.qa_status} (expected: PASS), Errors: ${record1.error_count} (expected: 0)`);
console.log(`  Record 2 - Status: ${record2.qa_status} (expected: FAIL), Errors: ${record2.error_count} (expected: 1), Warnings: ${record2.warning_count} (expected: 1)`);

if (record1.qa_status === "PASS" && record1.error_count === 0 && record2.qa_status === "FAIL" && record2.error_count === 1 && record2.warning_count === 1) {
  console.log("\n✅ All assertions passed!");
} else {
  console.log("\n❌ Test failed!");
}
