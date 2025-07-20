# Handle Missing Lizard Gracefully

## Problem
Currently, when Lizard is not installed, the complexity analysis fails silently and logs a warning to the console. However, users may not see this warning and wonder why the "Most Complex" tab is empty.

## Requirements

1. **Detection**: Check if Lizard is installed at the start of analysis
2. **User Notification**: Display a clear message in the HTML report when Lizard is missing
3. **Graceful Degradation**: Continue analysis without complexity data
4. **Installation Instructions**: Provide clear instructions in the report on how to install Lizard

## Implementation Details

### 1. Early Detection
- Check for Lizard availability when starting the analysis
- Store the availability status to pass to the report generator

### 2. Report UI Changes
- In the "Most Complex" tab, when empty due to missing Lizard:
  - Show an informative message instead of "No data available"
  - Include installation instructions: `pip install lizard`
  - Explain benefits of enabling complexity analysis

### 3. Console Output
- Show a prominent warning at the start of analysis (not just when complexity analysis runs)
- Example: `⚠️  Lizard not found. Code complexity analysis will be skipped. Install with: pip install lizard`

### 4. Optional: Check for Python/pip
- Detect if Python/pip is available
- Provide platform-specific installation guidance if not

## Acceptance Criteria
- [ ] Users see a clear message in the report when Lizard is missing
- [ ] The analysis continues successfully without complexity data
- [ ] Installation instructions are provided in both console and report
- [ ] The "Most Complex" tab shows helpful content instead of being empty