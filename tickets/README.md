# User Story Agent - Tickets

**Completed tickets:** Implementation work → [./complete/](./complete/). Audit/artifact tickets (e.g. AUDIT-000, USA-30-schema-type-parity-audit) → [../archive/](../archive/).

## Epic: USA - User Story Agent

### Overview

Create a User Story Writer agent system with dual implementations:
1. **Claude Code Skills** - Slash commands for use within Claude Code
2. **Claude Agent SDK** - Standalone TypeScript agent

---

## Ticket Summary

| Ticket | Title | Priority | Status | Dependencies |
|--------|-------|----------|--------|--------------|
| [USA-1](./USA-1.md) | Project Setup | High | ✅ Done | - |
| [USA-2](./USA-2.md) | Shared Type Definitions | High | ✅ Done | USA-1 |
| [USA-3](./USA-3.md) | Core System Prompts | High | ✅ Done | USA-1 |
| [USA-4](./USA-4.md) | Iteration Prompts - User Roles & Interactive Elements | High | ✅ Done | USA-2 |
| [USA-5](./USA-5.md) | Iteration Prompts - Validation & Accessibility | High | ✅ Done | USA-2 |
| [USA-6](./USA-6.md) | Iteration Prompts - Performance & Security | High | ✅ Done | USA-2 |
| [USA-7](./USA-7.md) | Iteration Prompts - Responsive Design | Medium | ✅ Done | USA-2 |
| [USA-8](./USA-8.md) | Iteration Prompts - Internationalization | Medium | ✅ Done | USA-2 |
| [USA-9](./USA-9.md) | Iteration Prompts - Analytics | Medium | ✅ Done | USA-2 |
| [USA-10](./USA-10.md) | Iteration Registry | High | ✅ Done | USA-4 to USA-9 |
| [USA-11](./USA-11.md) | Story State Management | High | ✅ Done | USA-2 |
| [USA-12](./USA-12.md) | Context Manager | High | ✅ Done | USA-11 |
| [USA-13](./USA-13.md) | Core Agent Class - Individual Mode | High | ✅ Done | USA-10, USA-12 |
| [USA-14](./USA-14.md) | Core Agent Class - Workflow Mode | High | ✅ Done | USA-13 |
| [USA-15](./USA-15.md) | Core Agent Class - Interactive Mode | Medium | ✅ Done | USA-14 |
| [USA-16](./USA-16.md) | Agent Entry Point | High | ✅ Done | USA-15 |
| [USA-17](./USA-17.md) | Claude Code Skill - Unified Workflow | High | ✅ Done | USA-3, USA-10 |
| [USA-18](./USA-18.md) | Claude Code Skill - Interactive Mode | Medium | ✅ Done | USA-17 |
| [USA-19](./USA-19.md) | Claude Code Skills - Individual Iterations | Medium | ✅ Done | USA-17 |
| [USA-20](./USA-20.md) | Skill Generation Script | Low | ✅ Done | USA-10, USA-19 |
| [USA-21](./USA-21.md) | Logger Utility | Low | ✅ Done | USA-1 |
| [USA-22](./USA-22.md) | Logger Integration | Low | ✅ Done | USA-21, USA-13, USA-16 |
| [USA-26](./USA-26.md) | Structured Output Validation | Critical | ✅ Done | USA-13, USA-16 |
| [USA-27](./USA-27.md) | Error Recovery & Retry Logic | Critical | ✅ Done | USA-13, USA-16 |
| [USA-28](./USA-28.md) | Streaming Support | Medium | ✅ Done | USA-26, USA-27 |
| [USA-29](./USA-29.md) | Evaluator-Optimizer Pattern | Medium | ✅ Done | USA-26 |
| [USA-30](./USA-30.md) | Convert Iterations to Skills Format | High | ✅ Done | USA-10 |

**Core Agent Progress: 27/27 tickets complete (100%)** 🎉

---

## Enterprise Deployment (Phase 2)

| Ticket | Title | Priority | Status | Dependencies |
|--------|-------|----------|--------|--------------|
| [USA-31](../archive/USA-31.md) | Fix Schema Mismatches | High | ✅ Done | USA-30 |
| [USA-32](./USA-32.md) | Database Schema & Migrations | High | Ready | USA-31 |
| [USA-33](./USA-33.md) | PostgreSQL Client & Connection Pool | High | Ready | USA-32 |
| [USA-34](./USA-34.md) | Express Server Foundation | High | Ready | USA-31 |
| [USA-35](./USA-35.md) | Authentication Middleware (OIDC + API Keys) | High | Ready | USA-33, USA-34 |
| [USA-36](./USA-36.md) | Rate Limiting & Quota Management | High | Ready | USA-33, USA-35 |
| [USA-37](./USA-37.md) | Job Queue System | High | Ready | USA-32, USA-33 |
| [USA-38](./USA-38.md) | Worker Pool Implementation | High | Ready | USA-37 |
| [USA-39](./USA-39.md) | SSE Streaming Adapter | High | Ready | USA-34, USA-38 |
| [USA-40](./USA-40.md) | API Routes - Jobs | High | Ready | USA-35, USA-36, USA-37, USA-39 |
| [USA-41](./USA-41.md) | API Routes - Iterations & Workflow | Medium | Ready | USA-34, USA-35 |
| [USA-42](./USA-42.md) | API Routes - Usage & Health | Medium | Ready | USA-33, USA-35, USA-36 |
| [USA-43](./USA-43.md) | Azure Blob Storage for Mockups | Medium | Ready | USA-31, USA-37 |
| [USA-44](./USA-44.md) | Azure Key Vault Integration | High | Ready | USA-31 |
| [USA-45](./USA-45.md) | Observability (OpenTelemetry + App Insights) | Medium | Ready | USA-34 |
| [USA-46](./USA-46.md) | OpenAPI Specification | Medium | Ready | USA-40, USA-41, USA-42 |
| [USA-47](./USA-47.md) | Docker & Infrastructure Files | High | Ready | USA-34 |
| [USA-48](./USA-48.md) | API Layer Tests | High | Ready | USA-40, USA-41, USA-42 |

**Enterprise Deployment Progress: 1/18 tickets complete (USA-31 schema fixes done)**

---

## Vision Support & Quality (Phase 3)

| Ticket | Title | Priority | Status | Dependencies |
|--------|-------|----------|--------|--------------|
| [USA-59](./complete/USA-59-vision-support-system-discovery.md) | Add Vision Support to System Discovery (Pass 0) | P1 | ✅ Done | USA-30 |
| [USA-60](./complete/USA-60-vision-support-critical-iterations.md) | Add Vision Support to Critical Iterations | P1 | ✅ Done | USA-59 |
| [USA-61](./complete/USA-61-vision-support-registry-metadata.md) | Add Vision Support Metadata to Iteration Registry | P2 | ✅ Done | USA-60 |
| [USA-62](./complete/USA-62-extract-shared-overspec-patterns.md) | Extract Shared Over-Specification Patterns | P2 | Ready | USA-60 |
| [USA-63](./complete/USA-63-download-figma-screenshot.md) | Figma Auto-Detection & Security Fixes | P1 | ✅ Done | USA-60 |
| [USA-64](./USA-64-figma-magic-number.md) | Extract Figma Magic Number to Constant | P3 | Ready | USA-63 |

**Vision Support Progress: 4/6 tickets complete (67%)**

---

## Pass 2 - Story Interconnection (USA-49 to USA-57)

| Ticket | Title | Status |
|--------|-------|--------|
| [USA-49](./complete/USA-49.md) | Implement runPass2Interconnection() | ✅ Done |
| [USA-50](./complete/USA-50.md) | Create Global Consistency Judge Prompt | ✅ Done |
| [USA-51](./complete/USA-51.md) | Implement judgeGlobalConsistency() | ✅ Done |
| [USA-52](./USA-52.md) | Auto-Apply Consistency Fixes | Ready |
| [USA-53](./complete/USA-53.md) | Add 'system-workflow' Mode | ✅ Done |
| [USA-54](./complete/USA-54.md) | End-to-End Integration Tests | ✅ Done |
| [USA-55](./complete/USA-55.md) | Performance Benchmarking | ✅ Done |
| [USA-56](./complete/USA-56.md) | Tune Judge Thresholds | ✅ Done |
| [USA-57](./USA-57.md) | Model Version Pinning Strategy | Ready |

**Pass 2 Progress: 7/9 tickets complete (78%)**

---

## Code Quality & Technical Debt (USA-71 to USA-74)

| Ticket | Title | Status |
|--------|-------|--------|
| [USA-71](./complete/USA-71.md) | Add Concurrent Safety Comment to generateTitle | ✅ Done |
| [USA-72](./complete/USA-72.md) | Track Title Generation Failures in System Workflow Metadata | ✅ Done |
| [USA-73](./complete/USA-73.md) | Add Token Usage Logging to Title Generation | ✅ Done |
| [USA-74](./complete/USA-74.md) | Document Error Codes in Central Registry | ✅ Done |

**Code Quality Progress: 4/4 tickets complete (100%)**

---

## Pass 0 & Iteration Infrastructure (USA-78 to USA-83)

| Ticket | Title | Status |
|--------|-------|--------|
| [USA-78](./complete/USA-78-pass0-story-planning-and-work-context.md) | Pass 0: Story Planning and Work Context | ✅ Done |
| [USA-79](./complete/USA-79-iteration-prompt-loader.md) | Iteration Prompt Loader (Markdown + Frontmatter) | ✅ Done |
| [USA-80](./USA-80.md) | Improve Error Messages from Iteration Prompt Loader | Ready |
| [USA-81](./USA-81.md) | Validate outputFormat in Iteration Prompt Frontmatter | Ready |
| [USA-82](./USA-82.md) | Add Error Handling to Test Setup | Ready |
| [USA-83](./USA-83.md) | Add --list-iterations CLI Command | Ready |

**Pass 0 & Iteration Infrastructure Progress: 2/6 tickets complete (33%)**

---

**Overall:** Core 27 + Enterprise 0 + Vision 4 + Pass 2 (7) + Code Quality 4 + Pass 0/Iteration 2 = **44 completed tickets** across active phases.

---

## Suggested Sprint Breakdown

### Sprint 1 - Foundation
- USA-1: Project Setup
- USA-2: Shared Type Definitions
- USA-3: Core System Prompts
- USA-4: Iteration Prompts - User Roles & Interactive Elements
- USA-5: Iteration Prompts - Validation & Accessibility
- USA-6: Iteration Prompts - Performance & Security

### Sprint 2 - Prompts & Registry
- USA-7: Iteration Prompts - Responsive Design
- USA-8: Iteration Prompts - Internationalization
- USA-9: Iteration Prompts - Analytics
- USA-10: Iteration Registry
- USA-11: Story State Management

### Sprint 3 - Agent SDK
- USA-12: Context Manager
- USA-13: Core Agent Class - Individual Mode
- USA-14: Core Agent Class - Workflow Mode
- USA-15: Core Agent Class - Interactive Mode
- USA-16: Agent Entry Point

### Sprint 4 - Claude Code Skills
- USA-17: Claude Code Skill - Unified Workflow
- USA-18: Claude Code Skill - Interactive Mode
- USA-19: Claude Code Skills - Individual Iterations
- USA-20: Skill Generation Script

### Sprint 5 - Observability
- USA-21: Logger Utility
- USA-22: Logger Integration

### Sprint 6 - Agent Improvements (Anthropic Patterns Alignment)
- USA-26: Structured Output Validation (Critical)
- USA-27: Error Recovery & Retry Logic (Critical)
- USA-28: Streaming Support
- USA-29: Evaluator-Optimizer Pattern
- USA-30: Convert Iterations to Skills Format

---

## Enterprise Deployment Sprints

### Sprint 7 - API Foundation
- USA-31: Enterprise API Dependencies & Config
- USA-32: Database Schema & Migrations
- USA-33: PostgreSQL Client & Connection Pool
- USA-34: Express Server Foundation
- USA-44: Azure Key Vault Integration

### Sprint 8 - Authentication & Security
- USA-35: Authentication Middleware (OIDC + API Keys)
- USA-36: Rate Limiting & Quota Management
- USA-37: Job Queue System

### Sprint 9 - Job Processing
- USA-38: Worker Pool Implementation
- USA-39: SSE Streaming Adapter
- USA-40: API Routes - Jobs

### Sprint 10 - API Routes & Storage
- USA-41: API Routes - Iterations & Workflow
- USA-42: API Routes - Usage & Health
- USA-43: Azure Blob Storage for Mockups

### Sprint 11 - Observability & Deployment
- USA-45: Observability (OpenTelemetry + App Insights)
- USA-46: OpenAPI Specification
- USA-47: Docker & Infrastructure Files
- USA-48: API Layer Tests

---

## Dependency Graph

```
USA-1 (Project Setup)
├── USA-2 (Types)
│   ├── USA-4 (User Roles & Interactive Elements)
│   ├── USA-5 (Validation & Accessibility)
│   ├── USA-6 (Performance & Security)
│   ├── USA-7 (Responsive Design)
│   ├── USA-8 (Internationalization)
│   ├── USA-9 (Analytics)
│   │   └── USA-10 (Registry) ──────────────────┐
│   └── USA-11 (Story State)                    │
│       └── USA-12 (Context Manager)            │
│           └── USA-13 (Individual Mode) ◄──────┤
│               └── USA-14 (Workflow Mode)      │
│                   └── USA-15 (Interactive)    │
│                       └── USA-16 (Entry Point)│
├── USA-3 (System Prompts)                      │
│   └── USA-17 (Unified Skill) ◄────────────────┘
│       ├── USA-18 (Interactive Skill)
│       └── USA-19 (Individual Skills)
│           └── USA-20 (Generation Script)
├── USA-21 (Logger Utility)
│   └── USA-22 (Logger Integration) ◄── USA-13, USA-16
│
└── USA-13, USA-16
    ├── USA-26 (Structured Output Validation)
    │   ├── USA-28 (Streaming Support) ◄── USA-27
    │   └── USA-29 (Evaluator-Optimizer)
    └── USA-27 (Error Recovery & Retry)
        └── USA-28 (Streaming Support)

USA-10 (Registry)
└── USA-30 (Skills Format Conversion)
```

### Enterprise Deployment Dependency Graph

```
USA-30 (Skills Format) ─────────────────────────────────────────┐
                                                                │
USA-31 (Dependencies) ◄─────────────────────────────────────────┘
├── USA-32 (Database Schema)
│   └── USA-33 (PostgreSQL Client)
│       ├── USA-35 (Auth Middleware) ◄── USA-34
│       │   └── USA-36 (Rate Limiting)
│       │       └── USA-40 (Jobs Routes) ◄── USA-37, USA-39
│       └── USA-37 (Job Queue)
│           └── USA-38 (Worker Pool)
│               └── USA-39 (SSE Streaming) ◄── USA-34
│
├── USA-34 (Express Server)
│   ├── USA-35 (Auth) ◄─────────────────────┐
│   ├── USA-41 (Iterations Routes) ◄────────┤
│   ├── USA-45 (Observability)              │
│   └── USA-47 (Docker & Infra)             │
│                                           │
├── USA-43 (Blob Storage) ◄── USA-37        │
├── USA-44 (Key Vault)                      │
│                                           │
└── USA-42 (Usage Routes) ◄── USA-33, USA-35, USA-36

USA-40, USA-41, USA-42
└── USA-46 (OpenAPI Spec)
    └── USA-48 (API Tests)
```
