# Retrieval Contract v1.0 — Figma Evidence Acquisition for Story + Build Pipeline

## 1) Purpose

Define how the agent accesses Figma sources, retrieves just-enough visual evidence, stores it in a reviewable structure, and links that evidence back to stories—without asking the user to export dozens of screenshots.

## 2) Inputs the user provides

2.1 Required
	•	One or more Figma URLs (file links and/or node links)

2.2 Optional but ideal
	•	Component inventory table with per-component “Structural” Figma node links (your format is perfect)
	•	Free-form instructions (“focus on Nav + Cards first”, “ship responsive web first”, etc.)

2.3 Only when needed (fallback)
	•	1–2 screenshots to unblock access if automated retrieval isn’t possible (see §7)

## 3) Access modes (in priority order)

Mode A — Direct node rendering via Figma API (preferred)

Used when:
	•	the environment has a Figma token and can call the Figma API to export node renders (PNG/JPEG)

Mode B — Connector/tool-assisted access

Used when:
	•	your runtime provides a Figma connector that can open nodes and export images

Mode C — User-provided exports (fallback)

Used when:
	•	permissions, token, or tooling prevents retrieval

Rule: the agent always attempts A/B first; it only asks for user exports after logging the failure reason.

## 4) Credentials and permission contract

4.1 Token handling
	•	Token is provided out-of-band (env var / secret manager) and is never printed into outputs.
	•	The agent may record only: “Token present: yes/no” and “Access succeeded: yes/no”.

4.2 Required Figma permissions
	•	The token/user must have access to the file(s) referenced by the links.
	•	If access is denied:
	•	The agent reports the specific failure class (403/permission denied, missing token, file not found, etc.)
	•	The agent switches to fallback (§7)

4.3 Multi-file projects
	•	Each file is treated as its own source; assets and evidence entries include file identifiers.

## 5) Evidence acquisition strategy (small, deliberate, reviewable)

5.1 Asset types the agent is allowed to capture
	•	Frame: the primary state/variant for a component
	•	Closeup: zoomed crop to clarify labels/states (only if needed)
	•	Overlay-open: modal/sheet/drawer visible state
	•	Variant-set: multiple variants in one capture when the design shows them together
	•	Layers snapshot (optional): only when naming/variant reconciliation is hard

5.2 Retrieval ladder (default per component)

For each component in scope:
	1.	Primary frame (must-have)
	2.	Overlay-open (only if the component is an overlay OR triggers one)
	3.	Closeup (only if labels/states aren’t readable)
	4.	Layers snapshot (only if canonical naming is ambiguous)

Stop as soon as confidence is “Confirmed” for the story needs.

5.3 Table-driven targeting rule

If a component inventory table includes a node link, that node is the authoritative starting point for retrieval.

## 6) Storage, naming, and provenance

6.1 Directory structure (human-reviewable)
	•	evidence/
	•	INDEX.md
	•	assets/
	•	A-001__<canonical-name>__frame.png
	•	A-002__<canonical-name>__overlay-open.png
	•	sources/
	•	figma-files.md (list of file URLs and basic metadata)
	•	stories/
	•	BACKLOG.md
	•	STORY-<CanonicalName>.md
	•	patches/ (optional)
	•	patch-accessibility.json
	•	patch-validation.json
	•	etc.

6.2 Asset ID convention
	•	Format: A-### sequential, stable within the evidence pack
	•	Filename format:
	•	A-014__FilterSheet__overlay-open.png
	•	A-015__FilterItem__closeup.png

6.3 Asset metadata entry (recorded in evidence/INDEX.md)

Each asset entry must include:
	•	assetId
	•	canonicalComponent (or “multi-component”)
	•	type (frame / closeup / overlay-open / variant-set / layers)
	•	source (Figma URL; node link if available)
	•	whatItConfirms (short, concrete)
	•	confidence (Confirmed / Inferred / Unknown)

6.4 Provenance rule

Every claim in a story that depends on visuals must cite at least one assetId in an “Evidence Notes” section.

## 7) Failure handling and minimal fallback requests

7.1 When retrieval fails

The agent must:
	1.	Log the failure reason in evidence/INDEX.md (“Access constraint” section)
	2.	Reduce scope to the minimum still possible from text/table alone
	3.	Request the smallest unblocker from the user:

Fallback request order
	•	(1) Screenshot of the specific frame(s) for the top 1–3 components in the current batch
	•	(2) Single exported “component sheet” image
	•	(3) Short screen recording only if states are temporal (rare)

7.2 “No-guess” rule under missing evidence

If visuals cannot be retrieved, the agent must mark uncertain items as Unknown and avoid inventing UI structure.

## 8) Update and caching policy (stability for reviews)

8.1 Change detection

If the same node is re-retrieved in a later pass:
	•	preserve the original assetId
	•	store a new file as A-014__...__v2.png and note why (“updated Figma on 2026-02-01”, etc.)

8.2 Avoiding duplication

The agent should reuse existing assets for subsequent passes whenever they still support the needed claims.

## 9) Security and privacy constraints
	•	Do not store tokens, cookies, or private access metadata in the evidence pack.
	•	Do not embed personally sensitive information from Figma comments or user lists unless explicitly required and approved.
	•	Prefer frame imagery over internal commentary threads.

## 10) “Definition of Done” for retrieval

Retrieval is complete for a batch when:
	•	each in-scope component has at least one primary frame asset, and
	•	overlay/closeup/layers assets exist only where they materially improve confidence, and
	•	every story in the batch references evidence via assetIds.

