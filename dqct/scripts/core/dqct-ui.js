      let validationResultsTable = null;
      let recordSummariesTable = null;
      let recordViewerModal = null;
      let _lastIssueGroupsKey = null;
      let _lastHistoryKey = null;
      let _lastIssuesFeedKey = null;

      function getRecordForResult(result) {
        const file = state.files.find((entry) => entry.name === result.fileName);
        if (!file || !Array.isArray(file.records)) {
          return null;
        }
        const index = Number(result.recordIndex);
        if (!Number.isFinite(index) || index < 0) {
          return null;
        }
        return file.records[index] ?? null;
      }

      function closeRecordViewer() {
        if (recordViewerModal instanceof HTMLElement) {
          recordViewerModal.remove();
        }
        recordViewerModal = null;
      }

      function openRecordViewer(result) {
        const record = getRecordForResult(result);
        if (!record || !window.DQCTJsonViewer?.renderRecordViewer) {
          return;
        }
        closeRecordViewer();

        // Build enhanced modal with Summary / Issues / Record JSON tabs
        const modal = document.createElement("div");
        modal.className = "dqct-json-modal";
        modal.innerHTML = `
          <div class="dqct-json-modal__dialog" role="dialog" aria-modal="true" aria-label="Record inspector">
            <div class="dqct-json-modal__actions">
              <button type="button" class="ghost" data-close-record-viewer>Close</button>
            </div>
            <div class="dqct-json-viewer__header">
              <div style="display:flex;gap:1rem;align-items:center;">
                <strong>Record inspector</strong>
                <span class="meta">${escapeHtml(result.fileName || "")} · #${escapeHtml(String(result.recordIndex || ""))}</span>
              </div>
              <div style="display:flex;gap:0.5rem;">
                <button type="button" data-record-tab="summary" class="ghost">Summary</button>
                <button type="button" data-record-tab="issues" class="ghost">Issues</button>
                <button type="button" data-record-tab="json" class="ghost">Record JSON</button>
              </div>
            </div>
            <div class="dqct-json-viewer__content">
              <div id="recordSummary" data-record-panel class="meta"></div>
              <div id="recordIssues" data-record-panel class="profile-list" style="display:none;"></div>
              <div id="recordJson" data-record-panel style="display:none;"></div>
            </div>
          </div>
        `;

        const dialog = modal.querySelector('.dqct-json-modal__dialog');
        document.body.appendChild(modal);
        recordViewerModal = modal;

        // Populate summary and issues
        const summaryNode = modal.querySelector('#recordSummary');
        const issuesNode = modal.querySelector('#recordIssues');
        const jsonNode = modal.querySelector('#recordJson');

        // Try to find a prebuilt summary in state.recordSummaries
        let recordSummary = null;
        try {
          recordSummary = (typeof state !== 'undefined' && Array.isArray(state.recordSummaries))
            ? state.recordSummaries.find((s) => s.file_name === result.fileName && Number(s.row_number) === Number(result.recordIndex))
            : null;
        } catch (e) {
          recordSummary = null;
        }

        const primary = escapeHtml(result.primaryId || (recordSummary && (recordSummary.ProjectCode || recordSummary.Title || recordSummary.AgentID)) || "(unknown)");
        const status = escapeHtml(recordSummary?.qa_status || result.qa_status || "(unknown)");
        const errorCount = recordSummary?.error_count ?? (state.results.filter(r=>r.fileName===result.fileName && Number(r.recordIndex)===Number(result.recordIndex) && r.severity==='high').length);
        const warningCount = recordSummary?.warning_count ?? (state.results.filter(r=>r.fileName===result.fileName && Number(r.recordIndex)===Number(result.recordIndex) && r.severity==='medium').length);

        if (summaryNode instanceof HTMLElement) {
          summaryNode.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
              <div><div class="meta">Primary ID</div><strong>${primary}</strong></div>
              <div><div class="meta">Status</div><strong>${status}</strong></div>
              <div><div class="meta">Issues</div><strong>${errorCount} errors · ${warningCount} warnings</strong></div>
            </div>
          `;
        }

        // Build issues list from recordSummary if available, otherwise from state.results
        const issues = [];
        if (recordSummary) {
          (recordSummary.errors || []).forEach((it) => issues.push({ severity: 'high', ...it }));
          (recordSummary.warnings || []).forEach((it) => issues.push({ severity: 'medium', ...it }));
          (recordSummary.infos || []).forEach((it) => issues.push({ severity: 'low', ...it }));
        } else {
          state.results.filter(r=>r.fileName===result.fileName && Number(r.recordIndex)===Number(result.recordIndex)).forEach((r)=>issues.push({ severity: r.severity || 'low', field: r.field, expected: r.expected, actual: r.actual }));
        }

        if (issuesNode instanceof HTMLElement) {
          if (!issues.length) {
            issuesNode.innerHTML = '<div class="summary-item"><div><strong>No issues for this record</strong><div class="meta">This record passed validation.</div></div></div>';
          } else {
            issuesNode.innerHTML = issues.map((issue, i) => `
              <div class="profile-item" style="align-items:flex-start;">
                <div style="flex:1;min-width:0;">
                  <strong>${escapeHtml(issue.field || '(field)')} <span style="font-weight:600;">· ${escapeHtml(issue.ruleId || issue.ruleType || '')}</span></strong>
                  <div class="meta">${escapeHtml(issue.message || issue.expected || '')}</div>
                  <div class="meta">Current: <code>${escapeHtml(issue.actual || '')}</code></div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
                  <button type="button" class="pill ${issue.severity==='high'?'high':issue.severity==='medium'?'medium':'info'}" data-issue-index="${i}" data-issue-field="${escapeHtml(issue.field||'')}">${escapeHtml(issue.severity)}</button>
                </div>
              </div>
            `).join('');

            // Add click handlers to issue buttons
            issuesNode.querySelectorAll('[data-issue-index]').forEach((btn) => {
              btn.addEventListener('click', (ev) => {
                const field = btn.getAttribute('data-issue-field') || '';
                // render JSON viewer with highlight
                if (jsonNode instanceof HTMLElement) {
                  jsonNode.innerHTML = '';
                  jsonNode.appendChild(window.DQCTJsonViewer.renderRecordViewer(record, field));
                  // switch to JSON tab
                  switchToTab('json');
                  // try to scroll to highlighted element
                  setTimeout(() => {
                    const mark = jsonNode.querySelector('.dqct-json-highlight');
                    if (mark && mark.scrollIntoView) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }
              });
            });
          }
        }

        // Initially render JSON view hidden
        if (jsonNode instanceof HTMLElement) {
          jsonNode.innerHTML = '';
          jsonNode.appendChild(window.DQCTJsonViewer.renderRecordViewer(record, result.field || ''));
        }

        // Tab switching helper
        function switchToTab(name) {
          modal.querySelectorAll('[data-record-panel]').forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            el.style.display = el.id === 'record' + name.charAt(0).toUpperCase() + name.slice(1) ? 'block' : 'none';
          });
          // also update button active states
          modal.querySelectorAll('[data-record-tab]').forEach((b) => {
            b.classList.toggle('selected', b.getAttribute('data-record-tab') === name);
          });
        }

        // wire tab buttons
        modal.querySelectorAll('[data-record-tab]').forEach((b) => {
          b.addEventListener('click', () => switchToTab(b.getAttribute('data-record-tab')));
        });

        // wire close
        modal.addEventListener('click', (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          if (target === modal || target.closest('[data-close-record-viewer]')) {
            closeRecordViewer();
          }
        });

        // start on Summary
        switchToTab('summary');
      }

      function ensureResultsTable() {
        if (validationResultsTable || !window.DQCTTable?.create) {
          return;
        }
        const formatRecordIndex = (result) => `${result.recordIndex ?? ""}${result.documentIndex != null ? ` / doc ${result.documentIndex + 1}` : ""}`;
        const renderEscapedColumn = (key) => (result) => escapeHtml(result[key] || "");
        validationResultsTable = window.DQCTTable.create({
          tableElement: els.resultsTable,
          bodyElement: els.resultsBody,
          pageSize: 25,
          onRowClick: openRecordViewer,
          columns: [
            { key: "fileName", sortable: true },
            {
              key: "recordIndex",
              sortable: true,
              sortValue: (result) => Number(result.recordIndex),
              render: formatRecordIndex
            },
            { key: "primaryId", sortable: true, render: renderEscapedColumn("primaryId") },
            { key: "field", sortable: true, render: renderEscapedColumn("field") },
            { key: "ruleType", sortable: true, render: renderEscapedColumn("ruleType") },
            { key: "expected", sortable: true, render: renderEscapedColumn("expected") },
            { key: "actual", sortable: true, render: renderEscapedColumn("actual") },
            {
              key: "severity",
              sortable: true,
              render: (result) => {
                const severity = ["high", "medium", "low"].includes(result.severity) ? result.severity : "low";
                return `<span class="pill ${severity}">${escapeHtml(severity)}</span>`;
              }
            },
            { key: "action", sortable: false, render: (result) => `<button type="button" class="ghost" data-row-ticket="${escapeHtml(issueGroupKey(result))}">Ticket</button>` }
          ]
        });
      }

      function ensureRecordSummariesTable() {
        if (recordSummariesTable || !window.DQCTTable?.create) {
          return;
        }
        const formatQaStatus = (record) => {
          const status = record.qa_status;
          const statusClass = status === 'FAIL' ? 'high' : status === 'PASS_WITH_WARNINGS' ? 'medium' : 'info';
          return `<span class="pill ${statusClass}">${escapeHtml(status)}</span>`;
        };
        recordSummariesTable = window.DQCTTable.create({
          tableElement: els.recordSummariesTable,
          bodyElement: els.recordSummariesBody,
          pageSize: 25,
          columns: [
            { key: 'row_number', label: '#' },
            { key: 'file_name', label: 'File' },
            { key: 'AgentID', label: 'Agent ID' },
            { key: 'ProjectCode', label: 'Project Code' },
            { key: 'Title', label: 'Title' },
            { key: 'BidStatus', label: 'Bid Status' },
            { key: 'qa_status', label: 'QA Status', render: formatQaStatus },
            { key: 'error_count', label: 'Errors' },
            { key: 'warning_count', label: 'Warnings' },
            { key: 'info_count', label: 'Info' }
          ]
        });
      }

      function renderFiles() {
        els.loadedFileCount.textContent = String(state.files.length);
        els.loadedFileMeta.textContent = state.files.length
          ? `${state.files.reduce((sum, file) => sum + file.records.length, 0)} parsed records`
          : "Waiting for upload";

        els.fileList.innerHTML = state.files.length
          ? state.files
              .map((file) => `
                <div class="file-item">
                  <div>
                    <strong>${file.name}</strong>
                    <div class="meta">${file.records.length} records · ${Math.round(file.size / 1024)} KB</div>
                    ${file.status === "error" ? `<div class="meta" style="color: var(--danger);">${file.error}</div>` : ""}
                  </div>
                  <span class="pill ${file.status === "error" ? "high" : "info"}">${file.status}</span>
                </div>`)
              .join("")
          : '<div class="summary-item"><div><strong>No files loaded</strong><div class="meta">Drop JSON files or load sample data.</div></div></div>';
      }

      function renderSummary() {
        const totalRecords = state.files.reduce((sum, file) => sum + file.records.length, 0);
        const failureCount = state.results.length;
        const high = state.results.filter((result) => result.severity === "high").length;
        const medium = state.results.filter((result) => result.severity === "medium").length;
        const low = state.results.filter((result) => result.severity === "low").length;

        els.failureCount.textContent = String(failureCount);
        els.failureMeta.textContent = failureCount ? `${high} high · ${medium} medium · ${low} low` : "No validation run yet";

        els.summaryLayout.innerHTML = [
          { label: "Records loaded", value: totalRecords, note: "Across all files" },
          { label: "Files with errors", value: state.files.filter((file) => file.status === "error").length, note: "Parse or shape errors" },
          { label: "Active rules", value: activeProfile().rules.filter((rule) => rule.enabled).length, note: `Runtime disabled: ${state.runtimeOverrides.size}` }
        ]
          .map((item) => `
            <div class="summary-box">
              <div class="meta">${item.label}</div>
              <strong>${item.value}</strong>
              <div class="meta">${item.note}</div>
            </div>`)
          .join("");
      }

      function renderDashboard() {
        const profileName = activeProfile().profile_name;
        const runs = getLatestHistoryForProfile(profileName);
        const filteredRuns = applyHistoryFilters(runs);
        const today = new Date().toISOString().slice(0, 10);
        const runsToday = filteredRuns.filter((run) => run.timestamp.slice(0, 10) === today);
        const recentRuns = filteredRuns.slice(0, 30);
        const passRate = recentRuns.length
          ? Math.round((recentRuns.reduce((sum, run) => sum + (run.passRate || 0), 0) / recentRuns.length) * 100)
          : 0;
        const latestRun = filteredRuns[0] || null;
        const openIssues = (state.results.length || 0) + (state.currentAnomalies.length || 0);
        const formatRunFiles = (run) => {
          const files = run.files || [];
          if (!files.length) {
            return "(none)";
          }
          const firstFile = files[0]?.name || "(unnamed file)";
          return files.length > 1 ? `${firstFile} +${files.length - 1} more` : firstFile;
        };

        els.dashboardRunsToday.textContent = String(runsToday.length);
        els.dashboardRunsTodayMeta.textContent = `${profileName} profile runs stored locally`;
        els.dashboardFilesChecked.textContent = String(state.files.length);
        els.dashboardFilesCheckedMeta.textContent = `${state.files.filter((file) => file.status === "ready").length} ready · ${state.files.filter((file) => file.status === "error").length} parse errors`;
        els.dashboardPassRate.textContent = `${passRate}%`;
        els.dashboardPassRateMeta.textContent = recentRuns.length ? `${recentRuns.length} recent runs averaged` : "No validated runs yet";
        els.dashboardOpenIssues.textContent = String(openIssues);
        els.dashboardOpenIssuesMeta.textContent = latestRun ? `${latestRun.failureCount} failures on the latest run` : "No validation run yet";
        els.historyBadge.textContent = `${filteredRuns.length}/${runs.length} stored`;

        const historyKey = filteredRuns.length + ':' + (filteredRuns[0]?.timestamp ?? '');
        if (historyKey !== _lastHistoryKey) {
          _lastHistoryKey = historyKey;
          els.runHistoryBody.innerHTML = filteredRuns.slice(0, 12).length
            ? filteredRuns.slice(0, 12).map((run) => `
              <tr>
                <td>${escapeHtml(run.timestamp.replace("T", " ").slice(0, 19))}</td>
                <td>${escapeHtml(run.profileName)}</td>
                <td>${escapeHtml(formatRunFiles(run))}</td>
                <td>${run.rowCount || 0}</td>
                <td>${run.ruleCount ?? activeProfile().rules.filter((rule) => rule.enabled && !state.runtimeOverrides.has(rule.id)).length}</td>
                <td>${Math.round((run.passRate || 0) * 100)}%</td>
                <td>${run.anomalyCount || 0}</td>
                <td><span class="badge ${run.failureCount > 0 ? "warn" : "good"}">${run.failureCount > 0 ? "issues" : "clean"}</span></td>
              </tr>`).join("")
            : '<tr><td colspan="8" class="muted">Run validation to populate local history.</td></tr>';
        }

        renderSparkline(recentRuns.map((run) => Math.round((run.passRate || 0) * 100)));

        const latestIssues = state.results.slice(0, 10).map((result) => ({
          title: `${result.field} failed ${result.ruleType}`,
          detail: `${result.fileName} · record ${result.recordIndex} · ${result.severity}`
        }));
        const anomalyIssues = state.currentAnomalies.map((anomaly) => ({
          title: anomaly.label,
          detail: anomaly.detail
        }));
        const issueItems = [...latestIssues, ...anomalyIssues].slice(0, 10);

        const issuesFeedKey = state.results.length + ':' + state.currentAnomalies.length + ':' + (state.results[0]?.ruleId ?? '') + ':' + (filteredRuns[0]?.timestamp ?? '');
        if (issuesFeedKey !== _lastIssuesFeedKey) {
          _lastIssuesFeedKey = issuesFeedKey;
          els.recentIssuesFeed.innerHTML = issueItems.length
            ? issueItems.map((item) => `
              <div class="issue-item">
                <strong>${escapeHtml(item.title)}</strong>
                <div class="meta">${escapeHtml(item.detail)}</div>
              </div>`).join("")
            : '<div class="issue-item"><strong>No current issues</strong><div class="meta">Validated runs and anomaly warnings will appear here.</div></div>';
        }
      }

      function applyHistoryFilters(runs) {
        const filters = state.historyFilters || {};
        const status = filters.status || "all";
        const from = filters.from ? new Date(filters.from) : null;
        const to = filters.to ? new Date(filters.to) : null;
        const search = String(filters.search || "").trim().toLowerCase();

        return (runs || []).filter((run) => {
          if (status === "issues" && !(run.failureCount > 0)) {
            return false;
          }
          if (status === "clean" && !(run.failureCount === 0)) {
            return false;
          }

          const timestamp = new Date(run.timestamp || 0);
          if (from && !Number.isNaN(from.valueOf()) && timestamp < from) {
            return false;
          }
          if (to && !Number.isNaN(to.valueOf())) {
            const inclusiveTo = new Date(to);
            inclusiveTo.setHours(23, 59, 59, 999);
            if (timestamp > inclusiveTo) {
              return false;
            }
          }

          if (search) {
            const haystack = [run.profileName, run.timestamp, (run.files || []).map((file) => file.name).join(" "), String(run.id || "")].join(" ").toLowerCase();
            if (!haystack.includes(search)) {
              return false;
            }
          }

          return true;
        });
      }

      function renderSparkline(values) {
        if (!values.length) {
          els.trendSparkline.innerHTML = '<text x="12" y="32" fill="currentColor">No trend data yet.</text>';
          return;
        }

        const width = 400;
        const height = 140;
        const padding = 16;
        const points = values.map((value, index) => {
          const x = values.length === 1 ? width / 2 : padding + (index * (width - padding * 2)) / (values.length - 1);
          const y = height - padding - ((value / 100) * (height - padding * 2));
          return { x, y, value };
        });
        const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
        const area = `${path} L ${points.at(-1).x.toFixed(1)} ${height - padding} L ${points[0].x.toFixed(1)} ${height - padding} Z`;

        els.trendSparkline.innerHTML = `
          <defs>
            <linearGradient id="sparklineFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="rgba(32, 74, 135, 0.32)" />
              <stop offset="100%" stop-color="rgba(32, 74, 135, 0.03)" />
            </linearGradient>
          </defs>
          <path d="${area}" fill="url(#sparklineFill)"></path>
          <path d="${path}" fill="none" stroke="rgba(32, 74, 135, 0.95)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
          ${points.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.5" fill="rgba(32, 74, 135, 0.95)"></circle>`).join("")}
        `;
      }

      function renderDriftPanel() {
        const profileName = activeProfile().profile_name;
        const baseline = state.schemaBaselines[profileName]?.schema || null;
        const incoming = state.currentSchema;

        els.baselineSchemaMeta.textContent = baseline ? `${state.schemaBaselines[profileName].rootArray || "Export"} · ${baseline.fields.length} fields` : "No baseline saved yet";
        els.baselineSchemaFields.textContent = baseline ? `Saved ${new Date(state.schemaBaselines[profileName].savedAt).toLocaleString()} for ${profileName}` : "Validate once to capture the first schema snapshot.";
        els.incomingSchemaMeta.textContent = incoming ? `${incoming.fields.length} fields detected` : "Waiting for a run";
        els.incomingSchemaFields.textContent = incoming ? `Current run fields summarized from ${state.currentRunStats?.rowCount || 0} records.` : "Uploaded fields are summarized after validation.";

        const renderFieldList = (items, emptyLabel) => items.length
          ? items.map((item) => `<div class="drift-item"><strong>${escapeHtml(item.field || item.label || "")}</strong><div class="meta">${escapeHtml(item.type ? `${item.type} · null rate ${(item.nullRate * 100).toFixed(1)}%` : item.detail || item.incoming || item.baseline || "")}</div></div>`).join("")
          : `<div class="drift-item"><strong>${emptyLabel}</strong></div>`;

        const diffEntries = [];
        (state.currentDrift.added || []).forEach((item) => {
          diffEntries.push({
            field: item.field,
            type: "Added field",
            baseline: "Missing from baseline",
            incoming: item.type ? `${item.type} · null rate ${(item.nullRate * 100).toFixed(1)}%` : "Present in incoming data"
          });
        });
        (state.currentDrift.removed || []).forEach((item) => {
          diffEntries.push({
            field: item.field,
            type: "Removed field",
            baseline: item.type ? `${item.type} · null rate ${(item.nullRate * 100).toFixed(1)}%` : "Present in baseline",
            incoming: "Missing from incoming data"
          });
        });
        (state.currentDrift.typeChanges || []).forEach((item) => {
          diffEntries.push({
            field: item.field,
            type: "Type change",
            baseline: item.baseline,
            incoming: item.incoming
          });
        });

        els.addedFieldsList.innerHTML = renderFieldList(state.currentDrift.added || [], "No added fields");
        els.removedFieldsList.innerHTML = renderFieldList(state.currentDrift.removed || [], "No removed fields");
        els.typeChangesList.innerHTML = (state.currentDrift.typeChanges || []).length
          ? state.currentDrift.typeChanges.map((item) => `<div class="drift-item"><strong>${escapeHtml(item.field)}</strong><div class="meta">Baseline ${escapeHtml(item.baseline)} → Incoming ${escapeHtml(item.incoming)}</div></div>`).join("")
          : '<div class="drift-item"><strong>No type changes</strong></div>';
        els.driftDiffList.innerHTML = diffEntries.length
          ? diffEntries.map((item) => `
            <div class="drift-item diff">
              <strong>${escapeHtml(item.field)}</strong>
              <div class="meta">${escapeHtml(item.type)}</div>
              <div class="diff-columns">
                <div class="diff-column">
                  <div class="label">Baseline</div>
                  <div class="value">${escapeHtml(item.baseline)}</div>
                </div>
                <div class="diff-column">
                  <div class="label">Incoming</div>
                  <div class="value">${escapeHtml(item.incoming)}</div>
                </div>
              </div>
            </div>`).join("")
          : '<div class="drift-item"><strong>No schema drift differences</strong></div>';

        els.anomaliesList.innerHTML = (state.currentAnomalies || []).length
          ? state.currentAnomalies.map((item) => `<div class="drift-item"><strong>${escapeHtml(item.label)}</strong><div class="meta">${escapeHtml(item.detail)}</div><div style="margin-top: 0.4rem;"><span class="badge ${item.severity === "warn" ? "warn" : "good"}">${escapeHtml(item.severity)}</span></div></div>`).join("")
          : '<div class="drift-item"><strong>No anomaly warnings</strong></div>';
      }

      function renderRules() {
        const profile = activeProfile();
        els.activeProfileLabel.textContent = profile.profile_name;
        els.activeProfileMeta.textContent = `${profile.rules.length} rules · root ${profile.root_array}`;
        els.profileSelect.innerHTML = state.profiles
          .map((profileItem) => `<option value="${profileItem.profile_name}" ${profileItem.profile_name === profile.profile_name ? "selected" : ""}>${profileItem.profile_name}</option>`)
          .join("");

        const filter = state.ruleSearch.trim().toLowerCase();
        const filteredRules = profile.rules.filter((rule) => {
          const matchesLayer = state.currentLayer === "all" || rule.layer === state.currentLayer;
          const matchesSearch = !filter || [rule.id, rule.field, rule.type, rule.notes, rule.severity, rule.layer].some((value) => String(value || "").toLowerCase().includes(filter));
          return matchesLayer && matchesSearch;
        });
        // Group rules by field name for collapsible groups
        const groups = {};
        for (const rule of filteredRules) {
          const key = rule.field || "(no field)";
          groups[key] = groups[key] || [];
          groups[key].push(rule);
        }
        const groupNames = Object.keys(groups);
        const allExpanded = groupNames.length > 0 && groupNames.every((field) => state.expandedFields.has(field));

        els.rulesList.innerHTML = groupNames.length ? groupNames.map((field) => {
          const rules = groups[field];
          const isExpanded = state.expandedFields.has(field);
          const header = `
            <div class="field-group-header">
              <div class="field-title">
                <div class="field-title-row">
                  <strong>${escapeHtml(field)}</strong>
                  <div class="field-actions">
                    <button type="button" class="field-action delete" data-delete-field="${escapeHtml(field)}" aria-label="Delete rule for ${escapeHtml(field)}">Delete</button>
                    <button type="button" class="field-action toggle" data-toggle-field="${escapeHtml(field)}" aria-label="${isExpanded ? "Collapse" : "Expand"} rules for ${escapeHtml(field)}">${isExpanded ? "Collapse" : "Expand"}</button>
                  </div>
                </div>
                <div class="meta">${rules.length} rule${rules.length === 1 ? "" : "s"}</div>
              </div>
            </div>`;

          const rulesHtml = isExpanded
            ? rules.map((rule) => `
                <article class="rule-card" data-rule-id="${rule.id}">
                  <div class="rule-top">
                    <div class="rule-meta">
                      <span class="pill info">${rule.layer}</span>
                      <span class="pill ${rule.severity}">${rule.severity}</span>
                      <span class="title">${rule.id} · ${escapeHtml(rule.field)}</span>
                      <span class="muted">${rule.type}</span>
                      ${state.runtimeOverrides.has(rule.id) ? '<span class="pill low">runtime disabled</span>' : ""}
                    </div>
                    <div class="rule-actions">
                      <label class="switch">
                        <input type="checkbox" ${rule.enabled ? "checked" : ""} data-toggle-rule="${rule.id}" />
                        Enabled
                      </label>
                      <button type="button" class="ghost" data-delete-rule="${rule.id}">Delete</button>
                    </div>
                  </div>
                  <div class="rule-grid">
                    <div class="fieldset wide">
                      <label>Notes</label>
                      <input type="text" value="${escapeHtml(rule.notes || "")}" data-rule-notes="${rule.id}" />
                    </div>
                    <div class="fieldset">
                      <label>Type</label>
                      <input type="text" value="${rule.type}" data-rule-type="${rule.id}" />
                    </div>
                    <div class="fieldset">
                      <label>Severity</label>
                      <select data-rule-severity="${rule.id}">
                        ${["high", "medium", "low"].map((severity) => `<option value="${severity}" ${severity === rule.severity ? "selected" : ""}>${severity}</option>`).join("")}
                      </select>
                    </div>
                    <div class="fieldset">
                      <label>Field</label>
                      <input type="text" value="${rule.field}" data-rule-field="${rule.id}" />
                    </div>
                    <div class="fieldset">
                      <label>Layer</label>
                      <input type="text" value="${rule.layer}" data-rule-layer="${rule.id}" />
                    </div>
                    <div class="fieldset full">
                      <label>Condition / extras</label>
                      <input type="text" value="${escapeHtml(renderRuleExtras(rule))}" data-rule-extras="${rule.id}" />
                    </div>
                  </div>
                </article>`).join("")
            : '';

          return `<div class="field-group">${header}<div class="rules-group ${isExpanded ? '' : 'hidden'}">${rulesHtml}</div></div>`;
        }).join("") : '<div class="empty-state">No rules match the current filter.</div>';

        const toggleAllButton = document.querySelector("[data-toggle-all-fields]");
        if (toggleAllButton instanceof HTMLButtonElement) {
          toggleAllButton.textContent = allExpanded ? "Collapse all fields" : "Expand all fields";
          toggleAllButton.setAttribute("aria-pressed", String(allExpanded));
        }
      }

      function renderProfileList() {
        els.profileList.innerHTML = state.profiles
          .map((profile) => {
            const isEditing = state.editingProfile === profile.profile_name;
            if (isEditing) {
              return `
                <div class="profile-item editing">
                  <div class="profile-edit-form">
                    <div class="fieldset">
                      <label>Name</label>
                      <input type="text" name="editName" value="${escapeHtml(profile.profile_name)}" />
                    </div>
                    <div class="fieldset">
                      <label>Description</label>
                      <input type="text" name="editSource" value="${escapeHtml(profile.source || "")}" placeholder="Description / source" />
                    </div>
                    <div class="meta">root ${escapeHtml(profile.root_array)}</div>
                  </div>
                  <div class="profile-actions">
                    <button type="button" data-save-profile="${escapeHtml(profile.profile_name)}">Save</button>
                    <button type="button" class="ghost" data-cancel-edit="${escapeHtml(profile.profile_name)}">Cancel</button>
                    <button type="button" class="ghost" data-delete-profile="${escapeHtml(profile.profile_name)}">Delete</button>
                  </div>
                </div>`;
            }
            return `
              <div class="profile-item">
                <div>
                  <strong>${escapeHtml(profile.profile_name)}</strong>
                  <div class="meta">${escapeHtml(profile.source || "Custom profile")} · root ${escapeHtml(profile.root_array)}</div>
                </div>
                <div class="profile-actions">
                  <button type="button" class="ghost" data-use-profile="${escapeHtml(profile.profile_name)}">${profile.profile_name === state.activeProfileId ? "Active" : "Use"}</button>
                  <button type="button" class="ghost" data-edit-profile="${escapeHtml(profile.profile_name)}">Edit</button>
                  <button type="button" class="ghost" data-delete-profile="${escapeHtml(profile.profile_name)}">Delete</button>
                </div>
              </div>`;
          })
          .join("");
      }

      function renderResults() {
        const exactGroupCount = (state.exactDuplicates || []).length;
        const nearGroupCount = (state.nearDuplicates || []).length;
        const affectedRecordCount =
          (state.exactDuplicates || []).reduce((sum, group) => sum + (group.recordCount || 0), 0)
          + (state.nearDuplicates || []).reduce((sum, group) => sum + (group.recordCount || 0), 0);

        // Handle empty state
        if (!state.results.length && !state.recordSummaries.length) {
          els.resultsWrap.classList.add("hidden");
          els.recordSummariesWrap.classList.add("hidden");
          els.emptyState.classList.remove("hidden");
          els.duplicateSummaryBar.classList.add("hidden");
          if (validationResultsTable) {
            validationResultsTable.clear();
          } else {
            els.resultsBody.innerHTML = "";
          }
          els.recordSummariesBody.innerHTML = "";
          els.issueSummaryList.innerHTML = '<div class="issue-group"><strong>No grouped issues yet</strong><div class="meta">Run validation to generate ticket-ready issue groups.</div></div>';
          els.ticketPreview.classList.add("hidden");
          els.ticketPreview.textContent = "";
          closeRecordViewer();
          return;
        }

        els.emptyState.classList.add("hidden");
        els.duplicateSummaryBar.classList.remove("hidden");
        els.exactDuplicateGroupCount.textContent = String(exactGroupCount);
        els.nearDuplicateGroupCount.textContent = String(nearGroupCount);
        els.duplicateRecordCount.textContent = String(affectedRecordCount);

        // Reflect active duplicate filter state on the summary buttons
        try {
          document.querySelectorAll('[data-duplicate-filter]').forEach((btn) => {
            const filter = btn.getAttribute('data-duplicate-filter');
            const isActive = state.duplicateFilter === filter;
            btn.setAttribute('aria-pressed', String(isActive));
            if (isActive) {
              btn.classList.add('selected');
            } else {
              btn.classList.remove('selected');
            }
          });
        } catch (e) {
          // ignore if DOM not ready
        }

        // Show/hide appropriate table based on viewMode
        if (state.viewMode === "records") {
          els.resultsWrap.classList.add("hidden");
          els.recordSummariesWrap.classList.remove("hidden");
          els.failureViewHelper.classList.add("hidden");
          els.recordViewHelper.classList.remove("hidden");
          els.nearDuplicateHelper.classList.remove("hidden");
          els.downloadIssuesButton.classList.add("hidden");
          els.downloadRecordSummariesButton.classList.remove("hidden");
          els.downloadNearDuplicatesButton.classList.remove("hidden");
          renderRecordSummaries();
          renderNearDuplicates();
        } else {
          els.resultsWrap.classList.remove("hidden");
          els.recordSummariesWrap.classList.add("hidden");
          els.failureViewHelper.classList.remove("hidden");
          els.recordViewHelper.classList.add("hidden");
          els.nearDuplicateHelper.classList.add("hidden");
          els.downloadIssuesButton.classList.remove("hidden");
          els.downloadRecordSummariesButton.classList.add("hidden");
          els.downloadNearDuplicatesButton.classList.add("hidden");
          ensureResultsTable();
          if (validationResultsTable) {
            validationResultsTable.update(state.results);
          }
        }

        // Always render issue groups for failures view
        if (state.viewMode === "failures") {
          const issueKey = state.results.length + ':' + (state.results[0]?.ruleId ?? '') + ':' + state.viewMode;
          if (issueKey !== _lastIssueGroupsKey) {
            _lastIssueGroupsKey = issueKey;
            const grouped = state.currentIssueGroups.length ? state.currentIssueGroups : buildIssueGroups(state.results);
            state.currentIssueGroups = grouped;
            els.issueSummaryList.innerHTML = grouped
              .map((issue) => {
                const ticketText = buildTicketText(issue);
                return `
                  <article class="issue-group">
                    <div class="issue-group-head">
                      <div>
                        <strong>${escapeHtml(issue.field)} failed ${escapeHtml(issue.ruleType)}</strong>
                        <div class="meta">Rule ${escapeHtml(issue.ruleId)} · ${escapeHtml(issue.severity)} severity · ${issue.count} affected rows</div>
                        <div class="meta">Expected: ${escapeHtml(issue.expected || "See rule configuration")}</div>
                      </div>
                      <div class="issue-actions">
                        <button type="button" class="secondary" data-preview-ticket="${escapeHtml(issue.key)}">Preview ticket</button>
                        <button type="button" data-copy-ticket="${escapeHtml(issue.key)}">Copy ticket</button>
                      </div>
                    </div>
                    <div class="meta" style="margin-top: 0.65rem;">Samples: ${escapeHtml(issue.samples.map((sample) => `${sample.primaryId || sample.recordIndex}`).join(", "))}</div>
                    <div class="ticket-preview hidden" data-ticket-preview="${escapeHtml(issue.key)}">${escapeHtml(ticketText)}</div>
                  </article>`;
              })
              .join("");
          }
        }
      }

      function renderRecordSummaries() {
        if (!state.recordSummaries.length) {
          if (recordSummariesTable) {
            recordSummariesTable.clear();
          } else {
            els.recordSummariesBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem;">No record summaries available.</td></tr>';
          }
          return;
        }

        // Optionally filter record summaries when a duplicate filter is active
        let summariesToRender = state.recordSummaries;
        if (state.duplicateFilter && state.duplicateFilter !== 'all') {
          const set = new Set();
          if (state.duplicateFilter === 'exact') {
            (state.exactDuplicates || []).forEach((group) => {
              (group.rows || []).forEach((r) => set.add(`${r.file_name}#${r.row_number}`));
            });
          }
          if (state.duplicateFilter === 'near') {
            (state.nearDuplicates || []).forEach((group) => {
              (group.rows || []).forEach((r) => set.add(`${r.file_name}#${r.row_number}`));
            });
          }
          summariesToRender = state.recordSummaries.filter((record) => set.has(`${record.file_name}#${record.row_number}`));
        }

        ensureRecordSummariesTable();
        if (recordSummariesTable) {
          recordSummariesTable.update(summariesToRender);
        }
      }


      function renderNearDuplicates() {
        if (!state.exactDuplicates.length && !state.nearDuplicates.length) {
          els.issueSummaryList.innerHTML = '<div class="issue-group"><strong>No duplicate groups found</strong><div class="meta">Exact duplicates require matching fingerprints. Near-duplicates require same Agent ID + Project Code with different fingerprints.</div></div>';
          return;
        }

        const exactMarkup = state.exactDuplicates
          .map((group) => {
            const rowSamples = group.rows
              .slice(0, 5)
              .map((row) => `${row.file_name}#${row.row_number}${row.Title ? ` (${row.Title})` : ""}`)
              .join(", ");
            return `
              <article class="issue-group">
                <div class="issue-group-head">
                  <div>
                    <strong>Exact duplicate fingerprint: ${escapeHtml(group.fingerprint)}</strong>
                    <div class="meta">${group.recordCount} records · ${group.fileCount} files · ${group.uniqueAgentProjectCount} AgentID/ProjectCode pairs</div>
                    <div class="meta">Files: ${escapeHtml(group.files.join(", "))}</div>
                  </div>
                </div>
                <div class="meta" style="margin-top: 0.65rem;">Samples: ${escapeHtml(rowSamples)}</div>
              </article>`;
          })
          .join("");

        const nearMarkup = state.nearDuplicates
          .map((group) => {
            const rowSamples = group.rows
              .slice(0, 5)
              .map((row) => `${row.file_name}#${row.row_number}${row.Title ? ` (${row.Title})` : ""}`)
              .join(", ");
            return `
              <article class="issue-group">
                <div class="issue-group-head">
                  <div>
                    <strong>Near-duplicate: ${escapeHtml(group.agentId)} + ${escapeHtml(group.projectCode)}</strong>
                    <div class="meta">${group.recordCount} records · ${group.fingerprintCount} distinct fingerprints · ${group.files.length} files</div>
                    <div class="meta">Files: ${escapeHtml(group.files.join(", "))}</div>
                  </div>
                </div>
                <div class="meta" style="margin-top: 0.65rem;">Samples: ${escapeHtml(rowSamples)}</div>
              </article>`;
          })
          .join("");

        els.issueSummaryList.innerHTML = `${exactMarkup}${nearMarkup}`;
      }


      function render() {
        saveProfiles();
        renderFiles();
        renderRules();
        renderProfileList();
        renderSummary();
        renderDashboard();
        renderDriftPanel();
        renderResults();
      }

      const defaultActionStatus = "Ready to validate loaded files.";
      const actionFeedbackTimeout = 3000;
      let actionStatusTimer = null;

      function setActionStatus(message, tone = "info", persist = false) {
        if (!els.actionStatus) {
          return;
        }

        els.actionStatus.textContent = message;
        if (tone) {
          els.actionStatus.dataset.tone = tone;
        } else {
          delete els.actionStatus.dataset.tone;
        }

        if (actionStatusTimer) {
          clearTimeout(actionStatusTimer);
          actionStatusTimer = null;
        }

        if (!persist) {
          actionStatusTimer = setTimeout(() => {
            if (!els.actionStatus) {
              return;
            }
            els.actionStatus.textContent = defaultActionStatus;
            delete els.actionStatus.dataset.tone;
          }, actionFeedbackTimeout);
        }
      }

      function showToast(text, tone = "success") {
        if (tone === "error") {
          window.DQCTToasts.showError(text);
          return;
        }
        if (tone === "warning") {
          window.DQCTToasts.showWarning(text);
          return;
        }
        window.DQCTToasts.showSuccess(text);
      }

      async function withActionFeedback(button, options, action) {
        const originalHtml = button ? button.innerHTML : "";
        if (button) {
          button.disabled = true;
          button.setAttribute("aria-disabled", "true");
          button.innerHTML = `<span class="dqct-spinner" aria-hidden="true"></span>${options.runningLabel || "Working…"}`;
        }

        const startMessage = typeof options.startMessage === "function" ? options.startMessage() : options.startMessage;
        setActionStatus(startMessage, options.startTone || "info", true);

        try {
          const result = await action();
          const successMessage = typeof options.successMessage === "function" ? options.successMessage(result) : options.successMessage;
          if (successMessage) {
            setActionStatus(successMessage, options.successTone || "success");
          }
          const toastMessage = typeof options.toastMessage === "function" ? options.toastMessage(result) : options.toastMessage;
          if (toastMessage) {
            showToast(toastMessage, options.toastTone || "success");
          }
          return result;
        } catch (error) {
          setActionStatus(options.errorMessage || "Action failed.", "error");
          showToast(options.errorToast || "Action failed.", "error");
          throw error;
        } finally {
          if (button) {
            button.disabled = false;
            button.removeAttribute("aria-disabled");
            button.innerHTML = originalHtml;
          }
        }
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      function renderRuleExtras(rule) {
        if (rule.condition) {
          return `condition=${rule.condition.field}:${rule.condition.equals}`;
        }
          if (rule.expected_type) {
            return `expected_type=${rule.expected_type}`;
          }
        if (rule.pattern) {
          return `pattern=${rule.pattern}`;
        }
        if (rule.allowed) {
          return `allowed=${rule.allowed.join("|")}`;
        }
          if (rule.min !== undefined || rule.max !== undefined) {
            const min = rule.min !== undefined ? rule.min : "";
            const max = rule.max !== undefined ? rule.max : "";
            return `min=${min} max=${max}`;
          }
        if (rule.hash_field) {
          return `hash_field=${rule.hash_field}`;
        }
        if (rule.required_keys) {
          return `required_keys=${rule.required_keys.join("|")}`;
        }
        return "";
      }

      function bindEventHandlers() {
        els.fileInput.addEventListener("change", (event) => ingestFiles(event.target.files));
        els.profileSelect.addEventListener("change", (event) => {
          _lastHistoryKey = null;
          _lastIssuesFeedKey = null;
          setActiveProfile(event.target.value);
        });
        els.searchRules.addEventListener("input", (event) => {
          state.ruleSearch = event.target.value;
          renderRules();
        });
        els.runtimeOverrides.addEventListener("input", () => {
          updateRuntimeOverrides();
          renderRules();
          renderSummary();
        });
        els.clearFilesButton.addEventListener("click", async () => {
          await withActionFeedback(els.clearFilesButton, {
            runningLabel: "Clearing…",
            startMessage: "Clearing loaded files and validation results…",
            successMessage: "Loaded files and results cleared.",
            toastMessage: "Loaded files cleared."
          }, async () => clearFiles());
        });
        els.seedDemoButton.addEventListener("click", async () => {
          await withActionFeedback(els.seedDemoButton, {
            runningLabel: "Loading…",
            startMessage: () => `Loading sample ${activeProfile().profile_name} data…`,
            successMessage: (result) => `Loaded ${result.recordCount} sample records across ${result.fileCount} file${result.fileCount === 1 ? "" : "s"}.`,
            toastMessage: (result) => `Sample data loaded (${result.recordCount} records).`
          }, async () => loadSampleData());
        });
        els.runButton.addEventListener("click", async () => {
          await withActionFeedback(els.runButton, {
            runningLabel: "Running…",
            startMessage: () => `Validating ${state.files.length} loaded file${state.files.length === 1 ? "" : "s"} against ${activeProfile().profile_name} rules…`,
            successMessage: (result) => {
              if (result?.skipped) {
                return result.message;
              }
              return `Validation complete: ${result.results.length} issue${result.results.length === 1 ? "" : "s"} found across ${state.files.length} file${state.files.length === 1 ? "" : "s"}.`;
            },
            toastMessage: (result) => result?.skipped ? result.message : `Validation complete — ${result.results.length} issue${result.results.length === 1 ? "" : "s"}.`
          }, validateRun);
        });
        els.exportButton.addEventListener("click", async () => {
          await withActionFeedback(els.exportButton, {
            runningLabel: "Copying…",
            startMessage: "Copying validation report to the clipboard…",
            successMessage: "Validation report copied to the clipboard.",
            toastMessage: "Report copied."
          }, copyReport);
        });
        els.downloadIssuesButton.addEventListener("click", async () => {
          await withActionFeedback(els.downloadIssuesButton, {
            runningLabel: "Downloading…",
            startMessage: "Preparing issue JSON for download…",
            successMessage: (result) => `Downloaded ${result.issueCount} issue${result.issueCount === 1 ? "" : "s"} as ${result.filename}.`,
            toastMessage: (result) => `Downloaded ${result.issueCount} issue${result.issueCount === 1 ? "" : "s"}.`
          }, downloadIssuesJson);
        });
        els.viewToggle.addEventListener("change", (event) => {
          state.viewMode = event.target.value;
          renderResults();
        });
        els.downloadRecordSummariesButton.addEventListener("click", async () => {
          await withActionFeedback(els.downloadRecordSummariesButton, {
            runningLabel: "Downloading…",
            startMessage: "Preparing record summaries JSON for download…",
            successMessage: (result) => `Downloaded ${result.recordCount} record${result.recordCount === 1 ? "" : "s"} as ${result.filename}.`,
            toastMessage: (result) => `Downloaded ${result.recordCount} record summary summaries.`
          }, downloadRecordSummariesJson);
        });
        els.downloadNearDuplicatesButton.addEventListener("click", async () => {
          await withActionFeedback(els.downloadNearDuplicatesButton, {
            runningLabel: "Downloading…",
            startMessage: "Preparing duplicate groups JSON for download…",
            successMessage: (result) => `Downloaded ${result.groupCount} duplicate group${result.groupCount === 1 ? "" : "s"} (${result.recordCount} records) as ${result.filename}.`,
            toastMessage: (result) => `Downloaded ${result.groupCount} duplicate group${result.groupCount === 1 ? "" : "s"}.`
          }, downloadNearDuplicatesJson);
        });
        els.cloneProfileButton.addEventListener("click", async () => {
          await withActionFeedback(els.cloneProfileButton, {
            runningLabel: "Cloning…",
            startMessage: "Cloning the active profile…",
            successMessage: (profileName) => `Cloned profile ${profileName}.`,
            toastMessage: (profileName) => `Profile ${profileName} is now active.`
          }, cloneProfile);
        });
          els.importSchemaButton.addEventListener("click", () => {
            els.schemaImportInput.value = "";
            els.schemaImportInput.click();
          });
          els.schemaImportInput.addEventListener("change", async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }

            try {
              await withActionFeedback(els.importSchemaButton, {
                runningLabel: "Importing…",
                startMessage: () => `Importing schema draft from ${file.name}…`,
                successMessage: (draftProfile) => `Imported schema draft ${draftProfile.profile_name}.`,
                toastMessage: (draftProfile) => `Schema draft ${draftProfile.profile_name} imported.`
              }, async () => importSchemaFromFile(file));
            } catch (error) {
              // error handled silently for UI import flow
            } finally {
              event.target.value = "";
            }
          });
        els.saveProfileButton.addEventListener("click", async () => {
          await withActionFeedback(els.saveProfileButton, {
            runningLabel: "Saving…",
            startMessage: "Saving the active profile changes…",
            successMessage: (profileName) => `Saved profile ${profileName}.`,
            toastMessage: (profileName) => `Profile ${profileName} saved.`
          }, saveActiveProfile);
        });
        els.resetProfileButton.addEventListener("click", async () => {
          await withActionFeedback(els.resetProfileButton, {
            runningLabel: "Resetting…",
            startMessage: "Resetting the active profile to defaults…",
            successMessage: (profileName) => `Reset ${profileName} to defaults.`,
            toastMessage: (profileName) => `Profile reset to ${profileName}.`
          }, resetProfile);
        });
        els.showCore.addEventListener("click", () => {
          state.currentLayer = "core";
          renderRules();
        });
        els.showDomain.addEventListener("click", () => {
          state.currentLayer = "domain";
          renderRules();
        });
        els.showDiagnostic.addEventListener("click", () => {
          state.currentLayer = "diagnostic";
          renderRules();
        });
        els.showAll.addEventListener("click", () => {
          state.currentLayer = "all";
          renderRules();
        });

        const syncHistoryFilters = () => {
          state.historyFilters = {
            status: els.runFilterStatus?.value || "all",
            from: els.runFilterFrom?.value || null,
            to: els.runFilterTo?.value || null,
            search: els.runFilterSearch?.value || ""
          };
          if (typeof saveUiState === "function") {
            saveUiState();
          }
          renderDashboard();
        };

        els.runFilterStatus?.addEventListener("change", syncHistoryFilters);
        els.runFilterFrom?.addEventListener("change", syncHistoryFilters);
        els.runFilterTo?.addEventListener("change", syncHistoryFilters);
        els.runFilterSearch?.addEventListener("input", syncHistoryFilters);

        document.addEventListener("change", (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) {
            return;
          }

          if (target.matches("[data-toggle-rule]")) {
            const ruleId = target.getAttribute("data-toggle-rule");
            updateRule(ruleId, { enabled: target instanceof HTMLInputElement ? target.checked : false });
          }

          if (target.matches("[data-rule-severity]")) {
            updateRule(target.getAttribute("data-rule-severity"), { severity: target.value });
          }

          if (target.matches("[data-rule-field]")) {
            updateRule(target.getAttribute("data-rule-field"), { field: target.value });
          }

          if (target.matches("[data-rule-layer]")) {
            updateRule(target.getAttribute("data-rule-layer"), { layer: target.value });
          }

          if (target.matches("[data-rule-type]")) {
            updateRule(target.getAttribute("data-rule-type"), { type: target.value });
          }
        });

        document.addEventListener("input", (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) {
            return;
          }

          if (target.matches("[data-rule-notes]")) {
            updateRule(target.getAttribute("data-rule-notes"), { notes: target.value });
          }

          if (target.matches("[data-rule-extras]")) {
            patchRuleExtras(target.getAttribute("data-rule-extras"), target.value);
          }
        });

        document.addEventListener("click", (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) {
            return;
          }

          const deleteRuleId = target.getAttribute("data-delete-rule");
          if (deleteRuleId) {
            const confirmed = window.confirm(`Delete rule ${deleteRuleId}?`);
            if (confirmed) {
              deleteRule(deleteRuleId);
            }
            return;
          }

          const deleteProfileName = target.getAttribute("data-delete-profile");
          if (deleteProfileName) {
            const confirmed = window.confirm(`Delete profile ${deleteProfileName}? This will remove saved rules and schema baseline for the profile.`);
            if (confirmed) {
              if (typeof deleteProfile === "function") {
                const ok = deleteProfile(deleteProfileName);
                if (!ok) {
                  alert(`Unable to delete profile ${deleteProfileName}.`);
                }
              }
            }
            return;
          }

          const deleteFieldName = target.getAttribute("data-delete-field");
          if (deleteFieldName) {
            const confirmed = window.confirm(`Delete rule for field ${deleteFieldName}?`);
            if (confirmed) {
              if (typeof deleteRulesByField === "function") {
                const ok = deleteRulesByField(deleteFieldName);
                if (!ok) {
                  alert(`Unable to delete field group ${deleteFieldName}.`);
                }
              }
            }
            return;
          }

          const editProfileName = target.getAttribute("data-edit-profile");
          if (editProfileName) {
            state.editingProfile = editProfileName;
            renderProfileList();
            return;
          }

          const saveProfileOld = target.getAttribute("data-save-profile");
          if (saveProfileOld) {
            const container = target.closest('.profile-item');
            if (!container) return;
            const nameInput = container.querySelector('input[name="editName"]');
            const sourceInput = container.querySelector('input[name="editSource"]');
            const newName = nameInput ? nameInput.value.trim() : null;
            const newSource = sourceInput ? sourceInput.value.trim() : null;
            if (!newName) { alert('Profile name cannot be empty'); return; }
            if (typeof renameProfile === "function") {
              const ok = renameProfile(saveProfileOld, newName, newSource || "");
              if (!ok) alert(`Unable to rename profile ${saveProfileOld} to ${newName}. Name might already exist.`);
            }
            state.editingProfile = null;
            renderProfileList();
            renderSummary();
            return;
          }

          const toggleField = target.getAttribute("data-toggle-field");
          if (toggleField) {
            if (state.expandedFields.has(toggleField)) {
              state.expandedFields.delete(toggleField);
            } else {
              state.expandedFields.add(toggleField);
            }
            if (typeof saveUiState === "function") {
              saveUiState();
            }
            renderRules();
            return;
          }

          const toggleAllFields = target.getAttribute("data-toggle-all-fields");
          if (toggleAllFields) {
            const fieldNames = Array.from(document.querySelectorAll(".field-group-header strong")).map((node) => node.textContent || "(no field)");
            const shouldExpand = !fieldNames.every((field) => state.expandedFields.has(field));
            state.expandedFields = shouldExpand ? new Set(fieldNames) : new Set();
            if (typeof saveUiState === "function") {
              saveUiState();
            }
            renderRules();
            return;
          }

          const cancelEdit = target.getAttribute("data-cancel-edit");
          if (cancelEdit) {
            state.editingProfile = null;
            renderProfileList();
            return;
          }

          const useProfile = target.getAttribute("data-use-profile");
          if (useProfile) {
            _lastHistoryKey = null;
            _lastIssuesFeedKey = null;
            setActiveProfile(useProfile);
          }

          const previewTicket = target.getAttribute("data-preview-ticket");
          if (previewTicket) {
            const issue = state.currentIssueGroups.find((entry) => entry.key === previewTicket);
            if (issue) {
              let previewNode = null;
              document.querySelectorAll("[data-ticket-preview]").forEach((node) => {
                if (node.getAttribute("data-ticket-preview") === previewTicket) {
                  previewNode = node;
                }
              });
              if (previewNode instanceof HTMLElement) {
                const shouldHide = !previewNode.classList.contains("hidden");
                document.querySelectorAll("[data-ticket-preview]").forEach((node) => node.classList.add("hidden"));
                if (!shouldHide) {
                  previewNode.classList.remove("hidden");
                }
              }
            }
          }

          const copyTicket = target.getAttribute("data-copy-ticket");
          if (copyTicket) {
            copyIssueTicket(copyTicket);
          }

          const rowTicket = target.getAttribute("data-row-ticket");
          if (rowTicket) {
            copyIssueTicket(rowTicket);
            const matchingPreview = document.querySelectorAll("[data-ticket-preview]");
            matchingPreview.forEach((node) => {
              if (node.getAttribute("data-ticket-preview") === rowTicket) {
                node.classList.remove("hidden");
                node.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            });
          }

          const duplicateFilter = target.getAttribute && target.getAttribute('data-duplicate-filter');
          if (duplicateFilter) {
            state.duplicateFilter = duplicateFilter;
            state.viewMode = "records";
            if (els.viewToggle instanceof HTMLSelectElement) {
              els.viewToggle.value = "records";
            }
            renderResults();
            return;
          }
        });

        ["dragenter", "dragover"].forEach((eventName) => {
          els.dropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            els.dropzone.classList.add("dragging");
          });
        });

        ["dragleave", "drop"].forEach((eventName) => {
          els.dropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            if (eventName === "drop") {
              ingestFiles(event.dataTransfer.files);
            }
            els.dropzone.classList.remove("dragging");
          });
        });

        window.addEventListener("dqct:open-reports", () => {
          els.issueSummaryList?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }

      function updateRule(ruleId, patch) {
        const profile = activeProfile();
        const nextRules = profile.rules.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule));
        const nextProfile = { ...profile, rules: nextRules };
        state.profiles = state.profiles.map((item) => (item.profile_name === profile.profile_name ? nextProfile : item));
        saveProfiles();
        renderRules();
        renderResults();
      }

      function patchRuleExtras(ruleId, text) {
        const profile = activeProfile();
        const patch = {};
        const entries = text.split(/\s+/).filter(Boolean);
        for (const entry of entries) {
          const [key, rawValue] = entry.split("=");
          if (!key || rawValue === undefined) {
            continue;
          }
          if (key === "condition") {
            const [field, equals] = rawValue.split(":");
            patch.condition = { field, equals };
          }
          if (key === "pattern") {
            patch.pattern = rawValue;
          }
          if (key === "expected_type") {
            patch.expected_type = rawValue;
          }
          if (key === "allowed") {
            patch.allowed = rawValue.split("|");
          }
          if (key === "min") {
            patch.min = rawValue;
          }
          if (key === "max") {
            patch.max = rawValue;
          }
          if (key === "hash_field") {
            patch.hash_field = rawValue;
          }
          if (key === "required_keys") {
            patch.required_keys = rawValue.split("|");
          }
        }
        const nextRules = profile.rules.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule));
        const nextProfile = { ...profile, rules: nextRules };
        state.profiles = state.profiles.map((item) => (item.profile_name === profile.profile_name ? nextProfile : item));
        saveProfiles();
        renderRules();
        renderResults();
      }

      async function initialize() {
        state.parsedRuns = loadRuns();
        state.runHistory = await loadRunHistory();
        bindEventHandlers();
        els.newRootArray.value = activeProfile().root_array || "Export";
        if (els.runFilterStatus) {
          els.runFilterStatus.value = state.historyFilters?.status || "all";
        }
        if (els.runFilterFrom) {
          els.runFilterFrom.value = state.historyFilters?.from || "";
        }
        if (els.runFilterTo) {
          els.runFilterTo.value = state.historyFilters?.to || "";
        }
        if (els.runFilterSearch) {
          els.runFilterSearch.value = state.historyFilters?.search || "";
        }
        updateRuntimeOverrides();
        setActionStatus(defaultActionStatus, "info", true);
        render();
      }

      initialize();
