const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MOBILE_ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(MOBILE_ROOT, 'android');
const GRADLE_JVM_ARGS = '-Xmx1536m -XX:MaxMetaspaceSize=512m -XX:ActiveProcessorCount=2 -Dfile.encoding=UTF-8';
const MIN_WINDOWS_COMMIT_MB = 4096;

function checkWindowsBuildMemory() {
  if (process.platform !== 'win32') return;

  const result = spawnSync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    '(Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory',
  ], { encoding: 'utf8', windowsHide: true });
  const availableKB = Number(result.stdout?.trim());
  if (result.status !== 0 || !Number.isFinite(availableKB) || availableKB <= 0) {
    console.warn('Windows memory preflight unavailable; proceeding with compiler limits.');
    return;
  }

  const availableMB = Math.floor(availableKB / 1024);
  console.log(`Available Windows committed memory: ${availableMB} MB`);
  if (availableMB < MIN_WINDOWS_COMMIT_MB) {
    throw new Error(
      `The Android build needs at least ${MIN_WINDOWS_COMMIT_MB} MB of available Windows committed memory; ` +
      `only ${availableMB} MB is available. Close memory-heavy apps or enable a system-managed paging file, ` +
      'then rerun npm run build:android:apk.'
    );
  }
}

function checkResult(result) {
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Android build failed (${result.signal || `exit code ${result.status}`}).`);
  }
}

function buildAndroidApk(variant = 'release', { clean = false } = {}) {
  if (!['debug', 'release'].includes(variant)) {
    throw new Error(`Unsupported Android build variant: ${variant}`);
  }
  checkWindowsBuildMemory();

  const env = {
    ...process.env,
    NODE_ENV: variant === 'release' ? 'production' : 'development',
    NODE_OPTIONS: [process.env.NODE_OPTIONS, '--max-old-space-size=1024'].filter(Boolean).join(' '),
    CMAKE_BUILD_PARALLEL_LEVEL: '2',
  };
  const wrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

  if (!fs.existsSync(path.join(ANDROID_DIR, wrapper))) {
    const expoCli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
    console.log('Generating the native Android project with Expo...');
    checkResult(spawnSync(process.execPath, [expoCli, 'prebuild', '--platform', 'android', '--no-install'], {
      cwd: MOBILE_ROOT,
      env,
      stdio: 'inherit',
    }));
  }

  const task = variant === 'release' ? 'assembleRelease' : 'assembleDebug';
  // All command arguments are fixed values; no user-provided shell text is interpolated.
  const command = [
    wrapper,
    ...(clean ? ['clean'] : []),
    task,
    '--init-script',
    '../scripts/local-android.gradle',
    '--no-daemon',
    '--no-parallel',
    '--max-workers=2',
    '--console=plain',
    `"-Dorg.gradle.jvmargs=${GRADLE_JVM_ARGS}"`,
    '-Pkotlin.compiler.execution.strategy=in-process',
  ].join(' ');

  console.log(`> ${command}`);
  checkResult(spawnSync(command, { cwd: ANDROID_DIR, env, stdio: 'inherit', shell: true }));

  const apkPath = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', variant, `app-${variant}.apk`);
  if (!fs.existsSync(apkPath)) throw new Error(`APK not found after the build: ${apkPath}`);
  return apkPath;
}

module.exports = { buildAndroidApk };

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => arg !== '--clean')) throw new Error('Supported build option: --clean');
    console.log(`APK ready: ${buildAndroidApk('release', { clean: args.includes('--clean') })}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
