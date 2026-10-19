// The guided plan in a simulated app: the first-run welcome, the five
// questions, and the suggestion they lead to on the Practise tab.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { KEYS } from '../storage/storage';

jest.setTimeout(60_000);

const wait = (ms = 300) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await wait();
};
const pick = async (role: 'radio' | 'checkbox', name: string) => {
  await fireEvent.press(screen.getByRole(role, { name }));
  await wait();
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('welcomes a new baker and can be skipped', async () => {
  await renderRouter('./src/app', { initialUrl: '/' });
  await wait();
  expect(screen.getByText('Welcome to Proof')).toBeOnTheScreen();

  await press('Skip for now');
  expect(screen.getByText('Not sure where to start?')).toBeOnTheScreen();
  expect(JSON.parse((await AsyncStorage.getItem(KEYS.profile))!).data).toEqual({ status: 'skipped' });
});

it('asks five questions and suggests a next practice', async () => {
  await renderRouter('./src/app', { initialUrl: '/' });
  await wait();
  await press('Set up my plan');

  expect(screen.getByText('Step 1 of 5')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  await pick('radio', 'Fairly new to it');
  await press('Next');

  await pick('radio', 'Just getting better');
  await press('Next');

  await pick('radio', 'Up to two hours');
  // Back keeps earlier answers.
  await press('Back');
  expect(screen.getByRole('radio', { name: 'Just getting better' })).toBeChecked();
  await press('Next');
  await press('Next');

  expect(screen.getByText('Step 4 of 5')).toBeOnTheScreen();
  await pick('checkbox', 'Kitchen scales');
  await pick('checkbox', 'Baking sheet');
  await press('Next');

  await pick('checkbox', 'Biscuits');
  await press('See my plan');

  // Shortbread suits a beginner who wants to work on biscuits and has the kit for it.
  expect(screen.getByText('Your next practice')).toBeOnTheScreen();
  // Once in the plan card, once in the full list below it.
  expect(screen.getAllByText('Twelve identical shortbread fingers')).toHaveLength(2);
  expect(
    screen.getByText('Works on biscuits, suits where you are now, and fits in 1 hr.'),
  ).toBeOnTheScreen();

  const saved = JSON.parse((await AsyncStorage.getItem(KEYS.profile))!).data;
  expect(saved.profile).toEqual({
    experience: 'beginner',
    goal: 'improve',
    sessionMinutes: 120,
    equipment: ['scales', 'baking-sheet'],
    focus: ['biscuits'],
  });

  await press('Have a look');
  expect(screen.getByRole('button', { name: 'Start the 1 hr timer' })).toBeOnTheScreen();
});

it('points someone heading for TV at a Tent Simulation', async () => {
  await AsyncStorage.setItem(
    KEYS.profile,
    JSON.stringify({
      schemaVersion: 1,
      data: {
        status: 'set',
        updatedAt: 1,
        profile: { experience: 'beginner', goal: 'tv', sessionMinutes: 60, equipment: ['scales', 'baking-sheet'], focus: [] },
      },
    }),
  );
  await renderRouter('./src/app', { initialUrl: '/' });
  await wait();
  expect(screen.getByText('Tent Simulation: Twelve identical shortbread fingers')).toBeOnTheScreen();

  await press('Set it up');
  // The setup screen opens with the suggested bake already chosen.
  expect(screen.getByRole('radio', { name: /Twelve identical shortbread fingers/ })).toBeChecked();
});

it('lets the baker change their answers from Settings, starting from what they said before', async () => {
  await AsyncStorage.setItem(
    KEYS.profile,
    JSON.stringify({
      schemaVersion: 1,
      data: {
        status: 'set',
        updatedAt: 1,
        profile: { experience: 'confident', goal: 'local', sessionMinutes: 180, equipment: [], focus: ['bread'] },
      },
    }),
  );
  await renderRouter('./src/app', { initialUrl: '/settings' });
  await wait();
  await press('Change my answers');
  expect(screen.getByRole('radio', { name: 'I bake all the time' })).toBeChecked();
  // Skipping is only offered before the questions have been answered once.
  expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
});
