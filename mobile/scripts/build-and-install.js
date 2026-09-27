const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const MOBILE_ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(MOBILE_ROOT, 'android');
const APK_PATH = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const PACKAGE_NAME = 'com.fundtracker.mobile';
const ACTIVITY_NAME = `${PACKAGE_NAME}/.MainActivity`;

function runCmd(cmd, cwd = MOBILE_ROOT, stdio = 'inherit') {
  console.log(`\x1b[36m> ${cmd}\x1b[0m`);
  try {
    return execSync(cmd, { cwd, stdio, encoding: 'utf8' });
  } catch (err) {
    if (stdio !== 'inherit') {
      throw err;
    }
    process.exit(1);
  }
}

function checkAdb() {
  try {
    runCmd('adb version', MOBILE_ROOT, 'pipe');
    return true;
  } catch (err) {
    console.error('\x1b[31m[Error] ADB (Android Debug Bridge) is not installed or not found in PATH.\x1b[0m');
    console.error('Please make sure Android SDK platform-tools are in your PATH.');
    process.exit(1);
  }
}

function getConnectedDevices() {
  const out = runCmd('adb devices', MOBILE_ROOT, 'pipe');
  const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
  const devices = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/\s+/);
    if (parts.length >= 2 && parts[1] === 'device') {
      devices.push(parts[0]);
    }
  }
  return devices;
}

function setupPortForwarding(deviceId) {
  const target = deviceId ? `-s ${deviceId}` : '';
  console.log('\n\x1b[34m[1/5] Setting up ADB reverse port forwarding for backend API...\x1b[0m');
  try {
    runCmd(`adb ${target} reverse tcp:3001 tcp:3001`, MOBILE_ROOT, 'pipe');
    console.log('\x1b[32m✔ Port 3001 (Backend API) reversed to connected device via USB!\x1b[0m');
  } catch (e) {
    console.warn('\x1b[33m⚠ Warning: Failed to reverse port 3001 (device might already be configured)\x1b[0m');
  }
}

function ensureNativeProject() {
  if (!fs.existsSync(ANDROID_DIR)) {
    console.log('\n\x1b[34mNative android project not found. Generating with Expo prebuild...\x1b[0m');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    runCmd(`${npxCmd} expo prebuild --platform android`, MOBILE_ROOT);
  }
}

function buildApk() {
  console.log('\n\x1b[34m[2/5] Compiling Debug APK with Gradle...\x1b[0m');
  const isWindows = process.platform === 'win32';
  const gradlewCmd = isWindows ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug';

  runCmd(gradlewCmd, ANDROID_DIR);

  if (!fs.existsSync(APK_PATH)) {
    console.error(`\x1b[31m[Error] APK not found at: ${APK_PATH}\x1b[0m`);
    process.exit(1);
  }
  console.log(`\x1b[32m✔ APK successfully built at:\x1b[0m\n  ${APK_PATH}`);
}

function installApk(deviceId) {
  const target = deviceId ? `-s ${deviceId}` : '';
  console.log(`\n\x1b[34m[3/5] Installing APK on connected device (${deviceId || 'default'})...\x1b[0m`);
  runCmd(`adb ${target} install -r "${APK_PATH}"`, MOBILE_ROOT);
  console.log('\x1b[32m✔ APK installed successfully!\x1b[0m');
}

function launchApp(deviceId) {
  const target = deviceId ? `-s ${deviceId}` : '';
  console.log(`\n\x1b[34m[4/5] Launching ${PACKAGE_NAME} on device...\x1b[0m`);
  try {
    runCmd(`adb ${target} shell am start -n "${ACTIVITY_NAME}"`, MOBILE_ROOT);
    console.log(`\x1b[32m✔ App launched!\x1b[0m`);
  } catch (e) {
    console.warn(`\x1b[33m⚠ Warning: Could not auto-launch app activity. Please tap FundTracker icon on device.\x1b[0m`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const skipBuild = args.includes('--skip-build');
  const buildOnly = args.includes('--build-only');

  console.log('\x1b[35m====================================================\x1b[0m');
  console.log('\x1b[35m   FundTracker Mobile — Local APK Build & Deploy   \x1b[0m');
  console.log('\x1b[35m====================================================\x1b[0m');

  checkAdb();

  const devices = getConnectedDevices();
  if (devices.length === 0 && !buildOnly) {
    console.warn('\x1b[33m⚠ No connected Android devices or emulators found.\x1b[0m');
    console.log('Run `adb devices` or connect your device via USB with USB Debugging enabled.');
    if (!args.includes('--build')) {
      console.log('Building APK only without installing...');
    }
  } else if (devices.length > 0) {
    console.log(`Found ${devices.length} connected device(s): ${devices.join(', ')}`);
  }

  ensureNativeProject();

  if (!skipBuild) {
    buildApk();
  }

  if (buildOnly) {
    console.log('\n\x1b[32m✔ Build complete! APK is ready at:\x1b[0m');
    console.log(`  ${APK_PATH}`);
    return;
  }

  if (devices.length > 0) {
    for (const deviceId of devices) {
      setupPortForwarding(deviceId);
      installApk(deviceId);
      launchApp(deviceId);
    }
  }

  console.log('\n\x1b[32m====================================================\x1b[0m');
  console.log('\x1b[32m   🎉 FundTracker Mobile is running on your device! \x1b[0m');
  console.log('\x1b[32m====================================================\x1b[0m');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  console.log('\n\x1b[36mHow to use the app:\x1b[0m');
  console.log(`1. Start backend server: \x1b[33m${npmCmd} run dev:backend\x1b[0m (accessible at http://localhost:3001/api via USB reverse port)`);
  console.log('2. The app is running standalone on your phone — no Metro server is required!');
  console.log('3. Tap "Explore Demo Mode" on your phone to interact with live backend data.\n');
}

main().catch((err) => {
  console.error('\x1b[31mUnexpected error:\x1b[0m', err);
  process.exit(1);
});
