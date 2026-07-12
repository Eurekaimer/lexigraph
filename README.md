# Lexigraph

Lexigraph is a local-first vocabulary trainer for the English section of China's postgraduate entrance examination. It combines spaced review, keyboard-driven study, personal statistics, and a confusion graph for visually similar words.

Try the public demo at [eurekaimer.icu/lexigraph](https://www.eurekaimer.icu/lexigraph/).

## Features

- 5,530 syllabus words ordered by corpus frequency
- Four-level recall feedback and interval scheduling
- Keyboard-first study with customizable mappings
- Local JSON profiles with import and export
- Personal review statistics
- A confusion network based on spelling similarity and mistake history
- Optional Anki-compatible TSV export
- Offline-capable PWA demo

## Quick start

Node.js 22 or later is required.

    git clone https://github.com/Eurekaimer/lexigraph.git
    cd lexigraph
    npm install
    npm run local

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). Progress is saved automatically to profiles/default.json.

Use npm run dev for frontend development.

## Keyboard controls

| Action | Default key |
| --- | --- |
| Show or hide the answer | Space |
| Completely forgotten | A |
| Recalled with difficulty | S |
| Recalled normally | D |
| Recalled immediately | W |
| Study / Graph / Statistics / Data / Docs | 1–5 |

Physical key codes are used when available, so study controls continue to work while an input method is active. Mappings can be changed from the Data page.

## Profiles and portability

The local server writes progress to profiles/default.json. Profile files are excluded from Git. Use the Data page to export a portable JSON backup and import it on another computer.

The public demo stores progress in the visitor's browser and has no permission to change this repository.

## Anki

Anki export is disabled by default. Enable it on the Data page to export studied words as a UTF-8, tab-separated file. Import the file into Anki using the tab separator.

## Development

    npm test
    npm run build

The main extension points are StorageAdapter for persistence, ExportAdapter for output formats, and Keymap for input bindings. Scheduling, graph construction, and statistics remain independent modules.

The vocabulary build is reproducible and pinned to a specific upstream revision. Run npm run prebuild to prepare the dataset.

## Data and license

Vocabulary data is derived from [exam-data/NETEMVocabulary](https://github.com/exam-data/NETEMVocabulary) under CC BY-NC-SA 4.0. Application code is licensed under MIT.
