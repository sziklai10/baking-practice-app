// Local "time's up" notifications. Scheduled for the timer's exact end time,
// so they fire even if the app is suspended or the phone is locked. Every
// call is best-effort: if permission is refused or the platform fails, the
// in-app "Time's up" screen still works.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, SchedulableTriggerInputTypes } from 'expo-notifications';

const CHANNEL_ID = 'timers';

// When the app is open, the session screen shows its own "Time's up" state,
// so don't stack a banner on top of it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let channelReady: Promise<unknown> | null = null;

function ensureChannel() {
  if (Platform.OS !== 'android') return Promise.resolve();
  channelReady ??= Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Timers',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 400, 200, 400],
  });
  return channelReady;
}

/** Asks for permission only if the person hasn't been asked yet. Returns whether alerts can be shown. */
export async function ensureAlertPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

export async function alertPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
    if (granted) return 'granted';
    return canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function scheduleTimeUp(at: number, title: string): Promise<string | null> {
  if (at <= Date.now()) return null;
  try {
    await ensureChannel();
    return await Notifications.scheduleNotificationAsync({
      content: { title: "Time's up", body: `${title}: stop when it's safe, then come and see how it went.` },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
    });
  } catch {
    return null;
  }
}

export async function cancelAlert(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Nothing useful to do; a stray alert is harmless.
  }
}

export async function cancelAllAlerts(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // As above.
  }
}
