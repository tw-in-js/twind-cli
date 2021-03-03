import { version } from '../package.json'
import sade from 'sade'
import { run } from './run'
import supportsColor from 'supports-color'

export const cli = (argv = process.argv) =>
  sade('twind [...globs=**/*.{htm,html,js,jsx,tsx,svelte,vue,mdx}]', /* single commmand */ true)
    .version(version)
    .option('-o, --output', 'Set output css file path')
    .option('-c, --config', 'Set config file path')
    .option('-i, --ignore', 'Any file patterns to ignore')
    .option('-I, --ignore-file', 'gitignore like file', '.gitignore')
    .option('-b, --beautify', 'Generate beautified css file', false)
    .option('-C, --cwd', 'The current directory to resolve from', '.')
    .option('-w, --watch', 'Watch for changes', false)
    .option('--color', 'Print colorized output', supportsColor.stderr)
    .action(async (globs = '**/*.{htm,html,js,jsx,tsx,svelte,vue,mdx}', {_, ['ignore-file']: ignoreFile, ...options}) => {
      try {
        await run([globs, ..._], {...options, ignoreFile})
      } catch (error) {
        console.error(error.stack || error.message)
        process.exit(1)
      }
    })
    .parse(argv)
