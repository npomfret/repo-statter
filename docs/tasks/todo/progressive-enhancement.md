# Progressive Enhancement

## Task Status
**Status**: To Do
**Estimated Size**: Medium

## Description
Enhancements to make the report page more capable and reliable.

### Tasks
1.  **Offline Availability**:
    *   Add a Web App Manifest and service-worker (workbox) so the report still opens offline with the last cached data.
2.  **Data Export**:
    *   Provide an “Export as CSV” button that serialises the filtered dataset using a Blob and `URL.createObjectURL`.
