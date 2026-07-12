import { access, mkdir, writeFile } from 'node:fs/promises';

const output = 'public/data/netem.json';
try {
  await access(output);
  console.log('Vocabulary already prepared');
  process.exit(0);
} catch { /* Fetch the pinned upstream revision below. */ }

const url = 'https://raw.githubusercontent.com/exam-data/NETEMVocabulary/70dc6b68c855f21e666a7a291ff8ead5ca1f7b44/netem_full_list.json';
const response = await fetch(url);
if (!response.ok) throw new Error(`Vocabulary download failed: ${response.status}`);
const source = (await response.json())['5530考研词汇词频排序表'];
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
await writeFile(output, JSON.stringify({ source:url, license:'CC BY-NC-SA 4.0', words }));
console.log(`Prepared ${words.length} vocabulary entries`);
