# AeroPunchin Versioning System (GEMINI.md)

This document defines the automated versioning system rules and release lifecycle for the **AeroPunchin** application.

## Version Format (X.Y.Z)

All releases and tags follow the `X.Y.Z` semantic structure, defined as:

*   **`X` (Major Update)**: Significant architectural overhauls, database structure migrations, or brand-new design system transitions.
*   **`Y` (Minor/First Update of the Day)**: The first release or feature deployment generated on any given day.
*   **`Z` (Tiny Update)**: Subsequent releases, minor patches, or hotfixes compiled within the same day.

## Release Deliverables

1.  **Git Tag**: Created in the format `vX.Y.Z`.
2.  **Android APK Package**: Named and attached to the GitHub release as:
    ```
    Aero Punchin X.Y.Z.apk
    ```
