# Design Document

## Overview

The Code Review Script is a simple Node.js utility designed specifically for the radio station project to identify duplicate React components, utility functions, and unused imports. The script will use basic file parsing and string matching to find common code quality issues without complex AST analysis.

The tool will be implemented as a single JavaScript file that can be run via npm script, focusing on the most common issues in React/Next.js projects.

## Architecture

Simple script-based architecture with minimal dependencies:

```mermaid
graph TB
    Script[code-review.js] --> FileScanner[File Scanner]
    Script --> DuplicateChecker[Duplicate Checker]
    Script --> UnusedChecker[Unused Import Checker]
    
    FileScanner --> Files[src/**/*.{ts,tsx}]
    DuplicateChecker --> ComponentAnalyzer[Component Analyzer]
    DuplicateChecker --> FunctionAnalyzer[Function Analyzer]
    UnusedChecker --> ImportAnalyzer[Import Analyzer]
    
    ComponentAnalyzer --> Reporter[Console Reporter]
    FunctionAnalyzer --> Reporter
    ImportAnalyzer --> Reporter
```

### Core Components

1. **File Scanner**: Recursively finds TypeScript/TSX files in src directory
2. **Duplicate Checker**: Identifies similar components and functions using simple heuristics
3. **Unused Import Checker**: Finds imports that aren't referenced in the file
4. **Console Reporter**: Outputs findings in a readable format

## Components and Interfaces

### File Scanner

```javascript
// Simple file discovery using Node.js fs module
const scanFiles = (directory) => {
  // Returns array of file paths matching *.ts, *.tsx in src/
  return glob.sync('src/**/*.{ts,tsx}', { ignore: ['**/*.test.*', '**/*.spec.*'] });
};
```

### Duplicate Detection

```javascript
// Basic duplicate detection using string similarity
const findDuplicateComponents = (files) => {
  const components = [];
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const componentMatches = content.match(/export\s+(default\s+)?function\s+(\w+)|const\s+(\w+)\s*=\s*\(/g);
    // Store component info for comparison
  });
  
  return findSimilarComponents(components);
};
```

### Unused Import Detection

```javascript
// Simple regex-based import analysis
const findUnusedImports = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = extractImports(content);
  const unusedImports = [];
  
  imports.forEach(importItem => {
    if (!isUsedInFile(importItem, content)) {
      unusedImports.push(importItem);
    }
  });
  
  return unusedImports;
};
```

## Data Models

### Analysis Result

```javascript
const analysisResult = {
  summary: {
    filesScanned: 0,
    duplicatesFound: 0,
    unusedImportsFound: 0,
    unusedComponentsFound: 0
  },
  duplicates: [
    {
      type: 'component', // or 'function'
      name: 'ComponentName',
      files: ['path1', 'path2'],
      similarity: 'high' // or 'medium'
    }
  ],
  unusedImports: [
    {
      file: 'path/to/file.tsx',
      imports: ['UnusedImport1', 'UnusedImport2'],
      line: 3
    }
  ],
  unusedComponents: [
    {
      name: 'UnusedComponent',
      file: 'path/to/file.tsx',
      line: 15
    }
  ]
};
```

### File Analysis Data

```javascript
const fileData = {
  path: 'src/components/example.tsx',
  content: '...',
  imports: [
    { name: 'React', line: 1 },
    { name: 'useState', line: 1 }
  ],
  components: [
    { name: 'ExampleComponent', line: 5, type: 'function' }
  ],
  functions: [
    { name: 'helperFunction', line: 20 }
  ]
};
```

## Error Handling

### Simple Error Categories

1. **File Read Errors**: Handle files that can't be read
2. **Parse Errors**: Skip files with syntax issues
3. **Permission Errors**: Log and continue with other files

```javascript
const safeReadFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}: ${error.message}`);
    return null;
  }
};
```

## Testing Strategy

### Manual Testing

- Test with existing radio station codebase
- Verify duplicate detection works with known similar components
- Check unused import detection with sample files
- Validate output format is readable and helpful

### Test Cases

1. **Duplicate Components**: Create test files with similar React components
2. **Unused Imports**: Create files with imports that aren't used
3. **False Positives**: Ensure commonly used patterns aren't flagged incorrectly
4. **Edge Cases**: Test with empty files, files with only comments, etc.

### Validation Approach

```javascript
// Simple test runner
const runTests = () => {
  const testFiles = [
    'test-duplicates.tsx',
    'test-unused-imports.tsx',
    'test-clean-file.tsx'
  ];
  
  testFiles.forEach(file => {
    console.log(`Testing ${file}...`);
    const result = analyzeFile(file);
    validateResult(result, expectedResults[file]);
  });
};
```

## Implementation Considerations

### Simplicity First

1. **No Complex Dependencies**: Use only Node.js built-ins and minimal packages (glob, chalk for colors)
2. **Readable Code**: Keep the script simple enough to modify easily
3. **Fast Execution**: Focus on speed over comprehensive analysis
4. **Clear Output**: Make results easy to understand and act upon

### Radio Station Specific Optimizations

1. **React Component Focus**: Prioritize finding duplicate React components
2. **Common Patterns**: Look for common Next.js and React patterns
3. **Firebase Integration**: Be aware of Firebase-specific imports and usage
4. **Discord Integration**: Handle Discord-related imports appropriately

### Future Enhancements

1. **Configuration File**: Add simple JSON config for customization
2. **Ignore Patterns**: Allow excluding specific files or patterns
3. **Fix Suggestions**: Provide specific suggestions for found issues
4. **Integration**: Add as pre-commit hook or CI check