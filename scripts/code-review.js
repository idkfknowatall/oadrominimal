#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');

/**
 * Configuration options for the code review script
 */
class CodeReviewConfig {
  constructor() {
    this.verbose = false;
    this.excludePatterns = [];
    this.includePattern = 'src/**/*.{ts,tsx}';
    this.defaultExcludePatterns = [
      '**/node_modules/**',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/__tests__/**',
      '**/*.d.ts'
    ];
    
    this.parseArguments();
    this.loadEnvironmentVariables();
  }

  /**
   * Parse command-line arguments
   */
  parseArguments() {
    const args = process.argv.slice(2);
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--verbose':
        case '-v':
          this.verbose = true;
          break;
        case '--exclude':
        case '-e':
          if (i + 1 < args.length) {
            this.excludePatterns.push(args[++i]);
          } else {
            console.error(chalk.red('Error: --exclude requires a pattern argument'));
            process.exit(1);
          }
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
        default:
          if (arg.startsWith('-')) {
            console.error(chalk.red(`Error: Unknown option ${arg}`));
            this.showHelp();
            process.exit(1);
          }
          break;
      }
    }
  }

  /**
   * Load configuration from environment variables
   */
  loadEnvironmentVariables() {
    // Check for verbose mode from environment
    if (process.env.CODE_REVIEW_VERBOSE === 'true' || process.env.CODE_REVIEW_VERBOSE === '1') {
      this.verbose = true;
    }

    // Check for additional exclude patterns from environment
    if (process.env.CODE_REVIEW_EXCLUDE) {
      const envExcludes = process.env.CODE_REVIEW_EXCLUDE.split(',').map(pattern => pattern.trim());
      this.excludePatterns.push(...envExcludes);
    }

    // Check for custom include pattern from environment
    if (process.env.CODE_REVIEW_INCLUDE) {
      this.includePattern = process.env.CODE_REVIEW_INCLUDE;
    }
  }

  /**
   * Get all exclude patterns (default + user-specified)
   */
  getAllExcludePatterns() {
    return [...this.defaultExcludePatterns, ...this.excludePatterns];
  }

  /**
   * Show help message
   */
  showHelp() {
    console.log(chalk.blue.bold('Code Review Script - Help'));
    console.log('');
    console.log('Usage: npm run code-review [options]');
    console.log('');
    console.log('Options:');
    console.log('  -v, --verbose     Enable verbose output with detailed information');
    console.log('  -e, --exclude     Add file pattern to exclude (can be used multiple times)');
    console.log('  -h, --help        Show this help message');
    console.log('');
    console.log('Environment Variables:');
    console.log('  CODE_REVIEW_VERBOSE=true    Enable verbose output');
    console.log('  CODE_REVIEW_EXCLUDE=pattern1,pattern2    Comma-separated exclude patterns');
    console.log('  CODE_REVIEW_INCLUDE=pattern    Custom include pattern (default: src/**/*.{ts,tsx})');
    console.log('');
    console.log('Examples:');
    console.log('  npm run code-review --verbose');
    console.log('  npm run code-review --exclude "**/*.stories.tsx" --exclude "**/legacy/**"');
    console.log('  CODE_REVIEW_VERBOSE=true npm run code-review');
    console.log('  CODE_REVIEW_EXCLUDE="**/*.mock.ts,**/temp/**" npm run code-review');
  }

  /**
   * Log verbose message if verbose mode is enabled
   */
  verboseLog(message) {
    if (this.verbose) {
      console.log(chalk.gray(`[VERBOSE] ${message}`));
    }
  }
}

/**
 * Code Review Script for Radio Station Project
 * Identifies duplicate components, functions, and unused imports
 */

class CodeReviewAnalyzer {
  constructor(config) {
    this.config = config || new CodeReviewConfig();
    this.results = {
      summary: {
        filesScanned: 0,
        duplicatesFound: 0,
        duplicateFunctionsFound: 0,
        unusedImportsFound: 0,
        unusedComponentsFound: 0
      },
      duplicates: [],
      duplicateFunctions: [],
      unusedImports: [],
      unusedComponents: []
    };
  }

  /**
   * Main entry point for the code review analysis with comprehensive error handling
   */
  async analyze() {
    console.log(chalk.blue.bold('🔍 Starting Code Review Analysis...\n'));
    
    // Show configuration if verbose mode is enabled
    if (this.config.verbose) {
      this.showConfiguration();
    }
    
    try {
      // Scan for TypeScript and TSX files
      const files = this.scanFiles();
      
      if (files.length === 0) {
        console.log(chalk.yellow('⚠️  No TypeScript/TSX files found to analyze'));
        console.log(chalk.gray('Make sure you have .ts or .tsx files in the src/ directory'));
        return;
      }
      
      console.log(chalk.cyan(`Found ${files.length} files to analyze\n`));
      
      // Track analysis progress and errors
      const analysisSteps = [
        { name: 'Duplicate Components', fn: () => this.findDuplicateComponents(files) },
        { name: 'Duplicate Functions', fn: () => this.findDuplicateFunctions(files) },
        { name: 'Unused Imports', fn: () => this.findUnusedImports(files) },
        { name: 'Unused Components', fn: () => this.findUnusedComponents(files) }
      ];

      let completedSteps = 0;
      const errors = [];

      // Execute each analysis step with individual error handling
      for (const step of analysisSteps) {
        try {
          console.log(chalk.gray(`Analyzing ${step.name.toLowerCase()}...`));
          step.fn();
          completedSteps++;
        } catch (stepError) {
          errors.push({ step: step.name, error: stepError });
          console.warn(chalk.yellow(`Warning: ${step.name} analysis failed: ${stepError.message}`));
          console.log(chalk.gray('Continuing with remaining analysis steps...\n'));
        }
      }

      // Report on analysis completion
      if (completedSteps === analysisSteps.length) {
        console.log(chalk.green(`✅ All analysis steps completed successfully\n`));
      } else {
        console.log(chalk.yellow(`⚠️  Completed ${completedSteps}/${analysisSteps.length} analysis steps\n`));
        if (errors.length > 0) {
          console.log(chalk.red('Failed steps:'));
          errors.forEach(({ step, error }) => {
            console.log(chalk.red(`  - ${step}: ${error.message}`));
          });
          console.log('');
        }
      }
      
      // Generate comprehensive report
      this.generateReport();
      
    } catch (error) {
      this.handleCriticalError(error);
    }
  }

  /**
   * Handle critical errors that prevent the analysis from running
   * @param {Error} error - The critical error that occurred
   */
  handleCriticalError(error) {
    console.error(chalk.red.bold('❌ Critical Analysis Error:'));
    
    if (error.code === 'ENOENT' && error.path) {
      console.error(chalk.red(`Directory not found: ${error.path}`));
      console.error(chalk.gray('Make sure you are running this script from the project root directory'));
    } else if (error.code === 'EACCES') {
      console.error(chalk.red('Permission denied accessing files'));
      console.error(chalk.gray('Check file permissions and try running with appropriate privileges'));
    } else if (error.message.includes('out of memory')) {
      console.error(chalk.red('Out of memory error'));
      console.error(chalk.gray('Try running the analysis on smaller file sets or increase Node.js memory limit'));
    } else {
      console.error(chalk.red(error.message));
      if (error.stack) {
        console.error(chalk.gray('Stack trace:'));
        console.error(chalk.gray(error.stack));
      }
    }
    
    console.error(chalk.red.bold('\n🚨 Analysis terminated due to critical error'));
    process.exit(1);
  }

  /**
   * Show current configuration settings
   */
  showConfiguration() {
    console.log(chalk.cyan.bold('Configuration:'));
    console.log(chalk.gray(`  Verbose mode: ${this.config.verbose ? 'enabled' : 'disabled'}`));
    console.log(chalk.gray(`  Include pattern: ${this.config.includePattern}`));
    console.log(chalk.gray(`  Default exclude patterns: ${this.config.defaultExcludePatterns.length} patterns`));
    if (this.config.excludePatterns.length > 0) {
      console.log(chalk.gray(`  Additional exclude patterns: ${this.config.excludePatterns.join(', ')}`));
    }
    console.log('');
  }

  /**
   * Scan src/ directory for TypeScript and TSX files with comprehensive error handling
   * Excludes test files and node_modules
   * @returns {string[]} Array of file paths
   */
  scanFiles() {
    console.log(chalk.gray('Scanning src/ directory for TypeScript files...'));
    
    try {
      // Check if src directory exists
      if (!fs.existsSync('src')) {
        throw new Error('src/ directory not found. Make sure you are running this script from the project root.');
      }

      // Check if src is actually a directory
      const srcStats = fs.statSync('src');
      if (!srcStats.isDirectory()) {
        throw new Error('src/ exists but is not a directory');
      }

      // Define patterns to include and exclude using configuration
      const includePattern = this.config.includePattern;
      const excludePatterns = this.config.getAllExcludePatterns();
      
      this.config.verboseLog(`Include pattern: ${includePattern}`);
      this.config.verboseLog(`Exclude patterns: ${excludePatterns.join(', ')}`);

      // Use glob to find matching files with error handling
      let files;
      try {
        files = glob.sync(includePattern, {
          ignore: excludePatterns,
          absolute: false,
          nodir: true // Only return files, not directories
        });
      } catch (globError) {
        throw new Error(`File pattern matching failed: ${globError.message}`);
      }

      // Filter out any remaining unwanted files and validate each file
      const filteredFiles = [];
      const skippedFiles = [];

      for (const file of files) {
        try {
          // Additional safety check for test files
          const fileName = path.basename(file);
          if (fileName.includes('.test.') || 
              fileName.includes('.spec.') ||
              file.includes('__tests__')) {
            skippedFiles.push({ file, reason: 'test file' });
            continue;
          }

          // Check if file is accessible
          if (!this.isFileReadable(file)) {
            skippedFiles.push({ file, reason: 'not readable' });
            continue;
          }

          // Check file extension is valid
          const ext = path.extname(file).toLowerCase();
          if (ext !== '.ts' && ext !== '.tsx') {
            skippedFiles.push({ file, reason: 'invalid extension' });
            continue;
          }

          filteredFiles.push(file);
        } catch (fileError) {
          skippedFiles.push({ file, reason: `error: ${fileError.message}` });
          console.warn(chalk.yellow(`Warning: Skipping file ${file}: ${fileError.message}`));
        }
      }

      this.results.summary.filesScanned = filteredFiles.length;
      
      console.log(chalk.gray(`Found ${filteredFiles.length} TypeScript files`));
      
      // Report skipped files if any (always show count, details only in verbose mode)
      if (skippedFiles.length > 0) {
        console.log(chalk.yellow(`Skipped ${skippedFiles.length} files`));
        if (this.config.verbose) {
          skippedFiles.slice(0, 10).forEach(({ file, reason }) => {
            console.log(chalk.gray(`  - ${path.basename(file)} (${reason})`));
          });
          if (skippedFiles.length > 10) {
            console.log(chalk.gray(`  ... and ${skippedFiles.length - 10} more`));
          }
        }
      }
      
      // Show first few files as examples (only in verbose mode)
      if (this.config.verbose && filteredFiles.length > 0) {
        const sampleFiles = filteredFiles.slice(0, 5);
        console.log(chalk.gray('Sample files to analyze:'));
        sampleFiles.forEach(file => {
          console.log(chalk.gray(`  - ${file}`));
        });
        if (filteredFiles.length > 5) {
          console.log(chalk.gray(`  ... and ${filteredFiles.length - 5} more`));
        }
      }
      
      return filteredFiles;
      
    } catch (error) {
      // Provide more specific error messages
      if (error.code === 'ENOENT') {
        throw new Error('src/ directory not found. Make sure you are running this script from the project root directory.');
      } else if (error.code === 'EACCES') {
        throw new Error('Permission denied accessing src/ directory. Check file permissions.');
      } else {
        throw new Error(`File scanning failed: ${error.message}`);
      }
    }
  }

  /**
   * Safely read file content with comprehensive error handling
   * @param {string} filePath - Path to the file to read
   * @returns {string|null} File content or null if read failed
   */
  safeReadFile(filePath) {
    try {
      // Check if file exists first
      if (!this.isFileReadable(filePath)) {
        if (this.config.verbose) {
          console.warn(chalk.yellow(`Warning: File not accessible: ${filePath}`));
        }
        return null;
      }

      // Get file stats to check if it's actually a file
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        console.warn(chalk.yellow(`Warning: Path is not a file: ${filePath}`));
        return null;
      }

      // Check file size to avoid reading extremely large files
      const maxFileSize = 10 * 1024 * 1024; // 10MB limit
      if (stats.size > maxFileSize) {
        if (this.config.verbose) {
          console.warn(chalk.yellow(`Warning: File too large (${Math.round(stats.size / 1024 / 1024)}MB), skipping: ${filePath}`));
        }
        return null;
      }

      // Read the file content
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Basic validation that content is readable text
      if (typeof content !== 'string') {
        console.warn(chalk.yellow(`Warning: File content is not text: ${filePath}`));
        return null;
      }

      // Check for binary content (basic heuristic)
      if (this.containsBinaryContent(content)) {
        console.warn(chalk.yellow(`Warning: File appears to contain binary data, skipping: ${filePath}`));
        return null;
      }

      return content;
    } catch (error) {
      this.handleFileReadError(error, filePath);
      return null;
    }
  }

  /**
   * Handle different types of file read errors with specific messages
   * @param {Error} error - The error that occurred
   * @param {string} filePath - Path to the file that failed to read
   */
  handleFileReadError(error, filePath) {
    const errorCode = error.code;
    const fileName = path.basename(filePath);

    switch (errorCode) {
      case 'ENOENT':
        console.warn(chalk.yellow(`Warning: File not found: ${fileName}`));
        break;
      case 'EACCES':
        console.warn(chalk.yellow(`Warning: Permission denied reading: ${fileName}`));
        break;
      case 'EISDIR':
        console.warn(chalk.yellow(`Warning: Path is a directory, not a file: ${fileName}`));
        break;
      case 'EMFILE':
      case 'ENFILE':
        console.warn(chalk.yellow(`Warning: Too many open files, skipping: ${fileName}`));
        break;
      case 'ENOTDIR':
        console.warn(chalk.yellow(`Warning: Invalid path structure: ${fileName}`));
        break;
      default:
        console.warn(chalk.yellow(`Warning: Could not read ${fileName}: ${error.message}`));
        break;
    }
  }

  /**
   * Check if content contains binary data (basic heuristic)
   * @param {string} content - File content to check
   * @returns {boolean} True if content appears to be binary
   */
  containsBinaryContent(content) {
    // Check for null bytes (common in binary files)
    if (content.includes('\0')) {
      return true;
    }

    // Check for high percentage of non-printable characters
    const nonPrintableCount = (content.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length;
    const nonPrintableRatio = nonPrintableCount / content.length;
    
    // If more than 30% of characters are non-printable, likely binary
    return nonPrintableRatio > 0.3;
  }

  /**
   * Validate that content appears to be valid TypeScript/JavaScript
   * @param {string} content - File content to validate
   * @returns {boolean} True if content appears to be valid TS/JS
   */
  isValidTypeScriptContent(content) {
    // Basic validation - check for common TypeScript/JavaScript patterns
    const hasImports = /import\s+.*from/.test(content);
    const hasExports = /export\s+/.test(content);
    const hasFunctions = /function\s+\w+|const\s+\w+\s*=|=>\s*{/.test(content);
    const hasJSX = /<[A-Z]/.test(content);
    const hasTypeScript = /:\s*\w+|interface\s+\w+|type\s+\w+/.test(content);
    
    // If file is very short, be more lenient
    if (content.length < 100) {
      return true;
    }
    
    // Should have at least one of these patterns for longer files
    return hasImports || hasExports || hasFunctions || hasJSX || hasTypeScript;
  }

  /**
   * Check if a file exists and is readable
   * @param {string} filePath - Path to check
   * @returns {boolean} True if file exists and is readable
   */
  isFileReadable(filePath) {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Find duplicate React components across files
   * @param {string[]} files - Array of file paths to analyze
   */
  findDuplicateComponents(files) {
    console.log(chalk.gray('Analyzing for duplicate components...'));
    
    const components = [];
    
    // Extract components from all files
    files.forEach(filePath => {
      const fileComponents = this.extractComponentsFromFile(filePath);
      components.push(...fileComponents);
    });
    
    console.log(chalk.gray(`Found ${components.length} components to analyze`));
    
    // Find duplicates using similarity comparison
    const duplicates = this.findSimilarComponents(components);
    
    if (duplicates.length > 0) {
      this.results.duplicates.push(...duplicates);
      this.results.summary.duplicatesFound = duplicates.length;
      
      console.log(chalk.yellow(`Found ${duplicates.length} potential duplicate components`));
    } else {
      console.log(chalk.green('No duplicate components found'));
    }
  }

  /**
   * Extract React component information from a single file with comprehensive error handling
   * @param {string} filePath - Path to the file to analyze
   * @returns {Array} Array of component objects
   */
  extractComponentsFromFile(filePath) {
    const content = this.safeReadFile(filePath);
    if (!content) return [];
    
    const components = [];
    
    try {
      // Validate that content looks like TypeScript/JavaScript
      if (!this.isValidTypeScriptContent(content)) {
        console.warn(chalk.yellow(`Warning: File doesn't appear to be valid TypeScript/JavaScript: ${path.basename(filePath)}`));
        return [];
      }

      // Extract function components (export function ComponentName or export default function ComponentName)
      const functionComponentRegex = /export\s+(?:default\s+)?function\s+([A-Z][a-zA-Z0-9]*)\s*\([^)]*\)\s*{([^}]*(?:{[^}]*}[^}]*)*)}/g;
      let match;
      
      while ((match = functionComponentRegex.exec(content)) !== null) {
        try {
          const [fullMatch, componentName, componentBody] = match;
          const lineNumber = this.getLineNumber(content, match.index);
          
          components.push({
            name: componentName,
            type: 'function',
            file: filePath,
            line: lineNumber,
            body: componentBody.trim(),
            jsxPattern: this.extractJSXPattern(componentBody),
            propsPattern: this.extractPropsPattern(fullMatch)
          });
        } catch (regexError) {
          console.warn(chalk.yellow(`Warning: Error processing function component match in ${path.basename(filePath)}: ${regexError.message}`));
          continue;
        }
      }
      
      // Extract arrow function components (const ComponentName = () => or const ComponentName: React.FC = )
      const arrowComponentRegex = /(?:export\s+)?const\s+([A-Z][a-zA-Z0-9]*)\s*(?::\s*React\.FC[^=]*)?=\s*\([^)]*\)\s*=>\s*{([^}]*(?:{[^}]*}[^}]*)*)}/g;
      
      while ((match = arrowComponentRegex.exec(content)) !== null) {
        try {
          const [fullMatch, componentName, componentBody] = match;
          const lineNumber = this.getLineNumber(content, match.index);
          
          components.push({
            name: componentName,
            type: 'arrow',
            file: filePath,
            line: lineNumber,
            body: componentBody.trim(),
            jsxPattern: this.extractJSXPattern(componentBody),
            propsPattern: this.extractPropsPattern(fullMatch)
          });
        } catch (regexError) {
          console.warn(chalk.yellow(`Warning: Error processing arrow component match in ${path.basename(filePath)}: ${regexError.message}`));
          continue;
        }
      }
      
      // Extract simple JSX return components
      const simpleComponentRegex = /(?:export\s+)?const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*\([^)]*\)\s*=>\s*\(([^)]+(?:\([^)]*\)[^)]*)*)\)/g;
      
      while ((match = simpleComponentRegex.exec(content)) !== null) {
        try {
          const [fullMatch, componentName, jsxContent] = match;
          const lineNumber = this.getLineNumber(content, match.index);
          
          components.push({
            name: componentName,
            type: 'simple',
            file: filePath,
            line: lineNumber,
            body: jsxContent.trim(),
            jsxPattern: this.extractJSXPattern(jsxContent),
            propsPattern: this.extractPropsPattern(fullMatch)
          });
        } catch (regexError) {
          console.warn(chalk.yellow(`Warning: Error processing simple component match in ${path.basename(filePath)}: ${regexError.message}`));
          continue;
        }
      }
      
    } catch (error) {
      this.handleParsingError(error, filePath, 'components');
    }
    
    return components;
  }

  /**
   * Extract JSX pattern from component body for similarity comparison
   * @param {string} componentBody - The component body content
   * @returns {string} Normalized JSX pattern
   */
  extractJSXPattern(componentBody) {
    if (!componentBody) return '';
    
    // Extract JSX elements (simplified pattern matching)
    const jsxElements = [];
    
    // Find JSX tags
    const tagRegex = /<(\w+)(?:\s+[^>]*)?(?:\/>|>[^<]*<\/\1>)/g;
    let match;
    
    while ((match = tagRegex.exec(componentBody)) !== null) {
      jsxElements.push(match[1].toLowerCase());
    }
    
    // Create a normalized pattern
    const pattern = jsxElements.sort().join(',');
    return pattern;
  }

  /**
   * Extract props pattern from component definition
   * @param {string} componentDefinition - The full component definition
   * @returns {string} Normalized props pattern
   */
  extractPropsPattern(componentDefinition) {
    // Extract props from function parameters
    const propsMatch = componentDefinition.match(/\(\s*{([^}]+)}\s*\)|:\s*{([^}]+)}/);
    if (!propsMatch) return '';
    
    const propsString = propsMatch[1] || propsMatch[2] || '';
    const props = propsString.split(',').map(prop => prop.trim().split(':')[0].trim()).filter(Boolean);
    
    return props.sort().join(',');
  }

  /**
   * Get line number for a given character index in content
   * @param {string} content - File content
   * @param {number} index - Character index
   * @returns {number} Line number
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Find similar components using name and structure comparison
   * @param {Array} components - Array of component objects
   * @returns {Array} Array of duplicate groups
   */
  findSimilarComponents(components) {
    const duplicates = [];
    const processed = new Set();
    
    for (let i = 0; i < components.length; i++) {
      if (processed.has(i)) continue;
      
      const component1 = components[i];
      const similarComponents = [component1];
      
      for (let j = i + 1; j < components.length; j++) {
        if (processed.has(j)) continue;
        
        const component2 = components[j];
        const similarity = this.calculateComponentSimilarity(component1, component2);
        
        if (similarity.score > 0.7) { // Threshold for considering components similar
          similarComponents.push(component2);
          processed.add(j);
        }
      }
      
      if (similarComponents.length > 1) {
        duplicates.push({
          type: 'component',
          name: component1.name,
          files: similarComponents.map(comp => ({ file: comp.file, line: comp.line, name: comp.name })),
          similarity: this.getSimilarityLevel(similarComponents),
          reason: this.getSimilarityReason(similarComponents)
        });
      }
      
      processed.add(i);
    }
    
    return duplicates;
  }

  /**
   * Calculate similarity score between two components
   * @param {Object} comp1 - First component
   * @param {Object} comp2 - Second component
   * @returns {Object} Similarity analysis
   */
  calculateComponentSimilarity(comp1, comp2) {
    let score = 0;
    const reasons = [];
    
    // Name similarity (Levenshtein distance based)
    const nameSimilarity = this.calculateStringSimilarity(comp1.name, comp2.name);
    if (nameSimilarity > 0.6) {
      score += 0.4 * nameSimilarity;
      reasons.push('similar names');
    }
    
    // JSX pattern similarity
    if (comp1.jsxPattern && comp2.jsxPattern && comp1.jsxPattern === comp2.jsxPattern) {
      score += 0.4;
      reasons.push('identical JSX structure');
    } else if (comp1.jsxPattern && comp2.jsxPattern) {
      const jsxSimilarity = this.calculateStringSimilarity(comp1.jsxPattern, comp2.jsxPattern);
      if (jsxSimilarity > 0.7) {
        score += 0.3 * jsxSimilarity;
        reasons.push('similar JSX structure');
      }
    }
    
    // Props pattern similarity
    if (comp1.propsPattern && comp2.propsPattern && comp1.propsPattern === comp2.propsPattern) {
      score += 0.2;
      reasons.push('identical props');
    } else if (comp1.propsPattern && comp2.propsPattern) {
      const propsSimilarity = this.calculateStringSimilarity(comp1.propsPattern, comp2.propsPattern);
      if (propsSimilarity > 0.8) {
        score += 0.1 * propsSimilarity;
        reasons.push('similar props');
      }
    }
    
    return { score, reasons };
  }

  /**
   * Calculate string similarity using simple character-based comparison
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score between 0 and 1
   */
  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Get similarity level description
   * @param {Array} components - Array of similar components
   * @returns {string} Similarity level
   */
  getSimilarityLevel(components) {
    // Simple heuristic based on number of similar components
    if (components.length > 3) return 'high';
    if (components.length > 2) return 'medium';
    return 'low';
  }

  /**
   * Get similarity reason description
   * @param {Array} components - Array of similar components
   * @returns {string} Reason for similarity
   */
  getSimilarityReason(components) {
    if (components.length < 2) return '';
    
    const comp1 = components[0];
    const comp2 = components[1];
    const similarity = this.calculateComponentSimilarity(comp1, comp2);
    
    return similarity.reasons.join(', ') || 'structural similarity';
  }

  /**
   * Find duplicate utility functions and helper methods across files
   * @param {string[]} files - Array of file paths to analyze
   */
  findDuplicateFunctions(files) {
    console.log(chalk.gray('Analyzing for duplicate functions...'));
    
    const functions = [];
    
    // Extract functions from all files
    files.forEach(filePath => {
      const fileFunctions = this.extractFunctionsFromFile(filePath);
      functions.push(...fileFunctions);
    });
    
    console.log(chalk.gray(`Found ${functions.length} functions to analyze`));
    
    // Find duplicates using signature and body comparison
    const duplicates = this.findSimilarFunctions(functions);
    
    if (duplicates.length > 0) {
      this.results.duplicateFunctions.push(...duplicates);
      this.results.summary.duplicateFunctionsFound = duplicates.length;
      
      console.log(chalk.yellow(`Found ${duplicates.length} potential duplicate functions`));
    } else {
      console.log(chalk.green('No duplicate functions found'));
    }
  }

  /**
   * Extract function information from a single file with comprehensive error handling
   * @param {string} filePath - Path to the file to analyze
   * @returns {Array} Array of function objects
   */
  extractFunctionsFromFile(filePath) {
    const content = this.safeReadFile(filePath);
    if (!content) return [];
    
    const functions = [];
    
    try {
      // Validate that content looks like TypeScript/JavaScript
      if (!this.isValidTypeScriptContent(content)) {
        console.warn(chalk.yellow(`Warning: File doesn't appear to be valid TypeScript/JavaScript: ${path.basename(filePath)}`));
        return [];
      }

      // Extract regular function declarations: function functionName() {}
      const functionDeclarationRegex = /(?:export\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g;
      let match;
      
      while ((match = functionDeclarationRegex.exec(content)) !== null) {
        try {
          const [fullMatch, functionName, params, functionBody] = match;
          const lineNumber = this.getLineNumber(content, match.index);
          
          // Skip React components (start with capital letter)
          if (!/^[A-Z]/.test(functionName)) {
            functions.push({
              name: functionName,
              type: 'function',
              file: filePath,
              line: lineNumber,
              params: this.normalizeParameters(params),
              body: functionBody.trim(),
              signature: this.createFunctionSignature(functionName, params),
              bodyHash: this.createBodyHash(functionBody)
            });
          }
        } catch (regexError) {
          console.warn(chalk.yellow(`Warning: Error processing function declaration match in ${path.basename(filePath)}: ${regexError.message}`));
          continue;
        }
      }
      
      // Extract arrow functions: const functionName = () => {} or const functionName = (params) => {}
      const arrowFunctionRegex = /(?:export\s+)?const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\(([^)]*)\)\s*=>\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g;
      
      while ((match = arrowFunctionRegex.exec(content)) !== null) {
        try {
          const [fullMatch, functionName, params, functionBody] = match;
          const lineNumber = this.getLineNumber(content, match.index);
          
          // Skip React components (start with capital letter)
          if (!/^[A-Z]/.test(functionName)) {
            functions.push({
              name: functionName,
              type: 'arrow',
              file: filePath,
              line: lineNumber,
              params: this.normalizeParameters(params),
              body: functionBody.trim(),
              signature: this.createFunctionSignature(functionName, params),
              bodyHash: this.createBodyHash(functionBody)
            });
          }
        } catch (regexError) {
          console.warn(chalk.yellow(`Warning: Error processing arrow function match in ${path.basename(filePath)}: ${regexError.message}`));
          continue;
        }
      }
      
      // Extract simple arrow functions: const functionName = () => expression
      const simpleArrowFunctionRegex = /(?:export\s+)?const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\(([^)]*)\)\s*=>\s*([^;{][^;]*)/g;
      
      while ((match = simpleArrowFunctionRegex.exec(content)) !== null) {
        try {
          const [fullMatch, functionName, params, expression] = match;
          const lineNumber = this.getLineNumber(content, match.index);
          
          // Skip React components (start with capital letter) and JSX expressions
          if (!/^[A-Z]/.test(functionName) && !expression.trim().startsWith('<')) {
            functions.push({
              name: functionName,
              type: 'simple-arrow',
              file: filePath,
              line: lineNumber,
              params: this.normalizeParameters(params),
              body: expression.trim(),
              signature: this.createFunctionSignature(functionName, params),
              bodyHash: this.createBodyHash(expression)
            });
          }
        } catch (regexError) {
          console.warn(chalk.yellow(`Warning: Error processing simple arrow function match in ${path.basename(filePath)}: ${regexError.message}`));
          continue;
        }
      }
      
    } catch (error) {
      this.handleParsingError(error, filePath, 'functions');
    }
    
    return functions;
  }

  /**
   * Normalize function parameters for comparison
   * @param {string} params - Raw parameter string
   * @returns {string} Normalized parameter string
   */
  normalizeParameters(params) {
    if (!params) return '';
    
    // Remove types and default values, keep only parameter names
    return params
      .split(',')
      .map(param => {
        // Remove TypeScript types (: Type)
        let cleaned = param.replace(/:\s*[^=,]+/g, '');
        // Remove default values (= value)
        cleaned = cleaned.replace(/=\s*[^,]+/g, '');
        // Extract parameter name
        const match = cleaned.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        return match ? match[1] : '';
      })
      .filter(Boolean)
      .sort()
      .join(',');
  }

  /**
   * Create a function signature for comparison
   * @param {string} name - Function name
   * @param {string} params - Function parameters
   * @returns {string} Function signature
   */
  createFunctionSignature(name, params) {
    const normalizedParams = this.normalizeParameters(params);
    return `${name}(${normalizedParams})`;
  }

  /**
   * Create a hash of the function body for comparison
   * @param {string} body - Function body
   * @returns {string} Normalized body hash
   */
  createBodyHash(body) {
    if (!body) return '';
    
    // Normalize the body by removing whitespace, comments, and variable names
    let normalized = body
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g, 'VAR') // Replace variable names
      .replace(/['"`][^'"`]*['"`]/g, 'STR') // Replace string literals
      .replace(/\d+/g, 'NUM') // Replace numbers
      .trim();
    
    return normalized;
  }

  /**
   * Find similar functions using signature and body comparison
   * @param {Array} functions - Array of function objects
   * @returns {Array} Array of duplicate groups
   */
  findSimilarFunctions(functions) {
    const duplicates = [];
    const processed = new Set();
    
    for (let i = 0; i < functions.length; i++) {
      if (processed.has(i)) continue;
      
      const function1 = functions[i];
      const similarFunctions = [function1];
      
      for (let j = i + 1; j < functions.length; j++) {
        if (processed.has(j)) continue;
        
        const function2 = functions[j];
        const similarity = this.calculateFunctionSimilarity(function1, function2);
        
        if (similarity.score > 0.7) { // Threshold for considering functions similar
          similarFunctions.push(function2);
          processed.add(j);
        }
      }
      
      if (similarFunctions.length > 1) {
        duplicates.push({
          type: 'function',
          name: function1.name,
          files: similarFunctions.map(func => ({ 
            file: func.file, 
            line: func.line, 
            name: func.name,
            signature: func.signature
          })),
          similarity: this.getFunctionSimilarityLevel(similarFunctions),
          reason: this.getFunctionSimilarityReason(similarFunctions)
        });
      }
      
      processed.add(i);
    }
    
    return duplicates;
  }

  /**
   * Calculate similarity score between two functions
   * @param {Object} func1 - First function
   * @param {Object} func2 - Second function
   * @returns {Object} Similarity analysis
   */
  calculateFunctionSimilarity(func1, func2) {
    let score = 0;
    const reasons = [];
    
    // Name similarity
    const nameSimilarity = this.calculateStringSimilarity(func1.name, func2.name);
    if (nameSimilarity > 0.6) {
      score += 0.3 * nameSimilarity;
      reasons.push('similar names');
    }
    
    // Parameter similarity
    if (func1.params === func2.params) {
      score += 0.3;
      reasons.push('identical parameters');
    } else if (func1.params && func2.params) {
      const paramSimilarity = this.calculateStringSimilarity(func1.params, func2.params);
      if (paramSimilarity > 0.7) {
        score += 0.2 * paramSimilarity;
        reasons.push('similar parameters');
      }
    }
    
    // Body similarity (most important for functions)
    if (func1.bodyHash === func2.bodyHash && func1.bodyHash) {
      score += 0.4;
      reasons.push('identical logic');
    } else if (func1.body && func2.body) {
      const bodySimilarity = this.calculateStringSimilarity(func1.bodyHash, func2.bodyHash);
      if (bodySimilarity > 0.8) {
        score += 0.3 * bodySimilarity;
        reasons.push('similar logic');
      }
    }
    
    return { score, reasons };
  }

  /**
   * Get similarity level for functions
   * @param {Array} functions - Array of similar functions
   * @returns {string} Similarity level
   */
  getFunctionSimilarityLevel(functions) {
    if (functions.length > 3) return 'high';
    if (functions.length > 2) return 'medium';
    return 'low';
  }

  /**
   * Get similarity reason for functions
   * @param {Array} functions - Array of similar functions
   * @returns {string} Reason for similarity
   */
  getFunctionSimilarityReason(functions) {
    if (functions.length < 2) return '';
    
    const func1 = functions[0];
    const func2 = functions[1];
    const similarity = this.calculateFunctionSimilarity(func1, func2);
    
    return similarity.reasons.join(', ') || 'structural similarity';
  }

  /**
   * Find unused imports across all files
   * @param {string[]} files - Array of file paths to analyze
   */
  findUnusedImports(files) {
    console.log(chalk.gray('Analyzing for unused imports...'));
    
    const allUnusedImports = [];
    
    files.forEach(filePath => {
      const unusedImports = this.findUnusedImportsInFile(filePath);
      if (unusedImports.length > 0) {
        allUnusedImports.push({
          file: filePath,
          imports: unusedImports
        });
      }
    });
    
    if (allUnusedImports.length > 0) {
      this.results.unusedImports.push(...allUnusedImports);
      const totalUnused = allUnusedImports.reduce((sum, file) => sum + file.imports.length, 0);
      this.results.summary.unusedImportsFound = totalUnused;
      
      console.log(chalk.yellow(`Found ${totalUnused} unused imports in ${allUnusedImports.length} files`));
    } else {
      console.log(chalk.green('No unused imports found'));
    }
  }

  /**
   * Find unused imports in a single file with comprehensive error handling
   * @param {string} filePath - Path to the file to analyze
   * @returns {Array} Array of unused import objects
   */
  findUnusedImportsInFile(filePath) {
    const content = this.safeReadFile(filePath);
    if (!content) return [];
    
    try {
      // Validate that content looks like TypeScript/JavaScript
      if (!this.isValidTypeScriptContent(content)) {
        console.warn(chalk.yellow(`Warning: File doesn't appear to be valid TypeScript/JavaScript: ${path.basename(filePath)}`));
        return [];
      }

      // Extract all imports from the file
      const imports = this.extractImportsFromFile(content);
      const unusedImports = [];
      
      // Check each import to see if it's used
      imports.forEach(importItem => {
        try {
          if (!this.isImportUsedInFile(importItem, content)) {
            unusedImports.push(importItem);
          }
        } catch (importError) {
          console.warn(chalk.yellow(`Warning: Error checking usage of import '${importItem.name}' in ${path.basename(filePath)}: ${importError.message}`));
          // If we can't determine usage, assume it's used to be safe
        }
      });
      
      return unusedImports;
      
    } catch (error) {
      this.handleParsingError(error, filePath, 'imports');
      return [];
    }
  }

  /**
   * Extract import statements from TypeScript file content using regex with error handling
   * @param {string} content - File content to analyze
   * @returns {Array} Array of import objects
   */
  extractImportsFromFile(content) {
    const imports = [];
    
    try {
      // Validate content before processing
      if (!content || typeof content !== 'string') {
        console.warn(chalk.yellow('Warning: Invalid content provided to extractImportsFromFile'));
        return imports;
      }

      // Remove comments to avoid false positives
      const contentWithoutComments = this.removeComments(content);
      
      // Pattern 1: Named imports - import { name1, name2 } from 'module'
      const namedImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = namedImportRegex.exec(content)) !== null) {
        try {
          const [fullMatch, importList, moduleName] = match;
          const lineNumber = this.getLineNumber(content, match.index);
          
          // Validate import list before processing
          if (!importList || !importList.trim()) {
            console.warn(chalk.yellow(`Warning: Empty import list found at line ${lineNumber}`));
            continue;
          }
          
          // Parse individual named imports
          const namedImports = importList.split(',').map(item => {
            const trimmed = item.trim();
            if (!trimmed) return null;
            
            // Handle "as" aliases: "originalName as aliasName"
            const asMatch = trimmed.match(/^(.+?)\s+as\s+(.+)$/);
            if (asMatch) {
              return {
                original: asMatch[1].trim(),
                alias: asMatch[2].trim(),
                used: asMatch[2].trim() // We check usage by the alias name
              };
            }
            return {
              original: trimmed,
              alias: null,
              used: trimmed
            };
          }).filter(Boolean);
          
          namedImports.forEach(namedImport => {
            imports.push({
              type: 'named',
              name: namedImport.used,
              originalName: namedImport.original,
              module: moduleName,
              line: lineNumber,
              fullMatch: fullMatch
            });
          });
        } catch (regexError) {
          console.warn(chalk.yellow(`Warning: Error processing named import match: ${regexError.message}`));
          continue;
        }
      }
      
      // Pattern 2: Default imports - import DefaultName from 'module'
      const defaultImportRegex = /import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s*['"`]([^'"`]+)['"`]/g;
      
      while ((match = defaultImportRegex.exec(content)) !== null) {
        try {
          const [fullMatch, importName, moduleName] = match;
          const lineNumber = this.getLineNumber(content, match.index);
          
          // Skip if this is actually a named import (has curly braces)
          if (!fullMatch.includes('{')) {
            imports.push({
              type: 'default',
              name: importName,
              originalName: importName,
              module: moduleName,
              line: lineNumber,
              fullMatch: fullMatch
            });
          }
        } catch (regexError) {
          console.warn(chalk.yellow(`Warning: Error processing default import match: ${regexError.message}`));
          continue;
        }
      }
      
      // Pattern 3: Namespace imports - import * as Name from 'module'
      const namespaceImportRegex = /import\s*\*\s*as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s*['"`]([^'"`]+)['"`]/g;
      
      while ((match = namespaceImportRegex.exec(content)) !== null) {
        try {
          const [fullMatch, importName, moduleName] = match;
          const lineNumber = this.getLineNumber(content, match.index);
          
          imports.push({
            type: 'namespace',
            name: importName,
            originalName: importName,
            module: moduleName,
            line: lineNumber,
            fullMatch: fullMatch
          });
        } catch (regexError) {
          console.warn(chalk.yellow(`Warning: Error processing namespace import match: ${regexError.message}`));
          continue;
        }
      }
      
      // Pattern 4: Side-effect imports - import 'module' (these are always considered used)
      const sideEffectImportRegex = /import\s*['"`]([^'"`]+)['"`]/g;
      
      while ((match = sideEffectImportRegex.exec(content)) !== null) {
        try {
          const [fullMatch, moduleName] = match;
          const lineNumber = this.getLineNumber(content, match.index);
          
          // Side-effect imports are always considered used
          imports.push({
            type: 'side-effect',
            name: null,
            originalName: null,
            module: moduleName,
            line: lineNumber,
            fullMatch: fullMatch,
            alwaysUsed: true
          });
        } catch (regexError) {
          console.warn(chalk.yellow(`Warning: Error processing side-effect import match: ${regexError.message}`));
          continue;
        }
      }
      
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Error extracting imports: ${error.message}`));
    }
    
    return imports;
  }

  /**
   * Check if an imported item is used in the file content with comprehensive error handling
   * @param {Object} importItem - Import object to check
   * @param {string} content - File content to search in
   * @returns {boolean} True if the import is used
   */
  isImportUsedInFile(importItem, content) {
    try {
      // Validate inputs
      if (!importItem || typeof importItem !== 'object') {
        console.warn(chalk.yellow('Warning: Invalid import item provided to isImportUsedInFile'));
        return true; // Assume used to be safe
      }

      if (!content || typeof content !== 'string') {
        console.warn(chalk.yellow('Warning: Invalid content provided to isImportUsedInFile'));
        return true; // Assume used to be safe
      }

      // Side-effect imports are always considered used
      if (importItem.alwaysUsed || importItem.type === 'side-effect') {
        return true;
      }
      
      const importName = importItem.name;
      if (!importName) return true; // Safety check
      
      // Remove the import statement itself and comments to avoid false positives
      const contentWithoutImports = this.removeImportStatements(content);
      const contentWithoutComments = this.removeComments(contentWithoutImports);
      
      // Create regex patterns to find usage
      const usagePatterns = this.createUsagePatterns(importName, importItem.type);
      
      // Check each pattern with individual error handling
      for (const pattern of usagePatterns) {
        try {
          if (pattern.test(contentWithoutComments)) {
            return true;
          }
        } catch (patternError) {
          console.warn(chalk.yellow(`Warning: Error testing usage pattern for ${importName}: ${patternError.message}`));
          continue;
        }
      }
      
      return false;
      
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Error checking import usage for ${importItem?.name || 'unknown'}: ${error.message}`));
      // If we can't determine usage, assume it's used to be safe
      return true;
    }
  }

  /**
   * Create regex patterns to detect usage of an imported item
   * @param {string} importName - Name of the imported item
   * @param {string} importType - Type of import (named, default, namespace)
   * @returns {Array} Array of regex patterns
   */
  createUsagePatterns(importName, importType) {
    const patterns = [];
    
    try {
      // Validate inputs
      if (!importName || typeof importName !== 'string') {
        console.warn(chalk.yellow('Warning: Invalid import name provided to createUsagePatterns'));
        return patterns;
      }

      // Escape special regex characters safely
      const escapedName = importName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Define pattern configurations to avoid repetition and enable error handling
      const patternConfigs = [
        // Direct usage: importName(, importName., importName[, importName<
        { pattern: `\\b${escapedName}\\s*[.([<]`, description: 'direct usage' },
        
        // Assignment or comparison: = importName, == importName, === importName, etc.
        { pattern: `[=!<>]+\\s*${escapedName}\\b`, description: 'assignment/comparison' },
        
        // Function calls: importName()
        { pattern: `\\b${escapedName}\\s*\\(`, description: 'function call' },
        
        // JSX usage: <importName, </importName
        { pattern: `</?\\s*${escapedName}\\b`, description: 'JSX usage' },
        
        // Object destructuring: { ...importName }
        { pattern: `{[^}]*\\.\\.\\.\\s*${escapedName}\\b`, description: 'object destructuring' },
        
        // Array usage: [importName] or importName[]
        { pattern: `\\[\\s*${escapedName}\\b|\\b${escapedName}\\s*\\[`, description: 'array usage' },
        
        // Return statement: return importName
        { pattern: `return\\s+${escapedName}\\b`, description: 'return statement' },
        
        // Type annotations: : importName, <importName>, as importName
        { pattern: `:\\s*${escapedName}\\b|<\\s*${escapedName}\\s*>|\\bas\\s+${escapedName}\\b`, description: 'type annotation' },
        
        // Generic type usage: SomeType<importName>, importName<SomeType>
        { pattern: `\\w+\\s*<[^>]*\\b${escapedName}\\b[^>]*>|\\b${escapedName}\\s*<[^>]*>`, description: 'generic type' },
        
        // Function parameter types: (param: importName)
        { pattern: `\\([^)]*:\\s*${escapedName}\\b`, description: 'parameter type' },
        
        // Variable declarations with types: const x: importName
        { pattern: `\\b(?:const|let|var)\\s+\\w+\\s*:\\s*${escapedName}\\b`, description: 'variable type' },
        
        // Array type syntax: importName[]
        { pattern: `\\b${escapedName}\\s*\\[\\s*\\]`, description: 'array type' },
        
        // Union/intersection types: importName | OtherType, importName & OtherType
        { pattern: `\\b${escapedName}\\s*[|&]|[|&]\\s*${escapedName}\\b`, description: 'union/intersection type' },
        
        // Spread operator: ...importName
        { pattern: `\\.\\.\\.\\s*${escapedName}\\b`, description: 'spread operator' },
        
        // Property access: something.importName
        { pattern: `\\.\\s*${escapedName}\\b`, description: 'property access' }
      ];

      // Create regex patterns with individual error handling
      for (const config of patternConfigs) {
        try {
          patterns.push(new RegExp(config.pattern, 'g'));
        } catch (regexError) {
          console.warn(chalk.yellow(`Warning: Failed to create ${config.description} pattern for ${importName}: ${regexError.message}`));
        }
      }
      
      // Special patterns for namespace imports
      if (importType === 'namespace') {
        try {
          // Namespace property access: importName.something
          patterns.push(new RegExp(`\\b${escapedName}\\.\\w+`, 'g'));
        } catch (regexError) {
          console.warn(chalk.yellow(`Warning: Failed to create namespace pattern for ${importName}: ${regexError.message}`));
        }
      }
      
      // Special patterns for React components (common in React projects)
      if (/^[A-Z]/.test(importName)) {
        try {
          // React component usage in JSX
          patterns.push(new RegExp(`<\\s*${escapedName}\\s*[/>]`, 'g'));
          patterns.push(new RegExp(`<\\s*${escapedName}\\s+[^>]*>`, 'g'));
        } catch (regexError) {
          console.warn(chalk.yellow(`Warning: Failed to create React component patterns for ${importName}: ${regexError.message}`));
        }
      }
      
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Error creating usage patterns for ${importName}: ${error.message}`));
    }
    
    return patterns;
  }

  /**
   * Remove comments from code to avoid false positives
   * @param {string} content - Code content
   * @returns {string} Content without comments
   */
  removeComments(content) {
    // Remove single-line comments
    let result = content.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    
    return result;
  }

  /**
   * Remove import statements from content
   * @param {string} content - Code content
   * @returns {string} Content without import statements
   */
  removeImportStatements(content) {
    // Remove all import statements more carefully
    // Handle multiline imports and various formats
    let result = content;
    
    // Remove single-line imports: import ... from '...'
    result = result.replace(/^import\s+.*?from\s*['"`][^'"`]+['"`]\s*;?\s*$/gm, '');
    
    // Remove side-effect imports: import '...'
    result = result.replace(/^import\s*['"`][^'"`]+['"`]\s*;?\s*$/gm, '');
    
    // Remove multiline imports (basic handling)
    result = result.replace(/^import\s*{[^}]*}\s*from\s*['"`][^'"`]+['"`]\s*;?\s*$/gm, '');
    
    return result;
  }



  /**
   * Find unused components across all files
   * @param {string[]} files - Array of file paths to analyze
   */
  findUnusedComponents(files) {
    console.log(chalk.gray('Analyzing for unused components...'));
    
    // Step 1: Extract all exported components from all files
    const exportedComponents = this.extractAllExportedComponents(files);
    console.log(chalk.gray(`Found ${exportedComponents.length} exported components`));
    
    // Step 2: Find which components are imported/used in other files
    const unusedComponents = this.findComponentsNotImportedElsewhere(exportedComponents, files);
    
    if (unusedComponents.length > 0) {
      this.results.unusedComponents.push(...unusedComponents);
      this.results.summary.unusedComponentsFound = unusedComponents.length;
      
      console.log(chalk.yellow(`Found ${unusedComponents.length} potentially unused components`));
    } else {
      console.log(chalk.green('No unused components found'));
    }
  }

  /**
   * Extract all exported components from all files
   * @param {string[]} files - Array of file paths to analyze
   * @returns {Array} Array of exported component objects
   */
  extractAllExportedComponents(files) {
    const exportedComponents = [];
    
    files.forEach(filePath => {
      const components = this.extractExportedComponentsFromFile(filePath);
      exportedComponents.push(...components);
    });
    
    return exportedComponents;
  }

  /**
   * Extract exported components from a single file
   * @param {string} filePath - Path to the file to analyze
   * @returns {Array} Array of exported component objects
   */
  extractExportedComponentsFromFile(filePath) {
    const content = this.safeReadFile(filePath);
    if (!content) return [];
    
    const exportedComponents = [];
    
    try {
      // Pattern 1: export default function ComponentName
      const exportDefaultFunctionRegex = /export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)\s*\(/g;
      let match;
      
      while ((match = exportDefaultFunctionRegex.exec(content)) !== null) {
        const [fullMatch, componentName] = match;
        const lineNumber = this.getLineNumber(content, match.index);
        
        exportedComponents.push({
          name: componentName,
          type: 'default-function',
          file: filePath,
          line: lineNumber,
          exportType: 'default'
        });
      }
      
      // Pattern 2: export function ComponentName
      const exportFunctionRegex = /export\s+function\s+([A-Z][a-zA-Z0-9]*)\s*\(/g;
      
      while ((match = exportFunctionRegex.exec(content)) !== null) {
        const [fullMatch, componentName] = match;
        const lineNumber = this.getLineNumber(content, match.index);
        
        exportedComponents.push({
          name: componentName,
          type: 'named-function',
          file: filePath,
          line: lineNumber,
          exportType: 'named'
        });
      }
      
      // Pattern 3: const ComponentName = ... followed by export default ComponentName
      const constComponentRegex = /const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*(?:\([^)]*\)\s*=>\s*{|React\.FC)/g;
      const exportDefaultNameRegex = /export\s+default\s+([A-Z][a-zA-Z0-9]*)/g;
      
      // Find const components
      const constComponents = [];
      while ((match = constComponentRegex.exec(content)) !== null) {
        const [fullMatch, componentName] = match;
        const lineNumber = this.getLineNumber(content, match.index);
        constComponents.push({ name: componentName, line: lineNumber });
      }
      
      // Find export default statements
      while ((match = exportDefaultNameRegex.exec(content)) !== null) {
        const [fullMatch, exportedName] = match;
        const constComponent = constComponents.find(comp => comp.name === exportedName);
        
        if (constComponent) {
          exportedComponents.push({
            name: exportedName,
            type: 'const-default',
            file: filePath,
            line: constComponent.line,
            exportType: 'default'
          });
        }
      }
      
      // Pattern 4: export const ComponentName = 
      const exportConstRegex = /export\s+const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*(?:\([^)]*\)\s*=>\s*{|React\.FC)/g;
      
      while ((match = exportConstRegex.exec(content)) !== null) {
        const [fullMatch, componentName] = match;
        const lineNumber = this.getLineNumber(content, match.index);
        
        exportedComponents.push({
          name: componentName,
          type: 'const-named',
          file: filePath,
          line: lineNumber,
          exportType: 'named'
        });
      }
      
      // Pattern 5: export { ComponentName } (named exports)
      const exportNamedRegex = /export\s*{\s*([^}]+)\s*}/g;
      
      while ((match = exportNamedRegex.exec(content)) !== null) {
        const [fullMatch, exportList] = match;
        const lineNumber = this.getLineNumber(content, match.index);
        
        // Parse the export list
        const exportedNames = exportList.split(',').map(item => {
          const trimmed = item.trim();
          // Handle "as" aliases: "ComponentName as AliasName"
          const asMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)\s+as\s+([A-Z][a-zA-Z0-9]*)$/);
          if (asMatch) {
            return { original: asMatch[1], exported: asMatch[2] };
          }
          // Check if it's a component (starts with capital letter)
          if (/^[A-Z][a-zA-Z0-9]*$/.test(trimmed)) {
            return { original: trimmed, exported: trimmed };
          }
          return null;
        }).filter(Boolean);
        
        exportedNames.forEach(exportedName => {
          // Check if this component is defined in the file
          const componentDefRegex = new RegExp(`(?:const|function)\\s+${exportedName.original}\\s*[=\\(]`, 'g');
          if (componentDefRegex.test(content)) {
            exportedComponents.push({
              name: exportedName.exported,
              originalName: exportedName.original,
              type: 'named-export',
              file: filePath,
              line: lineNumber,
              exportType: 'named'
            });
          }
        });
      }
      
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Error extracting exported components from ${filePath}: ${error.message}`));
    }
    
    return exportedComponents;
  }

  /**
   * Find components that are exported but not imported elsewhere
   * @param {Array} exportedComponents - Array of exported component objects
   * @param {string[]} files - Array of all file paths
   * @returns {Array} Array of unused component objects
   */
  findComponentsNotImportedElsewhere(exportedComponents, files) {
    const unusedComponents = [];
    
    exportedComponents.forEach(component => {
      const isUsedElsewhere = this.isComponentImportedInOtherFiles(component, files);
      
      if (!isUsedElsewhere) {
        unusedComponents.push({
          name: component.name,
          file: component.file,
          line: component.line,
          type: component.type,
          exportType: component.exportType
        });
      }
    });
    
    return unusedComponents;
  }

  /**
   * Check if a component is imported in other files
   * @param {Object} component - Component object to check
   * @param {string[]} files - Array of all file paths
   * @returns {boolean} True if component is imported elsewhere
   */
  isComponentImportedInOtherFiles(component, files) {
    const componentName = component.name;
    const componentFile = component.file;
    
    // Check all files except the one where the component is defined
    const otherFiles = files.filter(file => file !== componentFile);
    
    for (const filePath of otherFiles) {
      if (this.isComponentImportedInFile(componentName, componentFile, filePath)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if a component is imported in a specific file
   * @param {string} componentName - Name of the component to check
   * @param {string} componentFile - File where the component is defined
   * @param {string} targetFile - File to check for imports
   * @returns {boolean} True if component is imported in the target file
   */
  isComponentImportedInFile(componentName, componentFile, targetFile) {
    const content = this.safeReadFile(targetFile);
    if (!content) return false;
    
    try {
      // Create relative path patterns that might be used in imports
      const possibleImportPaths = this.generatePossibleImportPaths(componentFile, targetFile);
      
      // Check for different import patterns
      for (const importPath of possibleImportPaths) {
        // Pattern 1: Named import - import { ComponentName } from './path'
        const namedImportRegex = new RegExp(`import\\s*{[^}]*\\b${componentName}\\b[^}]*}\\s*from\\s*['"\`]${this.escapeRegex(importPath)}['"\`]`, 'g');
        if (namedImportRegex.test(content)) {
          return true;
        }
        
        // Pattern 2: Default import - import ComponentName from './path'
        const defaultImportRegex = new RegExp(`import\\s+${componentName}\\s+from\\s*['"\`]${this.escapeRegex(importPath)}['"\`]`, 'g');
        if (defaultImportRegex.test(content)) {
          return true;
        }
        
        // Pattern 3: Namespace import - import * as Something from './path' (then check usage)
        const namespaceImportRegex = new RegExp(`import\\s*\\*\\s*as\\s+(\\w+)\\s+from\\s*['"\`]${this.escapeRegex(importPath)}['"\`]`, 'g');
        let namespaceMatch;
        while ((namespaceMatch = namespaceImportRegex.exec(content)) !== null) {
          const namespaceName = namespaceMatch[1];
          // Check if the component is used via namespace (e.g., Namespace.ComponentName)
          const namespaceUsageRegex = new RegExp(`\\b${namespaceName}\\.${componentName}\\b`, 'g');
          if (namespaceUsageRegex.test(content)) {
            return true;
          }
        }
      }
      
      // Also check for direct JSX usage (in case of dynamic imports or other patterns)
      const jsxUsageRegex = new RegExp(`<\\s*${componentName}\\s*[/>]|<\\s*${componentName}\\s+[^>]*>`, 'g');
      if (jsxUsageRegex.test(content)) {
        return true;
      }
      
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Error checking component import in ${targetFile}: ${error.message}`));
      // If we can't determine usage, assume it's used to be safe
      return true;
    }
    
    return false;
  }

  /**
   * Generate possible import paths for a component file from a target file
   * @param {string} componentFile - File where component is defined
   * @param {string} targetFile - File that might import the component
   * @returns {Array} Array of possible import path strings
   */
  generatePossibleImportPaths(componentFile, targetFile) {
    const paths = [];
    
    try {
      // Get relative path from target to component
      const relativePath = path.relative(path.dirname(targetFile), componentFile);
      
      // Normalize path separators for cross-platform compatibility
      const normalizedPath = relativePath.replace(/\\/g, '/');
      
      // Add the relative path (with and without extension)
      paths.push(normalizedPath);
      paths.push(normalizedPath.replace(/\.(ts|tsx|js|jsx)$/, ''));
      
      // Add with ./ prefix if it doesn't start with . or /
      if (!normalizedPath.startsWith('.') && !normalizedPath.startsWith('/')) {
        paths.push('./' + normalizedPath);
        paths.push('./' + normalizedPath.replace(/\.(ts|tsx|js|jsx)$/, ''));
      }
      
      // Add common variations
      const withoutExt = normalizedPath.replace(/\.(ts|tsx|js|jsx)$/, '');
      if (withoutExt.endsWith('/index')) {
        // Handle index files - can be imported as directory
        const dirPath = withoutExt.replace('/index', '');
        paths.push(dirPath);
        if (!dirPath.startsWith('.')) {
          paths.push('./' + dirPath);
        }
      }
      
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Error generating import paths: ${error.message}`));
    }
    
    return paths;
  }

  /**
   * Escape special regex characters in a string
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate comprehensive console report with formatted output
   */
  generateReport() {
    console.log(chalk.blue.bold('\n' + '='.repeat(60)));
    console.log(chalk.blue.bold('📋 CODE REVIEW ANALYSIS REPORT'));
    console.log(chalk.blue.bold('='.repeat(60)));
    
    // Print summary statistics
    this.printSummaryStatistics();
    
    // Print detailed findings
    this.printDetailedFindings();
    
    // Print final status
    this.printFinalStatus();
  }

  /**
   * Print summary statistics with colored formatting
   */
  printSummaryStatistics() {
    const { summary } = this.results;
    
    console.log(chalk.cyan.bold('\n📊 SUMMARY STATISTICS'));
    console.log(chalk.cyan('-'.repeat(30)));
    
    console.log(chalk.white(`📁 Files Scanned: ${chalk.bold.green(summary.filesScanned)}`));
    
    // Color-code the issue counts based on severity
    const duplicateColor = summary.duplicatesFound > 0 ? chalk.bold.red : chalk.bold.green;
    const duplicateFunctionColor = summary.duplicateFunctionsFound > 0 ? chalk.bold.red : chalk.bold.green;
    const unusedImportColor = summary.unusedImportsFound > 0 ? chalk.bold.yellow : chalk.bold.green;
    const unusedComponentColor = summary.unusedComponentsFound > 0 ? chalk.bold.yellow : chalk.bold.green;
    
    console.log(chalk.white(`🔄 Duplicate Components: ${duplicateColor(summary.duplicatesFound)}`));
    console.log(chalk.white(`⚙️  Duplicate Functions: ${duplicateFunctionColor(summary.duplicateFunctionsFound)}`));
    console.log(chalk.white(`📦 Unused Imports: ${unusedImportColor(summary.unusedImportsFound)}`));
    console.log(chalk.white(`🧩 Unused Components: ${unusedComponentColor(summary.unusedComponentsFound)}`));
    
    // Calculate total issues
    const totalIssues = summary.duplicatesFound + summary.duplicateFunctionsFound + summary.unusedImportsFound + summary.unusedComponentsFound;
    const totalColor = totalIssues > 0 ? chalk.bold.red : chalk.bold.green;
    console.log(chalk.white(`⚠️  Total Issues: ${totalColor(totalIssues)}`));
  }

  /**
   * Print detailed findings with file paths and line numbers
   */
  printDetailedFindings() {
    // Print duplicate components details
    if (this.results.duplicates.length > 0) {
      this.printDuplicateComponentsDetails();
    }
    
    // Print duplicate functions details
    if (this.results.duplicateFunctions.length > 0) {
      this.printDuplicateFunctionsDetails();
    }
    
    // Print unused imports details
    if (this.results.unusedImports.length > 0) {
      this.printUnusedImportsDetails();
    }
    
    // Print unused components details (if any)
    if (this.results.unusedComponents.length > 0) {
      this.printUnusedComponentsDetails();
    }
    
    // If no issues found, show success message
    if (this.results.duplicates.length === 0 && 
        this.results.duplicateFunctions.length === 0 &&
        this.results.unusedImports.length === 0 && 
        this.results.unusedComponents.length === 0) {
      console.log(chalk.green.bold('\n✨ NO ISSUES FOUND'));
      console.log(chalk.green('Your codebase looks clean! No duplicates or unused imports detected.'));
    }
  }

  /**
   * Print detailed duplicate components with enhanced formatting
   */
  printDuplicateComponentsDetails() {
    console.log(chalk.red.bold('\n🔄 DUPLICATE COMPONENTS DETECTED'));
    console.log(chalk.red('-'.repeat(40)));
    
    this.results.duplicates.forEach((duplicate, index) => {
      console.log(chalk.red.bold(`\n${index + 1}. ${duplicate.name}`));
      console.log(chalk.gray(`   Similarity: ${duplicate.similarity} (${duplicate.reason})`));
      console.log(chalk.gray('   Found in:'));
      
      duplicate.files.forEach((file, fileIndex) => {
        const prefix = fileIndex === duplicate.files.length - 1 ? '   └─' : '   ├─';
        console.log(chalk.yellow(`${prefix} ${file.name}`));
        console.log(chalk.gray(`      📁 ${file.file}:${file.line}`));
      });
      
      // Add suggestion
      console.log(chalk.cyan('   💡 Suggestion: Consider consolidating these similar components'));
    });
  }

  /**
   * Print detailed duplicate functions with enhanced formatting
   */
  printDuplicateFunctionsDetails() {
    console.log(chalk.red.bold('\n⚙️  DUPLICATE FUNCTIONS DETECTED'));
    console.log(chalk.red('-'.repeat(40)));
    
    this.results.duplicateFunctions.forEach((duplicate, index) => {
      console.log(chalk.red.bold(`\n${index + 1}. ${duplicate.name}`));
      console.log(chalk.gray(`   Similarity: ${duplicate.similarity} (${duplicate.reason})`));
      console.log(chalk.gray('   Found in:'));
      
      duplicate.files.forEach((file, fileIndex) => {
        const prefix = fileIndex === duplicate.files.length - 1 ? '   └─' : '   ├─';
        console.log(chalk.yellow(`${prefix} ${file.name}()`));
        console.log(chalk.gray(`      📁 ${file.file}:${file.line}`));
        console.log(chalk.gray(`      📝 ${file.signature}`));
      });
      
      // Add suggestion
      console.log(chalk.cyan('   💡 Suggestion: Consider consolidating these similar utility functions'));
    });
  }

  /**
   * Print detailed unused imports with enhanced formatting
   */
  printUnusedImportsDetails() {
    console.log(chalk.yellow.bold('\n📦 UNUSED IMPORTS DETECTED'));
    console.log(chalk.yellow('-'.repeat(40)));
    
    this.results.unusedImports.forEach((fileData, index) => {
      console.log(chalk.yellow.bold(`\n${index + 1}. ${path.basename(fileData.file)}`));
      console.log(chalk.gray(`   📁 ${fileData.file}`));
      console.log(chalk.gray(`   Unused imports (${fileData.imports.length}):`));
      
      fileData.imports.forEach((importItem, importIndex) => {
        const prefix = importIndex === fileData.imports.length - 1 ? '   └─' : '   ├─';
        const importType = this.getImportTypeIcon(importItem.type);
        const importDescription = this.formatImportDescription(importItem);
        
        console.log(chalk.red(`${prefix} ${importType} ${importDescription}`));
        console.log(chalk.gray(`      Line ${importItem.line}: ${importItem.fullMatch.trim()}`));
      });
      
      // Add suggestion
      console.log(chalk.cyan('   💡 Suggestion: Remove these unused imports to clean up the code'));
    });
  }

  /**
   * Print detailed unused components (placeholder for future implementation)
   */
  printUnusedComponentsDetails() {
    console.log(chalk.magenta.bold('\n🧩 UNUSED COMPONENTS DETECTED'));
    console.log(chalk.magenta('-'.repeat(40)));
    
    this.results.unusedComponents.forEach((component, index) => {
      console.log(chalk.magenta.bold(`\n${index + 1}. ${component.name}`));
      console.log(chalk.gray(`   📁 ${component.file}:${component.line}`));
      console.log(chalk.cyan('   💡 Suggestion: Consider removing if truly unused'));
    });
  }

  /**
   * Print final status and recommendations
   */
  printFinalStatus() {
    const { summary } = this.results;
    const totalIssues = summary.duplicatesFound + summary.duplicateFunctionsFound + summary.unusedImportsFound + summary.unusedComponentsFound;
    
    console.log(chalk.blue.bold('\n' + '='.repeat(60)));
    
    if (totalIssues === 0) {
      console.log(chalk.green.bold('✅ ANALYSIS COMPLETE - NO ISSUES FOUND'));
      console.log(chalk.green('🎉 Your codebase is clean and well-maintained!'));
    } else {
      console.log(chalk.yellow.bold('⚠️  ANALYSIS COMPLETE - ISSUES FOUND'));
      console.log(chalk.white(`Found ${chalk.bold.red(totalIssues)} issue(s) across ${chalk.bold.cyan(summary.filesScanned)} files`));
      
      // Provide prioritized recommendations
      console.log(chalk.cyan.bold('\n🎯 RECOMMENDED ACTIONS:'));
      
      let priority = 1;
      
      if (summary.duplicatesFound > 0) {
        console.log(chalk.red(`   ${priority++}. 🔄 Review and consolidate duplicate components (High Priority)`));
      }
      
      if (summary.duplicateFunctionsFound > 0) {
        console.log(chalk.red(`   ${priority++}. ⚙️  Review and consolidate duplicate functions (High Priority)`));
      }
      
      if (summary.unusedImportsFound > 0) {
        console.log(chalk.yellow(`   ${priority++}. 📦 Remove unused imports to reduce bundle size (Medium Priority)`));
      }
      
      if (summary.unusedComponentsFound > 0) {
        console.log(chalk.magenta(`   ${priority++}. 🧩 Remove unused components (Low Priority)`));
      }
    }
    
    console.log(chalk.blue.bold('='.repeat(60)));
    console.log(chalk.gray('Run this script regularly to maintain code quality\n'));
  }

  /**
   * Get icon for import type
   * @param {string} type - Import type
   * @returns {string} Icon representation
   */
  getImportTypeIcon(type) {
    switch (type) {
      case 'default': return '📥';
      case 'named': return '📋';
      case 'namespace': return '📚';
      case 'side-effect': return '⚡';
      default: return '📦';
    }
  }

  /**
   * Format import description for display
   * @param {Object} importItem - Import item object
   * @returns {string} Formatted description
   */
  formatImportDescription(importItem) {
    try {
      if (!importItem || typeof importItem !== 'object') {
        return chalk.gray('(invalid import item)');
      }

      switch (importItem.type) {
        case 'default':
          return `${chalk.bold(importItem.name || 'unknown')} ${chalk.gray(`(default from '${importItem.module || 'unknown'}')`)}`;
        case 'named':
          return `${chalk.bold(importItem.name || 'unknown')} ${chalk.gray(`(named from '${importItem.module || 'unknown'}')`)}`;
        case 'namespace':
          return `${chalk.bold(importItem.name || 'unknown')} ${chalk.gray(`(namespace from '${importItem.module || 'unknown'}')`)}`;
        case 'side-effect':
          return `${chalk.gray(`'${importItem.module || 'unknown'}' (side-effect)`)}`;
        default:
          return `${chalk.bold(importItem.name || 'unknown')} ${chalk.gray(`(from '${importItem.module || 'unknown'}')`)}`;
      }
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Error formatting import description: ${error.message}`));
      return chalk.gray('(error formatting import)');
    }
  }

  /**
   * Validate if content appears to be valid TypeScript/JavaScript
   * @param {string} content - File content to validate
   * @returns {boolean} True if content appears to be valid TS/JS
   */
  isValidTypeScriptContent(content) {
    try {
      if (!content || typeof content !== 'string') {
        return false;
      }

      // Check for common TypeScript/JavaScript patterns
      const hasImports = /import\s+.*from\s*['"`]/.test(content);
      const hasExports = /export\s+/.test(content);
      const hasFunctions = /function\s+\w+|const\s+\w+\s*=\s*\(/.test(content);
      const hasVariables = /(?:const|let|var)\s+\w+/.test(content);
      const hasComments = /\/\/|\/\*/.test(content);
      const hasTypeScript = /:\s*\w+|interface\s+\w+|type\s+\w+/.test(content);

      // If it has any of these patterns, it's likely valid TS/JS
      return hasImports || hasExports || hasFunctions || hasVariables || hasComments || hasTypeScript;
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Error validating TypeScript content: ${error.message}`));
      return false;
    }
  }

  /**
   * Handle parsing errors with specific error messages
   * @param {Error} error - The parsing error that occurred
   * @param {string} filePath - Path to the file that failed to parse
   * @param {string} parseType - Type of parsing that failed (components, functions, imports)
   */
  handleParsingError(error, filePath, parseType) {
    const fileName = path.basename(filePath);
    
    try {
      // Check for specific error types
      if (error.name === 'SyntaxError') {
        console.warn(chalk.yellow(`Warning: Syntax error in ${fileName}, skipping ${parseType} analysis`));
      } else if (error.message.includes('Maximum call stack')) {
        console.warn(chalk.yellow(`Warning: File too complex for ${parseType} analysis: ${fileName}`));
      } else if (error.message.includes('out of memory')) {
        console.warn(chalk.yellow(`Warning: File too large for ${parseType} analysis: ${fileName}`));
      } else if (error.message.includes('Invalid regular expression')) {
        console.warn(chalk.yellow(`Warning: Regex error during ${parseType} analysis in ${fileName}`));
      } else {
        console.warn(chalk.yellow(`Warning: Error parsing ${parseType} in ${fileName}: ${error.message}`));
      }
    } catch (handlingError) {
      console.warn(chalk.yellow(`Warning: Error handling parsing error for ${fileName}: ${handlingError.message}`));
    }
  }
}

// Run the analyzer if this script is executed directly
if (require.main === module) {
  const config = new CodeReviewConfig();
  const analyzer = new CodeReviewAnalyzer(config);
  analyzer.analyze();
}

module.exports = CodeReviewAnalyzer;