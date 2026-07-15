# Lexigraph

Lexigraph is a local-first vocabulary trainer for the English section of China's postgraduate entrance examination. It combines spaced review, keyboard-driven study, personal statistics, and a confusion graph for visually similar words.

Try the public demo at [eurekaimer.icu/lexigraph](https://www.eurekaimer.icu/lexigraph/).

## Features

- 5,530 syllabus words ordered by corpus frequency
- Four-level recall feedback and interval scheduling
- Keyboard-first study with customizable mappings
- Responsive interface for desktop, tablet, and mobile screens
- Local JSON profiles with import and export
- Personal review statistics
- Goal-based daily quotas with optional 20-word extra groups
- A confusion network based on spelling similarity and mistake history
- Optional Anki-compatible TSV export
- Offline-capable PWA demo
- Native Linux terminal interface with Vim-style navigation
- Reproducible Nix Flake package and NixOS module

## Quick start

Node.js 22 or later is required.

    git clone https://github.com/Eurekaimer/lexigraph.git
    cd lexigraph
    npm install
    npm run local

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). Progress is saved automatically to profiles/default.json.

Use npm run dev for frontend development.

## Terminal interface on NixOS

Run the TUI directly from this repository without installing it:

    nix run github:Eurekaimer/lexigraph

Or install the `lexigraph` command into the current user's Nix profile:

    nix profile install github:Eurekaimer/lexigraph
    lexigraph

This is an imperative user-profile installation. It persists without changing `configuration.nix`, but it is not managed by `nixos-rebuild`.

For a declarative Flake-based NixOS configuration, first declare the source in your host flake:

    inputs.lexigraph.url = "github:Eurekaimer/lexigraph";

Pass `inputs` through `specialArgs`, then add one import to `configuration.nix`:

    imports = [ inputs.lexigraph.nixosModules.default ];

The module adds `lexigraph` to `environment.systemPackages`. See the complete Chinese guide, including non-Flake configuration, updates, removal, and future nixpkgs submission, in [docs/nixos.md](docs/nixos.md).

The TUI profile is stored at `$XDG_DATA_HOME/lexigraph/profile.json`, or `~/.local/share/lexigraph/profile.json` when `XDG_DATA_HOME` is unset. Writes are atomic and use `0600` permissions. Browser-exported JSON profiles can be imported directly.

### TUI controls

| Action | Key |
| --- | --- |
| Reveal or hide meaning | Space |
| Move between ratings | H / L |
| Submit selected rating | Enter |
| Direct rating | A / S / D / W |
| Undo | Z or U |
| Add a 20-word group | + |
| Open action menu | M, then J / K and Enter |
| Open Vim-style command line | : |
| Study / History / Statistics | 1 / 2 / 3 |
| Save and quit | Q |

The command line supports `:days N`, `:add`, `:export PATH`, `:import PATH`, `:write`, `:history`, `:stats`, and `:wq`.

## Keyboard controls

| Action                                   | Default key |
| ---------------------------------------- | ----------- |
| Show or hide the answer                  | Space       |
| Completely forgotten                     | A           |
| Recalled with difficulty                 | S           |
| Recalled normally                        | D           |
| Mark as completely mastered              | W           |
| Undo the latest rating                   | Z           |
| Study / Graph / Statistics / Data / Docs | 1–5         |
| Recent reviews                           | 6           |

Physical key codes are used when available, so study controls continue to work while an input method is active. Mappings can be changed from the Data page.

### Browser extensions

Keyboard-centric extensions such as Vimium, Tridactyl, Surfingkeys, cVim, and some translator or password-manager add-ons may intercept A / S / D before the keys reach the application. If controls stop responding on the deployed page, disable extensions for the site or test in an incognito window first.

Open the page with `?debug` to show the raw `key` and `code` values for every keypress in a small status bar. This makes extension conflicts easier to identify.

## Profiles and portability

The local server writes progress to profiles/default.json. Profile files are excluded from Git. Use the Data page to export a portable JSON backup and import it on another computer.

The Recent Reviews page shows the latest ratings and frequently forgotten words. New review events store the previous scheduling state, allowing the latest accidental rating to be restored exactly.

New words are sampled from five frequency strata. This keeps the daily set stable while mixing common and less familiar vocabulary. Due reviews are interleaved with new material, and each optional 20-word group advances the target date according to the current daily rate.

The fourth rating removes a word from automatic review and should be used carefully. It remains visible in review history and can be rated again later.

The public demo stores progress in the visitor's browser and has no permission to change this repository.

## Anki

Anki export is disabled by default. Enable it on the Data page to export studied words as a UTF-8, tab-separated file. Import the file into Anki using the tab separator.

## Development

    npm test
    npm run build
    go test ./...
    go vet ./...

Use `nix develop` to open a shell containing Go and Node.js, or `nix build` to build the installable terminal package.

The main web extension points are StorageAdapter for persistence, ExportAdapter for output formats, Keymap for input bindings, and the state-free view modules for presentation. The Go TUI keeps scheduling, queue construction, profile storage, terminal input, and rendering in separate packages. Both interfaces use the same profile fields and vocabulary source.

The vocabulary build is reproducible and pinned to a specific upstream revision. Run npm run prebuild to prepare the dataset.

## Data and license

Vocabulary data is derived from [exam-data/NETEMVocabulary](https://github.com/exam-data/NETEMVocabulary) under CC BY-NC-SA 4.0. Application code is licensed under MIT.
