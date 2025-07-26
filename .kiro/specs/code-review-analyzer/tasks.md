# Implementation Plan

- [x] 1. Create basic script structure and dependencies





  - Create scripts/code-review.js file in the project root
  - Add minimal dependencies to package.json (glob, chalk for colored output)
  - Add npm script "code-review" to package.json scripts section
  - _Requirements: 3.1, 3.3_

- [x] 2. Implement file scanning functionality





  - Create function to scan src/ directory for .ts and .tsx files
  - Add logic to exclude test files and node_modules
  - Implement basic file reading with error handling
  - _Requirements: 3.2, 3.3_

- [x] 3. Build duplicate component detection





  - Create function to extract React component names from files
  - Implement basic string similarity comparison for component structures
  - Add logic to identify components with similar names or JSX patterns
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 4. Create unused import detection





  - Implement regex-based import extraction from TypeScript files
  - Add logic to check if imported items are used in the file content
  - Create function to identify imports that appear unused
  - _Requirements: 2.1, 2.3, 2.4_

- [x] 5. Build console output and reporting





  - Create formatted console output using chalk for colors
  - Implement summary statistics display (files scanned, issues found)
  - Add detailed listings of duplicates and unused imports with file paths and line numbers
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 6. Add duplicate function detection





  - Create function to identify utility functions and helper methods
  - Implement basic comparison logic for similar function signatures
  - Add reporting for duplicate utility functions across files
  - _Requirements: 1.1, 1.4_

- [x] 7. Implement unused component detection





  - Create logic to find exported components that aren't imported elsewhere
  - Add cross-file reference checking for component usage
  - Include unused component reporting in the output
  - _Requirements: 2.2, 2.5_

- [x] 8. Add error handling and edge cases





  - Implement safe file reading with try-catch blocks
  - Add handling for files with syntax errors or parsing issues
  - Create graceful degradation when files can't be analyzed
  - _Requirements: 3.4_

- [x] 9. Test with radio station codebase





  - Run the script against the existing src/ directory
  - Validate results against known duplicate components and unused imports
  - Adjust detection logic based on real-world findings
  - _Requirements: All requirements validation_

- [x] 10. Add basic configuration options





  - Create simple command-line flags for verbose output
  - Add option to exclude specific file patterns
  - Implement basic configuration through environment variables
  - _Requirements: 3.2_