import { version } from '../package.json'
import sade from 'sade'
import { run } from './run'
import supportsColor from 'supports-color'

export const cli = (argv = process.argv) =>
  sade('twind [...globs=**/*.{htm,html,js,jsx,tsx,svelte,vue,mdx}]', /* single commmand */ true)
    .version(version)
    .option('-o, --output', 'Set output css file path (default print to console)')
    .option(
      '-c, --config',
      'Set config file path (default twind.config.[cm]js or tailwind.config.[cm]js',
    )
    .option('-i, --ignore', 'Any file patterns to ignore')
    .option('-I, --ignore-file', 'gitignore like file', '.gitignore')
    .option('-b, --beautify', 'Generate beautified css file', false)
    .option('-C, --cwd', 'The current directory to resolve from', '.')
    .option('-w, --watch', 'Watch for changes', false)
    .option('--color', 'Print colorized output - to disable use --no-color', supportsColor.stderr)
    .action(async (globs, { _, ['ignore-file']: ignoreFile, ...options }) => {
      try {
        await run([globs, ..._], { ...options, ignoreFile })
      } catch (error) {
        console.error(error.stack || error.message)
        process.exit(1)
      }
    })
    .parse(argv)
