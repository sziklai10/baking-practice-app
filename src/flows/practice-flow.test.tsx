// Walks through the practice flow in a simulated app: pick a challenge, start,
// pause, resume, stop, reflect, and see it on the home screen. The router's
// test harness uses Jest's fake timers, which also control Date.now(), so
// the clock can be moved forward deliberately.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import type { AlertButton } from 'react-native';
import { KEYS } from '../storage/storage';

const Notifications = jest.requireMock('expo-notifications');
const MIN = 60_000;

// Loading the whole app is slow on a cold cache, and these walk through long simulated sessions.
jest.setTimeout(60_000);


/** Lets pending saves and renders finish, moving the clock on by `ms`. */
const wait = (ms = 300) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

/** Makes the next Alert.alert press the button with this label. */
function answerAlertWith(label: string) {
  jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _msg, buttons?: AlertButton[]) => {
    buttons?.find((b) => b.text === label)?.onPress?.();
  });
}

async function startShortbread() {
  await renderRouter('./src/app', { initialUrl: '/' });
  await wait();
  await fireEvent.press(screen.getByText('Twelve identical shortbread fingers'));
  await wait();
  expect(screen.getByText('General advice')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Start the 1 hr timer' }));
  await wait();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

it('runs a practice session from start to reflection', async () => {
  await startShortbread();
  expect(screen.getByText('Running')).toBeOnTheScreen();
  expect(screen.getByText('1:00:00')).toBeOnTheScreen();

  // The "time's up" alert is scheduled for the end time, an hour from the start.
  const at = Notifications.scheduleNotificationAsync.mock.calls[0][0].trigger.date;
  expect(at - Date.now()).toBeGreaterThan(59 * MIN);

  await wait(10 * MIN);
  expect(screen.getByText('50:00')).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('button', { name: 'Pause' }));
  await wait();
  expect(screen.getByRole('button', { name: 'Resume' })).toBeOnTheScreen();
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('alert-1');

  // Paused time doesn't count, and the pause is saved straight away.
  await wait(30 * MIN);
  expect(screen.getByText('50:00')).toBeOnTheScreen();
  const saved = JSON.parse((await AsyncStorage.getItem(KEYS.activeSession))!);
  expect(saved.data.timer.pausedAt).not.toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: 'Resume' }));
  await wait();
  expect(screen.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);

  answerAlertWith('Stop and reflect');
  await fireEvent.press(screen.getByRole('button', { name: 'Stop' }));
  await wait();
  expect(screen.getByText(/You stopped with 50 minutes to spare/)).toBeOnTheScreen();

  await fireEvent.changeText(screen.getByLabelText('What went well?'), 'Even colour');
  await fireEvent.changeText(screen.getByLabelText('What would you change next time?'), 'Use rolling guides');
  await fireEvent.press(screen.getByRole('radio', { name: 'A bit flustered' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await wait();

  expect(screen.getByText('Last time')).toBeOnTheScreen();
  expect(screen.getByText('Next time: Use rolling guides')).toBeOnTheScreen();

  const sessions = JSON.parse((await AsyncStorage.getItem(KEYS.sessions))!).data;
  expect(sessions).toHaveLength(1);
  expect(sessions[0]).toMatchObject({
    wentWell: 'Even colour',
    improveNext: 'Use rolling guides',
    feeling: 'flustered',
    ranToTime: false,
  });
  expect(await AsyncStorage.getItem(KEYS.activeSession)).toBeNull();
});

it("shows time's up when the timer runs out and records a full session", async () => {
  await startShortbread();
  await wait(61 * MIN);
  expect(screen.getAllByText("Time's up").length).toBeGreaterThan(0);

  await fireEvent.press(screen.getByRole('button', { name: 'Reflect now' }));
  await wait();
  expect(screen.getByText('You went the full 1 hour.')).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await wait();
  const [record] = JSON.parse((await AsyncStorage.getItem(KEYS.sessions))!).data;
  expect(record).toMatchObject({ ranToTime: true, activeMs: 60 * MIN, wentWell: '', feeling: null });
});

it('can discard a session without saving it', async () => {
  await startShortbread();
  answerAlertWith('Discard it');
  await fireEvent.press(screen.getByRole('button', { name: 'Stop' }));
  await wait();
  expect(screen.getByText('Pick a challenge')).toBeOnTheScreen();
  expect(await AsyncStorage.getItem(KEYS.activeSession)).toBeNull();
  expect(await AsyncStorage.getItem(KEYS.sessions)).toBeNull();
});

it('deletes all data from settings after confirming', async () => {
  await AsyncStorage.setItem(
    KEYS.sessions,
    JSON.stringify({
      schemaVersion: 1,
      data: [{ id: 'x', challengeId: 'even-shortbread', title: 'Old', startedAt: 1, endedAt: 2, improveNext: '' }],
    }),
  );
  await renderRouter('./src/app', { initialUrl: '/settings' });
  await wait();
  expect(screen.getByText(/1 session saved/)).toBeOnTheScreen();

  answerAlertWith('Delete everything');
  await fireEvent.press(screen.getByRole('button', { name: 'Delete all my data' }));
  await wait();

  expect(screen.getByText("All deleted. You're starting fresh.")).toBeOnTheScreen();
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
  expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
});
