(function attachDQCTExports(globalScope) {
  const DIFF_EXPORT_FILES = {
    diffRecords: "diff_records.json",
    duplicatesFile1: "duplicates_file1.json",
    duplicatesFile2: "duplicates_file2.json",
    duplicatesCross: "duplicates_cross.json",
    changedAndNew: "changed_and_new.json"
  };

  function buildReportText(profileName, files, results) {
    const lines = [];
    lines.push(`DQCT validation report: ${profileName}`);
    lines.push(`Files: ${files.length}`);
    lines.push(`Failures: ${results.length}`);
    lines.push("");
    results.slice(0, 40).forEach((result) => {
      lines.push([
        result.fileName,
        `record ${result.recordIndex}`,
        result.primaryId,
        result.field,
        result.ruleType,
        result.expected,
        result.actual,
        result.severity
      ].join(" | "));
    });
    return lines.join("\n");
  }

  function buildIssuesPayload({ profileName, files, currentRunStats, results, currentAnomalies, currentDrift, currentIssueGroups }) {
    return {
      generatedAt: new Date().toISOString(),
      profile: profileName,
      files: files.map((file) => ({ name: file.name, status: file.status, records: file.records.length })),
      totals: {
        records: currentRunStats?.rowCount || 0,
        failures: results.length,
        anomalies: currentAnomalies.length
      },
      schemaDrift: currentDrift,
      groupedIssues: currentIssueGroups,
      issueRows: results,
      anomalies: currentAnomalies
    };
  }

  function downloadJson(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { filename: a.download };
  }

  globalScope.DQCTExports = {
    buildReportText,
    buildIssuesPayload,
    downloadJson,
    diffExportFilenames: DIFF_EXPORT_FILES
  };
})(window);
