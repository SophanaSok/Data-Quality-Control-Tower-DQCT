# DQCT — Data Quality Control Tower

## Project
Single-file HTML/CSS/JS web app. No build tools, no frameworks, no npm.
All logic runs in the browser. CDN libraries only (Day.js, Lucide icons).

## Stack
- Vanilla JS (ES6 modules)
- CSS custom properties (design tokens, light/dark mode)
- Day.js + customParseFormat for date validation
- IndexedDB for run history
- Clipboard API for Trello export

## Data format
- Input: JSON files with a root `Export` array of bid records
- Document fields (BidDocuments, AddendumDocuments, BidTabulations, AwardDocuments)
  are serialized JSON strings — parse silently, do not flag the string format itself
- Rule profiles stored as JSON in /rules/<profile-name>.json

## Core rules always required
AgentName, AgentID, LegacyAgentID, ResourceURL must be non-empty on every record.

## Build in phases
Phase 1: upload + rule engine + results + Trello export
Phase 2: run history + schema drift + anomaly detection + dashboard
Phase 3: profile management UI + import schema + sparklines
