import { validatePath, validateCommand } from '../src/utils/validation';

console.log('Testing validatePath:');
try {
  console.log('Testing ../../etc/passwd:', validatePath('../../etc/passwd'));
} catch (e: any) {
  console.log('Error:', e.message);
}

console.log('Testing validateCommand:');
try {
  console.log('Testing npm run build && rm -rf /:', validateCommand('npm run build && rm -rf /'));
} catch (e: any) {
  console.log('Error:', e.message);
}