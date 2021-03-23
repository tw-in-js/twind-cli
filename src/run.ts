import type { Stats } from 'fs'
import fs from 'fs/promises'
import path from 'path'

import kleur from 'kleur'
import timeSpan from 'time-span'
import { transform } from 'esbuild'

import type { TW, Configuration, Mode } from 'twind'
import type { VirtualSheet } from 'twind/sheets'
import { create } from 'twind'
import { virtualSheet } from 'twind/sheets'

import { watch } from './watch'
import { extractRulesFromFile } from './extract'
import { findConfig, loadConfig as tryLoadConfig } from './config'

export interface RunOptions {
  config?: string
  output?: string
  cwd?: string
  color?: boolean
  watch?: boolean
  ignoreFile?: string
  beautify?: boolean
}

export const run = async (globs: string[], options: RunOptions = {}): Promise<void> => {
  kleur.enabled = !!options.color

  options.cwd = path.resolve(options.cwd || '.')

  const configFile =
    (options.config && path.resolve(options.cwd, options.config)) || (await findConfig(options.cwd))

  // Track unknown rules
  const unknownRules = new Set<string>()
  const ignoreUnknownRules = (rule: string) => !unknownRules.has(rule)
  const mode: Mode = {
    unknown() {},
    report(info) {
      if (info.id == 'UNKNOWN_DIRECTIVE') {
        unknownRules.add(info.rule)
      }
    },
  }

  const watched = new Map<string, Stats>()
  const candidatesByFile = new Map<string, string[]>()
  let lastCandidates = new Set<string>(['' /* ensure an empty CSS may be generated */])

  // The initial run is not counted -> -1, initialRun=0, first run=1
  let runCount = -1

  const loadConfig = (): { sheet: VirtualSheet; tw: TW } => {
    let config: Configuration & { purge?: string[] | { content?: string[] } } = {}

    if (configFile) {
      const configEndTime = timeSpan()

      config = tryLoadConfig(configFile, options.cwd)

      console.error(
        kleur.green(
          `Loaded configuration from ${kleur.bold(
            path.relative(process.cwd(), configFile),
          )} in ${kleur.bold(configEndTime.rounded() + ' ms')}`,
        ),
      )

      if (runCount < 1 && config.purge) {
        if (Array.isArray(config.purge)) {
          globs = [...globs, ...config.purge]
        } else if (Array.isArray(config.purge.content)) {
          globs = [...globs, ...config.purge.content]
        }
      }
    }

    unknownRules.clear()
    lastCandidates = new Set<string>(['' /* ensure an empty CSS may be generated */])

    const sheet = virtualSheet()

    return {
      sheet,
      tw: create({ ...config, sheet, mode, hash: false }).tw,
    }
  }

  let { sheet, tw } = await loadConfig()

  const outputFile = options.output && path.resolve(options.cwd, options.output)

  globs = globs.filter(Boolean)
  if (!globs.length) {
    globs.push('**/*.{htm,html,js,jsx,tsx,svelte,vue,mdx}')
  }

  console.error(
    kleur.dim(`Using the following patterns: ${kleur.bold(JSON.stringify(globs).slice(1, -1))}`),
  )

  for await (const changes of watch(configFile ? [configFile, ...globs] : globs, options)) {
    runCount++
    // console.error([...changes.keys()])
    console.error(
      kleur.cyan(
        `Processing ${kleur.bold(changes.size)}${options.watch ? ' changed' : ''} file${
          changes.size == 1 ? '' : 's'
        }`,
      ),
    )

    const endTime = timeSpan()
    const pendingDetections: Promise<unknown>[] = []
    let hasChanged = false
    for (const [file, stats] of changes.entries()) {
      if (file == configFile) {
        if (runCount) {
          ;({ sheet, tw } = await loadConfig())
          hasChanged = true
        }
      } else if (stats) {
        const watchedStats = watched.get(file)
        if (
          !watchedStats ||
          watchedStats.size !== stats.size ||
          watchedStats.mtimeMs !== stats.mtimeMs ||
          watchedStats.ino !== stats.ino
        ) {
          pendingDetections.push(
            extractRulesFromFile(file).then((candidates) => {
              // console.error({file, candidates})
              watched.set(file, stats)
              candidatesByFile.set(file, candidates)
              if (!hasChanged) {
                for (let index = candidates.length; index--; ) {
                  if (!lastCandidates.has(candidates[index])) {
                    hasChanged = true
                    break
                  }
                }
              }
            }),
          )
        }
      } else {
        watched.delete(file)
        candidatesByFile.delete(file)
        hasChanged = true
      }
    }

    await Promise.all(pendingDetections)

    const nextCandidates = new Set<string>()
    const addCandidate = (candidate: string): void => {
      nextCandidates.add(candidate)
    }
    candidatesByFile.forEach((candidates) => {
      candidates.forEach(addCandidate)
    })

    console.error(
      kleur.gray(
        `Extracted ${kleur.bold(nextCandidates.size)} candidate${
          nextCandidates.size == 1 ? '' : 's'
        } from ${watched.size} file${watched.size == 1 ? '' : 's'} in ${kleur.bold(
          endTime.rounded() + ' ms',
        )}`,
      ),
    )

    if (hasChanged || !equals(lastCandidates, nextCandidates)) {
      const twEndTime = timeSpan()
      sheet.reset()
      tw([...nextCandidates].filter(ignoreUnknownRules).sort().join(' '))
      // console.error([...nextCandidates].sort().join(' '))
      console.error(
        kleur.gray(
          `Generated ${kleur.bold(sheet.target.length)} CSS rule${
            sheet.target.length == 1 ? '' : 's'
          } in ${kleur.bold(twEndTime.rounded() + ' ms')}`,
        ),
      )

      lastCandidates = nextCandidates

      // Beautify or Minify
      let css = sheet.target.join('\n')
      if (options.beautify || !options.watch) {
        const cssEndTime = timeSpan()
        const result = await transform(css, {
          minify: !options.beautify,
          loader: 'css',
          sourcemap: false,
        })

        css = result.code
        console.error(
          kleur.gray(
            `${options.beautify ? 'Beautified' : 'Minimized'} CSS in ${kleur.bold(
              cssEndTime.rounded() + ' ms',
            )}`,
          ),
        )
      }

      // Write to file or console
      if (outputFile) {
        await fs.mkdir(path.dirname(outputFile), { recursive: true })
        await fs.writeFile(outputFile, css)
        console.error(
          kleur.green(
            `Finished ${kleur.bold(path.relative(process.cwd(), outputFile))} in ${kleur.bold(
              endTime.rounded() + ' ms',
            )}`,
          ),
        )
      } else {
        console.error(kleur.green(`Finished in ${kleur.bold(endTime.rounded() + ' ms')}`))
        console.log(css)
      }
    } else {
      console.error(kleur.green().dim(`No new classes detected - skipped generating CSS`))
    }

    if (options.watch) {
      console.error('\n' + kleur.dim('Waiting for file changes...'))
    }
  }

  if (runCount < 0) {
    console.error(kleur.yellow(`No matching files found...`))
  }
}

function equals(a: Set<unknown>, b: Set<unknown>) {
  return a.size === b.size && every(b, (value: unknown) => a.has(value))
}

function every<T>(as: Iterable<T>, predicate: (value: T) => unknown): boolean {
  for (const a of as) {
    if (!predicate(a)) {
      return false
    }
  }

  return true
}
