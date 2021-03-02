# @twind/cli

[![MIT License](https://flat.badgen.net/github/license/tw-in-js/twind-cli)](https://github.com/tw-in-js/twind-cli/blob/main/LICENSE)
[![Latest Release](https://flat.badgen.net/npm/v/@twind/cli?icon=npm&label&cache=10800&color=blue)](https://www.npmjs.com/package/@twind/cli)
[![Github](https://flat.badgen.net/badge/icon/tw-in-js%2Ftwind-cli?icon=github&label)](https://github.com/tw-in-js/twind-cli)
[![Module Size](https://flat.badgen.net/badgesize/brotli/https:/unpkg.com/@twind/cli/cli.js?icon=jsdelivr&label&color=blue&cache=10800)](https://unpkg.com/@twind/cli/cli.js 'brotli module size')
[![Typescript](https://flat.badgen.net/badge/icon/included?icon=typescript&label)](https://unpkg.com/browse/@twind/cli/cli.d.ts)

## Installation

Install from npm:

```sh
# Using npm
npm install @twind/cli

# Using Yarn
yarn add @twind/cli
```

## Usage

```bash
node -r esm -r esbuild-register bin/twind.js -c src/__fixtures__/twind.config.js -o build/tailwind.css -w -b
```

```
  Usage
    $ twind [...globs=**/*.{htm,html,js,jsx,tsx,svelte,vue,mdx}] [options]

  Options
    -o, --output      Set output css file path
    -c, --config      Set config file path
    -i, --ignore      Any file patterns to ignore
    --ignore-file     gitignore like file  (default .gitignore)
    -b, --beautify    Generate beautified css file  (default false)
    -C, --cwd         The current directory to resolve from  (default .)
    -w, --watch       Watch for changes  (default false)
    --color           Print colorized output  (default [object Object])
    -v, --version     Displays current version
    -h, --help        Displays this message
```

## License

[MIT](https://github.com/tw-in-js/content/blob/main/LICENSE)
