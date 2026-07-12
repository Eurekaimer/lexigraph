import { expect, it } from 'vitest';
import { distance, initial, schedule } from './logic';

it('finds similar spelling', () => expect(distance('adapt', 'adopt')).toBe(1));
it('schedules a known word one day later', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  expect(schedule(initial('x', now), 2, now).due).toBe('2026-01-02T00:00:00.000Z');
});
it('records a lapse', () => expect(schedule(initial('x'), 0).lapses).toBe(1));
