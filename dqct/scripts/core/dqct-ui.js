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
        const today = new Date().toISOString().slice(0, 10);
        const runsToday = runs.filter((run) => run.timestamp.slice(0, 10) === today);
        const recentRuns = runs.slice(0, 30);
        const passRate = recentRuns.length
          ? Math.round((recentRuns.reduce((sum, run) => sum + (run.passRate || 0), 0) / recentRuns.length) * 100)
          : 0;
        const latestRun = runs[0] || null;
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
        els.historyBadge.textContent = `${runs.length} stored`;

        els.runHistoryBody.innerHTML = runs.slice(0, 12).length
          ? runs.slice(0, 12).map((run) => `
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

        els.recentIssuesFeed.innerHTML = issueItems.length
          ? issueItems.map((item) => `
            <div class="issue-item">
              <strong>${escapeHtml(item.title)}</strong>
              <div class="meta">${escapeHtml(item.detail)}</div>
            </div>`).join("")
          : '<div class="issue-item"><strong>No current issues</strong><div class="meta">Validated runs and anomaly warnings will appear here.</div></div>';
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

        els.rulesList.innerHTML = filteredRules
          .map((rule) => `
            <article class="rule-card" data-rule-id="${rule.id}">
              <div class="rule-top">
                <div class="rule-meta">
                  <span class="pill info">${rule.layer}</span>
                  <span class="pill ${rule.severity}">${rule.severity}</span>
                  <span class="title">${rule.id} · ${rule.field}</span>
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
            </article>`)
          .join("");

        if (!filteredRules.length) {
          els.rulesList.innerHTML = '<div class="empty-state">No rules match the current filter.</div>';
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
        if (!state.results.length) {
          els.resultsWrap.classList.add("hidden");
          els.emptyState.classList.remove("hidden");
          els.resultsBody.innerHTML = "";
          els.issueSummaryList.innerHTML = '<div class="issue-group"><strong>No grouped issues yet</strong><div class="meta">Run validation to generate ticket-ready issue groups.</div></div>';
          els.ticketPreview.classList.add("hidden");
          els.ticketPreview.textContent = "";
          return;
        }

        els.emptyState.classList.add("hidden");
        els.resultsWrap.classList.remove("hidden");
        els.resultsBody.innerHTML = state.results
          .map((result) => `
            <tr>
              <td>${escapeHtml(result.fileName || "")}</td>
              <td>${result.recordIndex ?? ""}${result.documentIndex !== null && result.documentIndex !== undefined ? ` / doc ${result.documentIndex + 1}` : ""}</td>
              <td>${escapeHtml(result.primaryId || "")}</td>
              <td>${escapeHtml(result.field || "")}</td>
              <td>${escapeHtml(result.ruleType || "")}</td>
              <td>${escapeHtml(result.expected || "")}</td>
              <td>${escapeHtml(result.actual || "")}</td>
              <td><span class="pill ${result.severity || "low"}">${result.severity || "low"}</span></td>
              <td><button type="button" class="ghost" data-row-ticket="${escapeHtml(issueGroupKey(result))}">Ticket</button></td>
            </tr>`)
          .join("");

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

      function showToast(text, timeout = 3200) {
        const toast = document.createElement("div");
        toast.className = "dqct-toast";
        toast.textContent = text;
        document.body.appendChild(toast);
        window.setTimeout(() => toast.classList.add("dqct-toast--hide"), timeout);
        window.setTimeout(() => toast.remove(), timeout + 350);
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
            showToast(toastMessage);
          }
          return result;
        } catch (error) {
          setActionStatus(options.errorMessage || "Action failed.", "error");
          showToast(options.errorToast || "Action failed.");
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
        els.profileSelect.addEventListener("change", (event) => setActiveProfile(event.target.value));
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
            startMessage: "Loading sample Ohio Buys data…",
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
              console.error(error);
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
              } else {
                console.warn("deleteProfile function not available");
              }
            }
            return;
          }

          const editProfileName = target.getAttribute("data-edit-profile");
          if (editProfileName) {
            state.editingProfile = editProfileName;
            render();
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
            } else {
              console.warn("renameProfile function not available");
            }
            state.editingProfile = null;
            render();
            return;
          }

          const cancelEdit = target.getAttribute("data-cancel-edit");
          if (cancelEdit) {
            state.editingProfile = null;
            render();
            return;
          }

          const useProfile = target.getAttribute("data-use-profile");
          if (useProfile) {
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
      }

      function updateRule(ruleId, patch) {
        const profile = activeProfile();
        const nextRules = profile.rules.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule));
        const nextProfile = { ...profile, rules: nextRules };
        state.profiles = state.profiles.map((item) => (item.profile_name === profile.profile_name ? nextProfile : item));
        saveProfiles();
        render();
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
        render();
      }

      async function initialize() {
        state.parsedRuns = loadRuns();
        state.runHistory = await loadRunHistory();
        bindEventHandlers();
        els.newRootArray.value = activeProfile().root_array || "Export";
        updateRuntimeOverrides();
        setActionStatus(defaultActionStatus, "info", true);
        render();
      }

      initialize();
