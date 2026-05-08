import { openExternalUrl } from '../link';
import { Alert, Linking } from 'react-native';

describe('openExternalUrl', () => {
  const originalCanOpen = Linking.canOpenURL;
  const originalOpen = Linking.openURL;
  const originalAlert = Alert.alert;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    (Linking as any).canOpenURL = originalCanOpen;
    (Linking as any).openURL = originalOpen;
    (Alert as any).alert = originalAlert;
  });

  it('opens a supported URL', async () => {
    (Linking as any).canOpenURL = jest.fn().mockResolvedValue(true);
    (Linking as any).openURL = jest.fn().mockResolvedValue(undefined);
    (Alert as any).alert = jest.fn();

    await openExternalUrl('https://example.com');
    expect((Linking.openURL as jest.Mock)).toHaveBeenCalledWith('https://example.com');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('shows an alert when the URL is not supported', async () => {
    (Linking as any).canOpenURL = jest.fn().mockResolvedValue(false);
    (Linking as any).openURL = jest.fn().mockResolvedValue(undefined);
    (Alert as any).alert = jest.fn();

    await openExternalUrl('mailto:nobody@nowhere');
    expect((Linking.openURL as jest.Mock)).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('swallows errors and alerts the user', async () => {
    (Linking as any).canOpenURL = jest.fn().mockResolvedValue(true);
    (Linking as any).openURL = jest.fn().mockRejectedValue(new Error('boom'));
    (Alert as any).alert = jest.fn();

    await expect(openExternalUrl('https://example.com')).resolves.toBeUndefined();
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('no-ops on an empty URL', async () => {
    (Linking as any).canOpenURL = jest.fn();
    (Linking as any).openURL = jest.fn();
    (Alert as any).alert = jest.fn();

    await openExternalUrl('');
    expect((Linking.canOpenURL as jest.Mock)).not.toHaveBeenCalled();
    expect((Linking.openURL as jest.Mock)).not.toHaveBeenCalled();
  });
});
