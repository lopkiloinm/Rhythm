import { Alert, Linking } from 'react-native';

/**
 * Opens an external URL with a consistent failure behavior.
 *
 * - Swallows promise rejections so callers don't leak "unhandled promise
 *   rejection" warnings.
 * - If the device has no app to handle the URL, shows a friendly alert.
 */
export async function openExternalUrl(
  url: string,
  notFoundMessage = 'Could not open link. No app installed to handle this URL.',
): Promise<void> {
  if (!url) return;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Unable to open link', notFoundMessage);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Unable to open link', notFoundMessage);
  }
}
