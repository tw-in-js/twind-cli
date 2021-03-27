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
  const moduleId = Path.resolve(cwd, file)

  try {
    const require = Module.createRequire?.(moduleId) || Module.createRequireFromPath(moduleId)

    require('sucrase/register')

    delete require.cache[moduleId]

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(moduleId) as T
  } catch (error) {
    console.error(
      kleur.red(
        `Failed to to load ${kleur.bold(Path.relative(process.cwd(), moduleId))}: ${error.message}`,
      ),
    )

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
