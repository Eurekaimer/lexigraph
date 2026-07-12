export type Word = { id:string; word:string; phonetic:string; meaning:string; example:string; frequency?:number; category?:string };
export type Rating = 0|1|2|3;
export type Review = { wordId:string; due:string; interval:number; ease:number; repetitions:number; lapses:number };
export type HistoryEvent = { id?:string; date:string; wordId:string; rating:Rating; previousReview?:Review };
export type State = { reviews:Record<string,Review>; mistakes:{from:string;to:string;count:number}[]; history:HistoryEvent[] };
export type Action = 'reveal'|'forgot'|'hard'|'good'|'easy'|'undo'|'study'|'history'|'graph'|'stats'|'data'|'docs'|'help';
export type Keymap = Record<Action,string>;
