import { expect, it } from 'vitest';
import { recallRate } from './stats';
import type { State } from './types';
it('computes recall rate', () => {
  const state:State={reviews:{},mistakes:[],history:[{date:'2026-01-01',wordId:'a',rating:0},{date:'2026-01-01',wordId:'b',rating:2},{date:'2026-01-01',wordId:'c',rating:3}]};
  expect(recallRate(state)).toBeCloseTo(2/3);
});
