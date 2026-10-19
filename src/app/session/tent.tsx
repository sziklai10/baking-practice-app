import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sessionTitle } from '../../content/challenges';
import { promptText } from '../../content/prompts';
import { PROMPT_RULES } from '../../domain/tent';
import { remainingMs, timerStatus } from '../../domain/timer';
import { useAppData } from '../../state/AppData';
import { Button, Notice, T } from '../../ui/components';
import { STATUS_LABELS, TimerFace, sessionStyles, useSessionExit, useTimerCues } from '../../ui/session';
import { radius, space, useColors } from '../../ui/theme';
import { useNow } from '../../ui/useNow';

export default function TentScreen() {
  useKeepAwake();
  const c = useColors();
  const { active, pause, resume, syncTent, closePrompt, setPromptsMuted } = useAppData();
  const tent = active?.tent;
  // Keep ticking while a prompt is up, even if it paused the clock, so it can fade on time.
  const ticking = !!active && active.endedAt === null && (active.timer.pausedAt === null || !!tent?.current);
  const now = useNow(ticking);

  const status = active ? timerStatus(active.timer, now) : 'idle';
  const remaining = active ? remainingMs(active.timer, now) : 0;
  useTimerCues(status, remaining);
  const { goToReflection, confirmStop } = useSessionExit(status);

  // Every redraw, bring prompts up to date: show one that's due, fade one that's been ignored.
  useEffect(() => {
    if (!active?.tent || active.endedAt !== null) return;
    syncTent().then((shown) => {
      if (!shown) return;
      if (active.tent?.vibrate) Vibration.vibrate(300);
      AccessibilityInfo.announceForAccessibility(`Question: ${promptText(shown)}`);
    });
    // Only the clock should drive this; the session object changes as a result of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  if (!active || !tent || active.endedAt !== null) {
    return (
      <SafeAreaView style={[sessionStyles.fill, { backgroundColor: c.background, padding: space.md, gap: space.lg }]}>
        <T variant="title">No simulation running</T>
        <Button label="Back to the start" variant="secondary" onPress={() => router.dismissTo('/')} />
      </SafeAreaView>
    );
  }

  const finished = status === 'finished';
  const promptsOn = tent.frequency !== 'off';
  const current = tent.current;
  const fadesIn = current ? Math.max(0, Math.ceil((current.shownAt + PROMPT_RULES.visibleMs - now) / 1000)) : 0;

  return (
    <SafeAreaView style={[sessionStyles.fill, { backgroundColor: c.background }]}>
      <View style={[sessionStyles.fill, { padding: space.md, gap: space.md }]}>
        <View style={{ gap: space.xs }}>
          <T variant="heading">{sessionTitle('tent', active.challengeId, active.timer.durationMs)}</T>
          <T muted>
            {STATUS_LABELS[status]}
            {promptsOn ? (tent.muted ? ' · Questions muted' : ' · Questions on') : ' · No questions'}
          </T>
        </View>

        <TimerFace remaining={remaining} status={status} />

        {finished ? (
          <Notice>Time's up. Stop when it's safe to, then come back and see how it went.</Notice>
        ) : current ? (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.prompt, { backgroundColor: c.surface, borderColor: c.accent }]}
          >
            <T variant="small" muted>
              Question · fades in {fadesIn}s{current.autoPaused ? ' · clock paused' : ''}
            </T>
            <T variant="heading">{promptText(current.promptId)}</T>
            <T muted>Answer out loud if you can. Hands full? Ignore it.</T>
            <View style={sessionStyles.row}>
              <Button label="Done" variant="secondary" onPress={() => closePrompt('answered')} style={sessionStyles.fill} />
              <Button label="Skip" variant="secondary" onPress={() => closePrompt('skipped')} style={sessionStyles.fill} />
            </View>
          </View>
        ) : null}

        <View style={{ gap: space.sm }}>
          {finished ? (
            <Button label="Reflect now" onPress={goToReflection} />
          ) : (
            <>
              <Button
                label={status === 'paused' ? 'Resume' : 'Pause'}
                hint={status === 'paused' ? 'Starts the countdown again' : 'Stops the countdown until you resume'}
                onPress={status === 'paused' ? resume : pause}
              />
              <View style={sessionStyles.row}>
                {promptsOn ? (
                  <Button
                    label={tent.muted ? 'Unmute' : 'Mute questions'}
                    variant="secondary"
                    hint={tent.muted ? 'Questions will start again' : 'Holds back all questions until you unmute'}
                    onPress={() => setPromptsMuted(!tent.muted)}
                    style={sessionStyles.fill}
                  />
                ) : null}
                <Button label="Stop" variant="secondary" hint="Asks before stopping" onPress={confirmStop} style={sessionStyles.fill} />
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  prompt: { borderWidth: 3, borderRadius: radius.lg, padding: space.md, gap: space.sm },
});
