import { prompts, validatePrompts } from './prompts';

describe('interview prompt content', () => {
  it('ships content that passes validation', () => {
    expect(prompts.length).toBeGreaterThan(5);
  });

  it.each([
    ['missing list', {}],
    ['empty text', { prompts: [{ id: 'a', text: '' }] }],
    ['duplicate id', { prompts: [{ id: 'a', text: 'x' }, { id: 'a', text: 'y' }] }],
  ])('rejects %s', (_label, raw) => {
    expect(() => validatePrompts(raw)).toThrow();
  });
});
