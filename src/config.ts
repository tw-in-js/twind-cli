import * as Path from 'path'
import Module from 'module'
import { fileURLToPath } from 'url'

import type { Configuration } from 'twind'
import locatePath from 'locate-path'
import kleur from 'kleur'

const TWIND_CONFIG_FILES = [
  'twind.config.ts',
  'twind.config.mjs',
  'twind.config.js',
  'twind.config.cjs',
]

const TAILWIND_CONFIG_FILES = [
  'tailwind.config.ts',
  'tailwind.config.mjs',
  'tailwind.config.js',
  'tailwind.config.cjs',
]

export const findConfig = async (cwd = process.cwd()): Promise<string | undefined> => {
  return locatePath(
    [
      ...TWIND_CONFIG_FILES,
      ...TWIND_CONFIG_FILES.map((file) => Path.join('config', file)),
      ...TWIND_CONFIG_FILES.map((file) => Path.join('src', file)),
      ...TWIND_CONFIG_FILES.map((file) => Path.join('public', file)),
      ...TAILWIND_CONFIG_FILES,
    ].map((file) => Path.resolve(cwd, file)),
  )
}

export const loadFile = <T>(file: string, cwd = process.cwd()): T => {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const from = fileURLToPath(import.meta.url)

    const require = Module.createRequire?.(from) || Module.createRequireFromPath(from)

    require('sucrase/register')

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(Path.resolve(cwd, file)) as T

    // const source = project.readFile(Path.resolve(cwd, file))

    // if (!source) {
    //   return {} as T
    // }

    // const result = transform(source, {
    //   transforms: ['typescript', 'imports'],
    //   filePath: file,
    // })

    // const module = { exports: {} as { default?: Configuration } & Configuration }

    // new Function('exports', 'require', 'module', '__filename', '__dirname', result.code)(
    //   module.exports,
    //   Module.createRequire?.(file) || Module.createRequireFromPath(file),
    //   module,
    //   file,
    //   Path.dirname(file),
    // )

    // return module.exports as T
  } catch {
    return {} as T
  }
}

export type TConfiguration = Configuration & { purge?: string[] | { content?: string[] } }

export const loadConfig = (configFile: string, cwd = process.cwd()): TConfiguration => {
  const exports = loadFile<{ default: Configuration } & Configuration>(configFile, cwd)

  const config = exports.default || exports || {}

  // could be tailwind config
  if (
    (Array.isArray(config.plugins) ||
      // Twind has variants as {key: string}; Tailwind array or object
      Object.values(config.variants || {}).some((value) => typeof value == 'object') ||
      typeof config.prefix == 'string',
    'presets' in config ||
      'separator' in config ||
      'variantOrder' in config ||
      'corePlugins' in config ||
      'purge' in config)
  ) {
    console.error(
      kleur.red(
        `${kleur.bold(
          Path.relative(process.cwd(), configFile),
        )} is a tailwindcss configuration file – ${kleur.bold(
          'only',
        )} the theme, darkMode, purge files are used`,
      ),
    )

    return {
      theme: config.theme,
      darkMode: config.darkMode,
      purge: (config as any).purge,
    }
  }

  return config
}

export const getConfig = async (
  cwd = process.cwd(),
  configFile?: string,
): Promise<TConfiguration & { configFile: string | undefined }> => {
  configFile ??= await findConfig(cwd)

  return {
    ...(configFile ? loadConfig(Path.resolve(cwd, configFile), cwd) : {}),
    configFile,
  }
}
