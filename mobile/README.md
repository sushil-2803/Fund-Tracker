# FundTracker Mobile

FundTracker is a JavaScript-only Expo React Native app for Android and iOS.

## Stack

- Expo SDK 57, React 19.2, React Native 0.86, Node 22 LTS (`>=22.13.0`)
- React Navigation, TanStack React Query, Axios, React Hook Form, Zod
- Expo Secure Store, Reanimated, native date picker, lucide-react-native
- Native Google Sign-In and EAS Build

## Local setup

```powershell
cd D:\Projects\fund-tracker\mobile
npm ci
Copy-Item .env.example .env
npx expo-doctor
npm run lint
```

Use a LAN-reachable API URL in `.env` for physical devices. Run `npx expo prebuild --clean` after native dependency, `app.json`, or SDK changes, then make the first native build with `npx expo run:android` or `npx expo run:ios`. Use `npx expo start` for JavaScript-only changes. iOS local builds require macOS/Xcode.

## Environment and security

`.env.example` documents `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`. These values are embedded in the app: never put secrets, server credentials, private API keys, database URLs, or JWT signing keys in them. Production requires a present `https://` API URL; the app fails clearly for a missing or insecure production URL.

Tokens are stored only in Expo Secure Store. The authenticated Axios client attaches bearer tokens, refreshes once through a shared promise after a 401, and clears credentials plus the React Query cache on logout, refresh failure, or account changes. API functions live under `src/api`, not in UI components.

## Google native sign-in

`@react-native-google-signin/google-signin` requires a custom Expo development build or release build; it does not work in Expo Go.

1. Create Web, Android, and iOS OAuth clients in Google Cloud Console.
2. Configure Android for `com.fundtracker.mobile`.
3. Add the debug keystore SHA-1 for local builds and the EAS/production signing-key SHA-1 for release builds.
4. Put client IDs in `.env` and EAS environments.
5. Replace `iosUrlScheme` in `app.json` with the real reversed iOS client ID.
6. Provide `google-services.json` locally when required; do not commit credentials.

## Validation and EAS release

```powershell
npx expo-doctor
npm run lint
npx expo export
eas build --platform android --profile development
eas build --platform android --profile preview
eas build --platform android --profile production
eas build --platform ios --profile preview
eas build --platform ios --profile production
```

`eas.json` uses a development client plus internal distribution for development, internal distribution for preview, and auto-increment for production. Production Android output is an App Bundle (`.aab`) for Google Play, not an APK. Let EAS manage credentials unless explicitly configured otherwise. Replace the placeholder EAS project ID and OAuth values in `app.json` before release.

## Useful commands

```powershell
npm run start
npm run android
npm run ios
npm run web
npm run lint
npx expo prebuild --clean
npx expo start --clear
```
# Instructions for local development with a physical Android device
From the project root:

```powershell
cd D:\Projects\fund-tracker\mobile
npm.cmd ci
Copy-Item .env.example .env
```

Set `EXPO_PUBLIC_API_BASE_URL` in `.env` to a LAN-reachable backend URL, for example:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3001
```

Connect the Android device with USB debugging enabled, then verify:

```powershell
adb devices
```

Build and install the native development app:

```powershell
npx expo prebuild --clean
npx expo run:android --device
```

For subsequent JavaScript-only changes:

```powershell
npx expo start --dev-client
```

If using USB port forwarding instead of a LAN IP:

```powershell
npm.cmd run adb:reverse
npm.cmd run start
```

# Native Google Sign-In requires this custom development build; it will not work in Expo Go.
Annotation 1

For a connected Android device:

```powershell
cd D:\Projects\fund-tracker\mobile

adb devices

npm.cmd ci

npx expo prebuild --clean

npx expo run:android --device
```

After installation, start the development client:

```powershell
npx expo start --dev-client
```

If using USB port forwarding:

```powershell
npm.cmd run adb:reverse
npx expo start --dev-client
```

Ensure `.env` contains a real Google Web Client ID:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Google Sign-In will work only in the custom development build installed by `npx expo run:android --device`, not Expo Go.

npx expo run:android --variant release
