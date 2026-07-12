import { expect, it } from 'vitest';
import { actionForKey, defaultKeymap, displayKey, normalizeKey } from './keymap';
it('normalizes space', () => expect(normalizeKey('Space')).toBe(' '));
it('maps WASD', () => { expect(actionForKey(defaultKeymap, 'A')).toBe('forgot'); expect(actionForKey(defaultKeymap, 'w')).toBe('easy'); });
it('displays space', () => expect(displayKey(' ')).toBe('Space'));
