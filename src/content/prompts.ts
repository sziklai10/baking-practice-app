// Loads and checks the placeholder interview prompts in /content.
import promptsFile from '../../content/interview-prompts.json';

export type InterviewPrompt = { id: string; text: string };

export function validatePrompts(raw: unknown): InterviewPrompt[] {
  const list = (raw as { prompts?: unknown })?.prompts;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('interview-prompts.json: "prompts" must be a non-empty list');
  }
  const seen = new Set<string>();
  return list.map((item, i) => {
    const p = item as Record<string, unknown>;
    if (typeof p?.id !== 'string' || !p.id.trim()) throw new Error(`interview-prompts.json item ${i}: "id" must be text`);
    if (seen.has(p.id)) throw new Error(`interview-prompts.json item ${i}: duplicate id ${p.id}`);
    seen.add(p.id);
    if (typeof p.text !== 'string' || !p.text.trim()) {
      throw new Error(`interview-prompts.json item ${i} (${p.id}): "text" must be non-empty text`);
    }
    return { id: p.id, text: p.text };
  });
}

export const prompts: InterviewPrompt[] = validatePrompts(promptsFile);

export function promptText(id: string): string {
  return prompts.find((p) => p.id === id)?.text ?? 'A question that has since been removed.';
}
