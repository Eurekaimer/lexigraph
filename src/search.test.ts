import{expect,it}from'vitest';import{searchWords}from'./search';import type{Word}from'./types';
const words:Word[]=[{id:'adapt',word:'adapt',phonetic:'',meaning:'适应',example:'',frequency:10},{id:'adopt',word:'adopt',phonetic:'',meaning:'采用',example:'',frequency:9},{id:'adapter',word:'adapter',phonetic:'',meaning:'适配器',example:'',frequency:1}];
it('ranks exact matches first',()=>expect(searchWords(words,'adapt')[0].word.id).toBe('adapt'));
it('supports prefixes',()=>expect(searchWords(words,'ada').map(x=>x.word.id)).toEqual(['adapt','adapter']));
it('tolerates a typo',()=>expect(searchWords(words,'adpat').map(x=>x.word.id)).toContain('adapt'));
