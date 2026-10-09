import { registerPlugin, Capacitor } from '@capacitor/core';

// Register the native Android AppUpdate plugin
const NativeAppUpdate = registerPlugin('AppUpdate');

export const APP_METADATA = {
  name: 'U & I Cabs',
  tagline: 'Your Ride, Your Way',
  versionName: '1.0.0',
  versionCode: 1,
  packageName: 'com.cabbazar.cabapp'
};

/**
 * Retrieves the currently running application version information
 */
export async function getAppVersionInfo() {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeAppUpdate.getAppVersion();
      return {
        packageName: res.packageName || APP_METADATA.packageName,
        versionName: res.versionName || APP_METADATA.versionName,
        versionCode: res.versionCode || APP_METADATA.versionCode
      };
    } catch (_) {}
  }
  return { ...APP_METADATA };
}

/**
 * Checks Google Play for an official In-App Update
 */
export async function checkForAppUpdate() {
  const defaultInfo = {
    isNative: Capacitor.isNativePlatform(),
    updateAvailable: false,
    currentVersionName: APP_METADATA.versionName,
    currentVersionCode: APP_METADATA.versionCode,
    availableVersionName: null,
    availableVersionCode: null,
    isFlexibleAllowed: false,
    isImmediateAllowed: false,
    isDownloaded: false,
    updatePriority: 0,
    statusMessage: "You're using the latest version of U & I Cabs."
  };

  if (!Capacitor.isNativePlatform()) {
    return defaultInfo;
  }

  try {
    const res = await NativeAppUpdate.checkForUpdate();
    const isAvail = Boolean(res?.updateAvailable);
    const isDownloaded = Boolean(res?.isDownloaded);

    let displayNewVersion = null;
    if (res?.availableVersionCode) {
      displayNewVersion = `1.0.${res.availableVersionCode}`;
    } else if (isAvail) {
      displayNewVersion = '1.0.1';
    }

    return {
      isNative: true,
      updateAvailable: isAvail,
      currentVersionName: res?.currentVersionName || APP_METADATA.versionName,
      currentVersionCode: res?.currentVersionCode || APP_METADATA.versionCode,
      availableVersionName: displayNewVersion,
      availableVersionCode: res?.availableVersionCode || null,
      isFlexibleAllowed: Boolean(res?.isFlexibleAllowed),
      isImmediateAllowed: Boolean(res?.isImmediateAllowed),
      isDownloaded: isDownloaded,
      updatePriority: res?.updatePriority || 0,
      stalenessDays: res?.stalenessDays || 0,
      statusMessage: isDownloaded 
        ? "Update downloaded. Restart U & I Cabs to install the latest version."
        : isAvail 
          ? `New version available: ${displayNewVersion || '1.0.1'}`
          : "You're using the latest version of U & I Cabs."
    };
  } catch (err) {
    console.warn('[AppUpdate] Google Play check notice:', err);
    return {
      ...defaultInfo,
      statusMessage: "You're using the latest version of U & I Cabs."
    };
  }
}

/**
 * Initiates the Google Play In-App Update flow
 * @param {'FLEXIBLE' | 'IMMEDIATE'} type
 */
export async function startGooglePlayUpdate(type = 'FLEXIBLE') {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Google Play In-App Updates are available when running the installed Android application.');
  }
  return await NativeAppUpdate.startUpdate({ updateType: type });
}

/**
 * Completes the downloaded flexible update and restarts the app
 */
export async function completeGooglePlayUpdate() {
  if (!Capacitor.isNativePlatform()) return;
  return await NativeAppUpdate.completeUpdate();
}

/**
 * Listens for download progress
 */
export function onUpdateProgress(callback) {
  if (!Capacitor.isNativePlatform()) return { remove: () => {} };
  return NativeAppUpdate.addListener('appUpdateProgress', callback);
}

/**
 * Listens for completed background download
 */
export function onUpdateDownloaded(callback) {
  if (!Capacitor.isNativePlatform()) return { remove: () => {} };
  return NativeAppUpdate.addListener('appUpdateDownloaded', callback);
}
