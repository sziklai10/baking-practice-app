// Loads and checks the placeholder content in /content. A malformed file
// throws on startup with a message naming the problem, so a bad content edit
// fails loudly instead of showing a half-broken screen.
import challengesFile from '../../content/challenges.json';
import equipmentFile from '../../content/equipment.json';
import skillsFile from '../../content/skills.json';
import { durationLabel } from '../domain/format';

export type Level = 'beginner' | 'intermediate' | 'confident';

export type Challenge = {
  id: string;
  title: string;
  summary: string;
  level: Level;
  durationMinutes: number;
  skills: string[];
  equipment: string[];
  goal: string;
  prepNotes: string[];
  safetyNotes: string[];
  reflectionHints: string[];
};

const LEVELS: readonly Level[] = ['beginner', 'intermediate', 'confident'];

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Getting started',
  intermediate: 'Building up',
  confident: 'Stretching yourself',
};

export function validateChallenges(raw: unknown, equipmentIds: Set<string>, skillIds?: Set<string>): Challenge[] {
  const list = (raw as { challenges?: unknown })?.challenges;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('challenges.json: "challenges" must be a non-empty list');
  }
  const seen = new Set<string>();
  return list.map((item, i) => {
    const c = item as Record<string, unknown>;
    const where = `challenges.json item ${i} (${String(c?.id ?? 'no id')})`;
    const str = (key: string) => {
      if (typeof c[key] !== 'string' || !(c[key] as string).trim()) {
        throw new Error(`${where}: "${key}" must be non-empty text`);
      }
      return c[key] as string;
    };
    const strList = (key: string, allowEmpty = false) => {
      const v = c[key];
      if (!Array.isArray(v) || v.some((s) => typeof s !== 'string') || (!allowEmpty && v.length === 0)) {
        throw new Error(`${where}: "${key}" must be a list of text`);
      }
      return v as string[];
    };
    const id = str('id');
    if (seen.has(id)) throw new Error(`${where}: duplicate id`);
    seen.add(id);
    if (!LEVELS.includes(c.level as Level)) {
      throw new Error(`${where}: "level" must be one of ${LEVELS.join(', ')}`);
    }
    const duration = c.durationMinutes;
    if (typeof duration !== 'number' || !Number.isInteger(duration) || duration < 5 || duration > 600) {
      throw new Error(`${where}: "durationMinutes" must be a whole number from 5 to 600`);
    }
    const skills = strList('skills');
    const unknownSkills = skillIds ? skills.filter((k) => !skillIds.has(k)) : [];
    if (unknownSkills.length) throw new Error(`${where}: unknown skills ${unknownSkills.join(', ')}`);
    const equipment = strList('equipment');
    const unknown = equipment.filter((e) => !equipmentIds.has(e));
    if (unknown.length) throw new Error(`${where}: unknown equipment ${unknown.join(', ')}`);
    return {
      id,
      title: str('title'),
      summary: str('summary'),
      level: c.level as Level,
      durationMinutes: duration,
      skills,
      equipment,
      goal: str('goal'),
      prepNotes: strList('prepNotes'),
      safetyNotes: strList('safetyNotes', true),
      reflectionHints: strList('reflectionHints', true),
    };
  });
}

export const equipmentLabels: Record<string, string> = equipmentFile.equipment;
export const skillLabels: Record<string, string> = skillsFile.skills;
export const challenges: Challenge[] = validateChallenges(
  challengesFile,
  new Set(Object.keys(equipmentLabels)),
  new Set(Object.keys(skillLabels)),
);

export function findChallenge(id: string | null | undefined): Challenge | undefined {
  return id ? challenges.find((c) => c.id === id) : undefined;
}

/** How a session is named on screen and in the progress record. */
export function sessionTitle(kind: 'practice' | 'tent', challengeId: string | null, durationMs: number): string {
  const challenge = findChallenge(challengeId)?.title;
  if (kind === 'practice') return challenge ?? 'Practice session';
  return challenge ? `Tent Simulation: ${challenge}` : `Tent Simulation, ${durationLabel(Math.round(durationMs / 60_000))}`;
}
