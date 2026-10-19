import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import identity from '../../../config/identity.json';
import { alertPermissionStatus, ensureAlertPermission } from '../../notifications/timerAlert';
import { useAppData } from '../../state/AppData';
import { Button, Notice, Screen, Section, T } from '../../ui/components';

type Permission = 'granted' | 'denied' | 'undetermined' | 'unknown';

export default function SettingsScreen() {
  const { sessions, active, deleteAllData, profile } = useAppData();
  const [permission, setPermission] = useState<Permission>('unknown');
  const [deleted, setDeleted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      alertPermissionStatus().then(setPermission);
    }, []),
  );

  const confirmDelete = () =>
    Alert.alert(
      'Delete all your data?',
      'This removes every session, reflection and setting from this phone. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAllData();
            setDeleted(true);
          },
        },
      ],
    );

  const savedCount = sessions.length + (active ? 1 : 0);

  return (
    <Screen>
      <T variant="title">Settings</T>

      <Section title="Timer alerts">
        {permission === 'granted' ? (
          <T>On. You'll get an alert when a timer ends, even with the phone locked.</T>
        ) : permission === 'denied' ? (
          <>
            <T>Off. Timers still work, but you'll only see "Time's up" when you open the app.</T>
            <Button label="Open phone settings" variant="secondary" onPress={() => Linking.openSettings()} />
          </>
        ) : permission === 'undetermined' ? (
          <>
            <T>Not set up yet. Alerts let you know when time's up while the phone is locked.</T>
            <Button
              label="Allow alerts"
              variant="secondary"
              onPress={async () => {
                await ensureAlertPermission();
                setPermission(await alertPermissionStatus());
              }}
            />
          </>
        ) : null}
      </Section>

      <Section title="Your plan">
        <T>
          {profile?.status === 'set'
            ? 'Suggestions are based on your answers to the plan questions.'
            : "You haven't answered the plan questions yet."}
        </T>
        <Button
          label={profile?.status === 'set' ? 'Change my answers' : 'Answer the questions'}
          variant="secondary"
          onPress={() => router.push('/onboarding')}
        />
      </Section>

      <Section title="Your data">
        <T>
          Everything stays on this phone. There's no account and nothing is sent anywhere.{' '}
          {savedCount === 0 ? 'Nothing saved yet.' : `${savedCount} ${savedCount === 1 ? 'session' : 'sessions'} saved.`}
        </T>
        {deleted ? <Notice>All deleted. You're starting fresh.</Notice> : null}
        <Button label="Delete all my data" variant="danger" hint="Asks you to confirm first" onPress={confirmDelete} />
      </Section>

      <Section title={`About ${identity.displayName}`}>
        <T>
          {identity.displayName} is an independent practice app. It isn't connected to any TV show, competition or
          broadcaster. Challenges and tips are general advice, and nothing here can tell you whether you'd be picked for
          a competition or how you'd do in one.
        </T>
      </Section>
    </Screen>
  );
}
