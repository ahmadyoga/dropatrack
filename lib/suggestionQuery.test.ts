import { describe, it, expect } from 'vitest';
import { buildSuggestionQuery } from './suggestionQuery';

describe('buildSuggestionQuery', () => {
  it('returns empty string for no titles', () => {
    expect(buildSuggestionQuery([])).toBe('');
  });

  it('uses the bare artist name when one artist dominates (2+ of 3)', () => {
    expect(
      buildSuggestionQuery(['Nujabes - Feather', 'Nujabes - Luv Sic', 'J Dilla - Donuts'])
    ).toBe('Nujabes');
  });

  it('strips bracket/paren/pipe noise and emojis when joining', () => {
    expect(
      buildSuggestionQuery(['Nujabes - Feather [Official Audio]'])
    ).toBe('Nujabes Feather');
  });

  it('drops everything after a pipe and removes emojis', () => {
    expect(
      buildSuggestionQuery(['lofi hip hop 🎧 | No Copyright Music'])
    ).toBe('lofi hip hop');
  });

  it('uses the most-recent title (dashes flattened) when no artist dominates', () => {
    expect(
      buildSuggestionQuery(["Drake - God's Plan", 'Kendrick - HUMBLE', 'Travis - SICKO MODE'])
    ).toBe('Travis SICKO MODE');
  });

  it('ignores titles that clean to empty', () => {
    expect(buildSuggestionQuery(['🎵🎵🎵', '[Official Video]'])).toBe('');
  });
});
