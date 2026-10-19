// Walks through a Tent Simulation in a simulated app with a fake clock:
// setup, questions arriving, answering, ignoring, muting, and the reflection recap.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Alert, Vibration } from 'react-native';
import type { AlertButton } from 'react-native';
import { KEYS } from '../storage/storage';

const MIN = 60_000;

const wait = (ms = 300) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

function answerAlertWith(label: string) {
  jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _msg, buttons?: AlertButton[]) => {
    buttons?.find((b) => b.text === label)?.onPress?.();
  });
}

const questionShowing = () => screen.queryByText(/^Question · fades in/);

/** Moves the clock on in 10-second steps until a question appears. Returns the minutes waited. */
async function waitForQuestion(maxMinutes: number) {
  for (let s = 0; s < maxMinutes * 6; s++) {
    await wait(10_000);
    if (questionShowing()) return s / 6;
  }
  throw new Error(`No question within ${maxMinutes} minutes`);
}

async function setUpTent({ pauseOnPrompt = false } = {}) {
  await renderRouter('./src/app', { initialUrl: '/' });
  await wait();
  await fireEvent.press(screen.getByRole('button', { name: 'Set one up' }));
  await wait();
  await fireEvent.press(screen.getByRole('radio', { name: '1 hr' }));
  await fireEvent.press(screen.getByRole('radio', { name: /^Medium/ }));
  if (pauseOnPrompt) await fireEvent.press(screen.getByRole('switch', { name: 'Pause the clock during a question' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Start the 1 hr clock' }));
  await wait();
}

let vibrate: jest.SpyInstance;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
});

it('runs a simulation with questions, then recaps them in the reflection', async () => {
  await setUpTent();
  expect(screen.getByText('Running · Questions on')).toBeOnTheScreen();

  // Medium: nothing in the first 5 minutes, then one within the next 10.
  await wait(4 * MIN);
  expect(questionShowing()).toBeNull();
  const waited = await waitForQuestion(12);
  expect(waited).toBeLessThanOrEqual(11);
  expect(vibrate).toHaveBeenCalledWith(300);
  // The clock keeps going by default.
  expect(screen.getByText(/^Running/)).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  await wait();
  expect(questionShowing()).toBeNull();

  // Ignore the next one: it fades away by itself.
  await waitForQuestion(16);
  await wait(61_000);
  expect(questionShowing()).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: 'Mute questions' }));
  await wait();
  expect(screen.getByText('Running · Questions muted')).toBeOnTheScreen();
  for (let i = 0; i < 6 * 16; i++) await wait(10_000);
  expect(questionShowing()).toBeNull();

  answerAlertWith('Stop and reflect');
  await fireEvent.press(screen.getByRole('button', { name: 'Stop' }));
  await wait();
  expect(screen.getByText('Questions you got')).toBeOnTheScreen();
  expect(screen.getByText('Answered')).toBeOnTheScreen();
  expect(screen.getByText('Let it pass')).toBeOnTheScreen();
  expect(screen.getByText(/held back while muted/)).toBeOnTheScreen();

  await fireEvent.changeText(screen.getByLabelText('Anything to say better next time?'), 'Slow down');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await wait();

  const [record] = JSON.parse((await AsyncStorage.getItem(KEYS.sessions))!).data;
  expect(record.kind).toBe('tent');
  expect(record.title).toBe('Tent Simulation, 1 hr');
  expect(record.promptNotes).toBe('Slow down');
  expect(record.prompts.map((p: { outcome: string }) => p.outcome).slice(0, 2)).toEqual(['answered', 'faded']);
  expect(record.prompts.every((p: { text: string }) => p.text.length > 0)).toBe(true);

  // The setup is remembered for next time.
  const settings = JSON.parse((await AsyncStorage.getItem(KEYS.tentSettings))!).data;
  expect(settings).toMatchObject({ durationMinutes: 60, frequency: 'medium', pauseOnPrompt: false });
});

it('pauses the clock while a question shows when asked to, and picks up again after', async () => {
  await setUpTent({ pauseOnPrompt: true });
  await waitForQuestion(16);
  expect(screen.getByText(/clock paused/)).toBeOnTheScreen();
  const frozen = screen.getByRole('timer').props.children;
  await wait(20_000);
  expect(screen.getByRole('timer').props.children).toBe(frozen);

  await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
  await wait(5_000);
  expect(screen.getByText(/^Running/)).toBeOnTheScreen();
  expect(screen.getByRole('timer').props.children).not.toBe(frozen);
});

it('offers a Tent Simulation from a challenge, with its time filled in', async () => {
  await renderRouter('./src/app', { initialUrl: '/challenge/even-shortbread' });
  await wait();
  await fireEvent.press(screen.getByRole('button', { name: 'Do it as a Tent Simulation' }));
  await wait();
  expect(screen.getByRole('radio', { name: /Twelve identical shortbread fingers/ })).toBeChecked();
  expect(screen.getByRole('radio', { name: '1 hr' })).toBeChecked();
});
