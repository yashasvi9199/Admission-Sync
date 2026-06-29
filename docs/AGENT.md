# Agent Instruction & Memory Core - AeroPunchin

This document records the design constraints, architecture rules, and filesystem policies governing the automated development of **AeroPunchin**.

## 1. Governance Principles

Every modification must strictly maintain user control, git history sanity, and design system integrity:
- **No Unrequested Scope Expansion**: Fixes or new feature creations must stay localized to the required domain.
- **Surgical Edits**: Edits should target minimal diff structures. Full file rewrites are reserved for setup or major overhauls.
- **Mock DB Engine**: Local storage acts as a mock client-side cache mirroring remote Turso database schemas.

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
