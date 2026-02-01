# Retrieval Contract v1.1 — Figma Evidence Acquisition for Story + Build Pipeline

## 1) Purpose

Define how the agent accesses Figma sources, retrieves just-enough visual evidence, stores it in a reviewable structure, and links that evidence back to stories—without asking the user to export dozens of screenshots.

This contract also defines readability gates and large-board handling so the agent does not extract requirements from images that are too small to be reliable.

---

## 2) Inputs the user provides

### 2.1 Required

- One or more Figma URLs (file links and/or node links)

### 2.2 Optional but ideal

- Component inventory table with per-component "Structural" Figma node links (your format is ideal)
- Free-form instructions ("focus on Nav + Cards first", "ship responsive web first", etc.)

### 2.3 Only when needed (fallback)

- 0–2 screenshots to unblock access if automated retrieval isn't possible (see §7)

Default expectation: the agent retrieves assets from Figma; the user should not export a pile of screenshots.

---

## 3) Access modes (in priority order)

### Mode A — Direct node rendering via Figma API (preferred)

Used when:

- the environment has a Figma token and can call the Figma API to export node renders (PNG/JPEG)

### Mode B — Connector/tool-assisted access

Used when:

- the runtime provides a Figma connector that can open nodes and export images

### Mode C — User-provided exports (fallback)

Used when:

- permissions, token, or tooling prevents retrieval

Rule: the agent always attempts A/B first; it only asks for user exports after logging the failure class and scope impact.

---

## 4) Credentials and permission contract

### 4.1 Token handling

- Token is provided out-of-band (env var / secret manager) and is never printed into outputs.
- The agent may record only:
  - "Token present: yes/no"
  - "Access succeeded: yes/no"
  - "Failure class: <see §7.1>"

### 4.2 Required Figma permissions

- The token/user must have access to the file(s) referenced by the links.
- If access is denied:
  - The agent reports the failure class (permission denied, missing token, file not found, connector unavailable, render error, etc.)
  - The agent switches to fallback (§7)

### 4.3 Multi-file projects

- Each file is treated as its own source; assets and evidence entries include file identifiers (file URL + file key if available).

---

## 5) Evidence acquisition strategy (small, deliberate, reviewable)

### 5.1 Asset types the agent is allowed to capture

- **Map (overview):** page/board capture used only for coverage and locating targets (not for extraction)
- **Frame:** primary state/variant for a component in context
- **Tile set:** a grid of cropped regions from a large board (coverage + readability without gigantic images)
- **Closeup:** zoomed crop to clarify labels/states (only if needed)
- **Overlay-open:** modal/sheet/drawer visible state
- **Variant-set:** multiple variants shown together when the design provides them as a set
- **Layers snapshot (optional):** only when naming/variant reconciliation is hard (inspector/layers export)

### 5.2 Readability gate (critical)

An image may be used for extraction only if key requirements can be read from it.

Each asset must include a readability flag in INDEX.md:

- **Readable:** safe for extracting labels/control types/state indicators
- **Not readable:** map-only; may be used for navigation/coverage but must not be used to assert microcopy, control type, or state

Rule: no microcopy, field-type, or state assertions may come from a Not readable asset.

### 5.3 Retrieval ladder (default per component)

For each component in scope:

1. Primary frame (must-have, Readable)
2. Overlay-open (only if the component is an overlay OR triggers one)
3. Closeup (only if labels/states aren't readable from the primary frame)
4. Variant-set (only if multiple states are shown and materially affect behavior)
5. Layers snapshot (only if canonical naming/variants are ambiguous)

Stop as soon as confidence is "Confirmed" for the story needs.

### 5.4 Table-driven targeting rule

If a component inventory table includes a node link, that node is the authoritative starting point for retrieval.

### 5.5 Large-board handling rule (no "giant unreadable board" extraction)

When the linked content is a large board:

- capture one map for coverage only, then
- capture frame renders, tiles, or closeups for extraction

The agent must prefer:

- frame-level renders by nodeId when available, or
- a small number of tiles that each pass the readability gate, rather than a single massive overview image.

---

## 6) Storage, naming, and provenance

### 6.1 Directory structure (human-reviewable)

```
evidence/
├── INDEX.md
├── assets/
│   ├── A-001____frame.png
│   ├── A-002____overlay-open.png
│   └── ...
├── sources/
│   └── figma-files.md (list of file URLs and basic metadata)
├── stories/
│   ├── BACKLOG.md
│   └── STORY-.md
└── patches/ (optional)
    ├── patch-accessibility.json
    ├── patch-validation.json
    └── etc.
```

### 6.2 Asset ID convention

- Format: A-### sequential, stable within the evidence pack
- Filename format examples:
  - `A-014__FilterSheet__overlay-open.png`
  - `A-015__FilterItem__closeup.png`
  - `A-016__ListingPage__map.png`
  - `A-017__ListingPage__tile-set.png`

### 6.3 Asset metadata entry (recorded in evidence/INDEX.md)

Each asset entry must include:

- assetId
- canonicalComponent (or "multi-component")
- type (map / frame / tile-set / closeup / overlay-open / variant-set / layers)
- purpose (why this asset exists)
- source (Figma URL; node link preferred)
- imageRef (local filename or render reference)
- whatItConfirms (short, concrete)
- confidence (Confirmed / Inferred / Unknown)
- readability (Readable / Not readable)

### 6.4 Provenance rule

Every claim in a story that depends on visuals must cite at least one assetId in an "Evidence Notes" section, with claim tags:

- **Confirmed** (has Readable evidence)
- **Inferred** (reasonable, not explicit)
- **Unknown** (needs more evidence)

---

## 7) Failure handling and minimal fallback requests

### 7.1 Failure classes (log one)

When retrieval fails, the agent logs one (or more) of:

- missing-token
- permission-denied
- file-not-found / invalid-link
- connector-unavailable
- render-export-failed
- rate-limited / throttled
- unknown-error

### 7.2 When retrieval fails

The agent must:

1. Log the failure class + impacted files/nodes in evidence/INDEX.md ("Access constraint" section)
2. Reduce scope to the minimum still possible from text/table alone
3. Request the smallest unblocker from the user:

**Fallback request order:**

1. Screenshot of the specific frame(s) for the top 1–3 components in the current batch
2. Single exported "component sheet" image
3. Short screen recording only if states are temporal (rare)

### 7.3 "No-guess" rule under missing evidence

If visuals cannot be retrieved, uncertain items must be marked Unknown and must not be invented.

---

## 8) Update and caching policy (stability for reviews)

### 8.1 Change detection

If the same node is re-retrieved in a later pass:

- preserve the original assetId
- store a new file as `A-014__...__v2.png` and note why ("updated Figma on 2026-02-01", etc.)
- stories must reference the intended version explicitly if it matters

### 8.2 Avoiding duplication

The agent should reuse existing assets for subsequent passes whenever they still support the needed claims.

### 8.3 Asset retirement

If an asset is superseded and should not be used:

- mark it as "deprecated" in INDEX.md with a short reason
- do not delete it (preserve review history)

---

## 9) Security and privacy constraints

- Do not store tokens, cookies, or private access metadata in the evidence pack.
- Do not embed personally sensitive information from Figma comments or user lists unless explicitly required and approved.
- Prefer frame imagery over internal commentary threads.
- If an image contains sensitive data that is not required for implementation, it must be redacted or replaced with a safer capture, and the redaction noted in INDEX.md.

---

## 10) Definition of Done for retrieval

Retrieval is complete for a batch when:

- each in-scope component has at least one primary frame asset that is Readable (or an explicit logged limitation + fallback asset), and
- overlay/closeup/variant/layers assets exist only where they materially improve confidence, and
- all story claims that depend on visuals cite evidence via assetIds, and
- no requirements rely on Not readable assets for extraction.
