import { expect, it } from 'vitest';
import { actionForEvent, actionForKey, defaultKeymap, displayKey, keymapConflicts, normalizeKey } from './keymap';
it('normalizes space', () => expect(normalizeKey('Space')).toBe(' '));
it('maps WASD', () => { expect(actionForKey(defaultKeymap, 'A')).toBe('forgot'); expect(actionForKey(defaultKeymap, 'w')).toBe('easy'); });
it('displays space', () => expect(displayKey(' ')).toBe('Space'));
it('uses physical codes under an IME', () => expect(actionForEvent(defaultKeymap, 'Process', 'KeyA')).toBe('forgot'));
it('ignores letter case',()=>{expect(actionForEvent(defaultKeymap,'A','KeyA')).toBe('forgot');expect(actionForEvent(defaultKeymap,'S','KeyS')).toBe('hard');expect(actionForEvent(defaultKeymap,'d','KeyD')).toBe('good');expect(actionForEvent(defaultKeymap,'W','KeyW')).toBe('easy')});
it('detects duplicate mappings', () => expect(keymapConflicts({ ...defaultKeymap, hard:'a' })).toContainEqual(['forgot','hard']));
