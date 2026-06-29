# Agent Instruction & Memory Core - AeroPunchin

This document records the design constraints, architecture rules, and filesystem policies governing the automated development of **AeroPunchin**.

## 1. Governance Principles

Every modification must strictly maintain user control, git history sanity, and design system integrity:
- **No Unrequested Scope Expansion**: Fixes or new feature creations must stay localized to the required domain.
- **Surgical Edits**: Edits should target minimal diff structures. Full file rewrites are reserved for setup or major overhauls.
- **Zustand Slice Pattern**: Large store states must be split into slices (auth, settings, leaves, attendance, offline) and unified into a single bounded store.
- **File Length Limit**: To prevent file bloat and ease code reviews, no frontend React view or component file is permitted to exceed 300 lines of code.

## 2. Naming Standards
- **Folder and Files**: kebab-case (e.g. `device-card.tsx`).
- **Components & Interfaces**: PascalCase (e.g. `AdminPanelProps`).
- **Functions & Variables**: camelCase (e.g. `calculateDistanceInMeters`).
- **Constants**: UPPER_SNAKE_CASE (e.g. `DEFAULT_SHIFTS`).

## 3. Database Ledger Policy
`docs/DATABASE.sql` is a cumulative database script. All updates to schemas, seed data, or queries must be appended chronologically in compatible libSQL/SQLite syntax. Modifying or deleting prior ledger headers is prohibited to maintain complete history.

## 4. Documentation Commands
- **Init Docs**: Creates missing database schema files, guides, and feature registries.
- **Sync Docs**: Re-links README pointers and aligns guide instructions with code alterations.
