import { readFile, writeFile, mkdir } from 'node:fs/promises';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/build-vocabulary.mjs /path/to/netem_full_list.json');
const source = JSON.parse(await readFile(input, 'utf8'))['5530考研词汇词频排序表'];
const words = source.map(item => ({
  id: item['单词'].toLowerCase(),
  word: item['单词'],
  phonetic: '',
  meaning: item['释义'] ?? '',
  example: '',
  frequency: item['词频'] ?? 0,
  category: [item['分类'], item['子分类']].filter(Boolean).join(' / '),
  variants: item['其他拼写'],
}));
await mkdir('public/data', { recursive: true });
await writeFile('public/data/netem.json', JSON.stringify({ source: 'exam-data/NETEMVocabulary v7.1', license: 'CC BY-NC-SA 4.0', words }));
console.log(`Wrote ${words.length} words`);
