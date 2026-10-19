// The guided preparation plan: turns a baker's onboarding answers and recent
// sessions into a suggested next practice, with a plain reason for it.
// Simple, visible rules on purpose, so the suggestions are easy to explain
// and to change once real bakers have tried them.
import type { SessionKind } from './session';

export type Level = 'beginner' | 'intermediate' | 'confident';
export type Goal = 'tv' | 'local' | 'improve';

export type Profile = {
  experience: Level;
  goal: Goal;
  /** The most time they can usually give one practice session. */
  sessionMinutes: number;
  /** Equipment ids they have, beyond an oven, which is assumed. */
  equipment: string[];
  /** Skill ids they want to work on. */
  focus: string[];
};

export type PlanChallenge = {
  id: string;
  title: string;
  level: Level;
  durationMinutes: number;
  skills: string[];
  equipment: string[];
};

export type PastSession = { kind: SessionKind; challengeId: string | null; endedAt: number };

export type Suggestion = {
  kind: 'practice' | 'tent';
  challengeId: string;
  /** One short line on why, in the baker's own terms. */
  reason: string;
  /** Equipment they told us they don't have, when nothing else fitted. */
  missing: string[];
};

const LEVELS: Level[] = ['beginner', 'intermediate', 'confident'];
/** Equipment everyone is assumed to have. */
export const ASSUMED_EQUIPMENT = ['oven'];
/** How many recent sessions count as "recent" for variety. */
const RECENT = 3;

type Scored = { challenge: PlanChallenge; score: number; reasons: string[]; missing: string[] };

function score(
  c: PlanChallenge,
  profile: Profile,
  recentIds: string[],
  everDone: Set<string>,
  skillLabel: (id: string) => string,
): Scored | null {
  const levelGap = LEVELS.indexOf(c.level) - LEVELS.indexOf(profile.experience);
  // Two steps up is too big a jump to suggest.
  if (levelGap >= 2 || c.durationMinutes > profile.sessionMinutes) return null;

  const owned = new Set([...ASSUMED_EQUIPMENT, ...profile.equipment]);
  const missing = c.equipment.filter((e) => !owned.has(e));

  let s = 0;
  const reasons: string[] = [];
  const matched = c.skills.filter((k) => profile.focus.includes(k));
  if (matched.length) {
    s += 2 * matched.length;
    reasons.push(`works on ${matched.slice(0, 2).map((k) => skillLabel(k).toLowerCase()).join(' and ')}`);
  }
  if (levelGap === 0) {
    s += 3;
    reasons.push('suits where you are now');
  } else if (levelGap === 1) {
    s += 1;
    reasons.push('a bit of a stretch');
  } else {
    s += 1;
  }
  if (recentIds.includes(c.id)) s -= 4;
  else if (!everDone.has(c.id)) {
    s += 1;
    if (reasons.length < 2) reasons.push("you haven't tried it yet");
  }
  return { challenge: c, score: s, reasons, missing };
}

function sentence(reasons: string[], c: PlanChallenge, durationLabel: (m: number) => string): string {
  const parts = reasons.slice(0, 2);
  const fits = `fits in ${durationLabel(c.durationMinutes)}`;
  const text = parts.length ? `${parts.join(', ')}, and ${fits}` : fits;
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

/**
 * Ranked suggestions, best first. Challenges needing equipment the baker
 * doesn't have only appear when nothing else fits, and then say what's missing.
 */
export function suggest(
  profile: Profile,
  challenges: PlanChallenge[],
  history: PastSession[],
  helpers: { skillLabel: (id: string) => string; durationLabel: (m: number) => string },
): Suggestion[] {
  const recent = [...history].sort((a, b) => b.endedAt - a.endedAt).slice(0, RECENT);
  const recentIds = recent.map((h) => h.challengeId).filter((id): id is string => !!id);
  const everDone = new Set(history.map((h) => h.challengeId).filter((id): id is string => !!id));

  const scored = challenges
    .map((c) => score(c, profile, recentIds, everDone, helpers.skillLabel))
    .filter((x): x is Scored => x !== null)
    .sort((a, b) => b.score - a.score || a.challenge.durationMinutes - b.challenge.durationMinutes);

  const usable = scored.filter((x) => x.missing.length === 0);
  const pool = usable.length ? usable : scored;

  const suggestions: Suggestion[] = pool.map((x) => ({
    kind: 'practice',
    challengeId: x.challenge.id,
    reason: sentence(x.reasons, x.challenge, helpers.durationLabel),
    missing: x.missing,
  }));

  // Someone preparing to talk on camera, or who asked to practise talking,
  // gets a Tent Simulation first unless they've done one recently.
  const wantsTalking = profile.goal === 'tv' || profile.focus.includes('talking');
  const recentTent = recent.some((h) => h.kind === 'tent');
  if (wantsTalking && !recentTent && suggestions.length) {
    const top = suggestions[0];
    const why = profile.focus.includes('talking')
      ? 'You want to get better at talking about your bakes'
      : "You're preparing for a TV-style competition";
    suggestions.unshift({
      ...top,
      kind: 'tent',
      reason: `${why}, so try it with surprise interview questions.`,
    });
  }
  return suggestions;
}
