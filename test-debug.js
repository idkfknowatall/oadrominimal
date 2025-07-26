const content = `import { clsx, type ClassValue } from 'clsx';
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}`;

const patterns = [
  /\bClassValue\s*\[/g,
  /:\s*ClassValue\b/g,
  /\w+\s*<[^>]*\bClassValue\b[^>]*>/g,
  /\bClassValue\s*<[^>]*>/g,
  /\([^)]*:\s*ClassValue\b/g,
  /\b(?:const|let|var)\s+\w+\s*:\s*ClassValue\b/g,
  /\bClassValue\s*\[\s*\]/g
];

console.log('Content:', content);
patterns.forEach((pattern, i) => {
  const matches = content.match(pattern);
  console.log(`Pattern ${i}:`, pattern, '-> Matches:', matches);
});