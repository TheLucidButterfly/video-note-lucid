const { execFileSync } = require('child_process');

const requiredEnv = ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'];
const missingEnv = requiredEnv.filter((name) => !process.env[name] || !process.env[name].trim());

const failures = [];

if (missingEnv.length > 0) {
  failures.push(`Missing environment variables: ${missingEnv.join(', ')}`);
}

if (process.platform !== 'darwin') {
  failures.push('Signed macOS builds require running this command on macOS.');
}

if (process.env.APPLE_ID && !process.env.APPLE_ID.includes('@')) {
  failures.push('APPLE_ID should look like an Apple ID email address.');
}

if (process.env.APPLE_TEAM_ID && !/^[A-Z0-9]{10}$/.test(process.env.APPLE_TEAM_ID)) {
  failures.push('APPLE_TEAM_ID should be a 10-character Apple Team ID (letters/numbers).');
}

let identityOutput = '';
try {
  identityOutput = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], {
    encoding: 'utf8'
  });
} catch (error) {
  failures.push('Could not query Keychain signing identities using `security find-identity`.');
}

if (identityOutput && !identityOutput.includes('Developer ID Application')) {
  failures.push('No `Developer ID Application` certificate found in Keychain.');
}

if (failures.length > 0) {
  console.error('✖ macOS signing preflight failed:\n');
  failures.forEach((failure) => {
    console.error(`- ${failure}`);
  });
  console.error('\nNext steps:');
  console.error('- Install a valid `Developer ID Application` certificate in login Keychain.');
  console.error('- Export APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID in this shell.');
  console.error('- Ensure your Apple Developer legal agreements are accepted (cannot be verified locally).');
  process.exit(1);
}

console.log('✔ macOS signing preflight passed. Found required env vars and signing identity.');