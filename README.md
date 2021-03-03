# @twind/cli

<div align="center">

[![MIT License](https://flat.badgen.net/github/license/tw-in-js/twind-cli)](https://github.com/tw-in-js/twind-cli/blob/main/LICENSE)
[![Latest Release](https://flat.badgen.net/npm/v/@twind/cli?icon=npm&label&cache=10800&color=blue)](https://www.npmjs.com/package/@twind/cli)
[![Github](https://flat.badgen.net/badge/icon/tw-in-js%2Ftwind-cli?icon=github&label)](https://github.com/tw-in-js/twind-cli)
[![Typescript](https://flat.badgen.net/badge/icon/included?icon=typescript&label)](https://unpkg.com/browse/@twind/cli/cli.d.ts)

![Twind Demo](https://raw.githubusercontent.com/tw-in-js/twind-cli/main/assets/demo.gif)

</div>

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
# Find all htm,html,js,jsx,tsx,svelte,vue,mdx files and print generated CSS
twind

# Write CSS to a file
twind -o public/styles.css

# Use custom globs
twind 'src/**/*.jsx' 'public/**/*.html'

# Watch mode
twind -w

# Generate beautified css file
twind -b

# Use different twind config (esm or cjs)
twind -c src/twind.config.js

# Use different tailwind config (esm or cjs)
twind -c tailwind.prod.js
```

```
  Usage
    $ twind [...globs=**/*.{htm,html,js,jsx,tsx,svelte,vue,mdx}] [options]

  Options
    -o, --output         Set output css file path (default print to console)
    -c, --config         Set config file path (default twind.config.[cm]js or tailwind.config.[cm]js
    -i, --ignore         Any file patterns to ignore
    -I, --ignore-file    gitignore like file  (default .gitignore)
    -b, --beautify       Generate beautified css file  (default false)
    -C, --cwd            The current directory to resolve from  (default .)
    -w, --watch          Watch for changes  (default false)
    --color              Print colorized output - to disable use --no-color  (default true)
    -v, --version        Displays current version
    -h, --help           Displays this message
```

## License

[MIT](https://github.com/tw-in-js/cli/blob/main/LICENSE)
