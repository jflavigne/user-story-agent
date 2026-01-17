# User Story Agent - Tickets

## Epic: USA - User Story Agent

### Overview

Create a User Story Writer agent system with dual implementations:
1. **Claude Code Skills** - Slash commands for use within Claude Code
2. **Claude Agent SDK** - Standalone TypeScript agent

---

## Ticket Summary

| Ticket | Title | Priority | Dependencies |
|--------|-------|----------|--------------|
| [USA-1](./USA-1.md) | Project Setup | High | - |
| [USA-2](./USA-2.md) | Shared Type Definitions | High | USA-1 |
| [USA-3](./USA-3.md) | Core System Prompts | High | USA-1 |
| [USA-4](./USA-4.md) | Iteration Prompts - User Roles & Interactive Elements | High | USA-2 |
| [USA-5](./USA-5.md) | Iteration Prompts - Validation & Accessibility | High | USA-2 |
| [USA-6](./USA-6.md) | Iteration Prompts - Performance & Security | High | USA-2 |
| [USA-7](./USA-7.md) | Iteration Prompts - Responsive Design | Medium | USA-2 |
| [USA-8](./USA-8.md) | Iteration Prompts - Internationalization | Medium | USA-2 |
| [USA-9](./USA-9.md) | Iteration Prompts - Analytics | Medium | USA-2 |
| [USA-10](./USA-10.md) | Iteration Registry | High | USA-4 to USA-9 |
| [USA-11](./USA-11.md) | Story State Management | High | USA-2 |
| [USA-12](./USA-12.md) | Context Manager | High | USA-11 |
| [USA-13](./USA-13.md) | Core Agent Class - Individual Mode | High | USA-10, USA-12 |
| [USA-14](./USA-14.md) | Core Agent Class - Workflow Mode | High | USA-13 |
| [USA-15](./USA-15.md) | Core Agent Class - Interactive Mode | Medium | USA-14 |
| [USA-16](./USA-16.md) | Agent Entry Point | High | USA-15 |
| [USA-17](./USA-17.md) | Claude Code Skill - Unified Workflow | High | USA-3, USA-10 |
| [USA-18](./USA-18.md) | Claude Code Skill - Interactive Mode | Medium | USA-17 |
| [USA-19](./USA-19.md) | Claude Code Skills - Individual Iterations | Medium | USA-17 |
| [USA-20](./USA-20.md) | Skill Generation Script | Low | USA-10, USA-19 |

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
└── USA-3 (System Prompts)                      │
    └── USA-17 (Unified Skill) ◄────────────────┘
        ├── USA-18 (Interactive Skill)
        └── USA-19 (Individual Skills)
            └── USA-20 (Generation Script)
```
