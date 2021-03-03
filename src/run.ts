import type { Stats } from 'fs'
import fs from 'fs/promises'
import path from 'path'

import type { Service } from 'esbuild'
import kleur from 'kleur'
import { startService } from 'esbuild'
import timeSpan from 'time-span'
import importFresh from 'import-fresh'

import type { TW, Configuration, Mode } from 'twind'
import type { VirtualSheet } from 'twind/sheets'
import { create } from 'twind'
import { virtualSheet } from 'twind/sheets'

import { watch } from './watch'
import { extractRulesFromFile } from './extract'

const tryLoadConfig = (configFile: string): Configuration => {
  try {
    return importFresh(configFile)
  } catch (error) {
    console.log(error)
    return {}
  }
}

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
  const esbuild = await startService()

  try {
    await run$(globs, options, esbuild)
  } finally {
    esbuild.stop()
  }
}

const run$ = async (globs: string[], options: RunOptions, esbuild: Service): Promise<void> => {
  kleur.enabled = !!options.color

  options.cwd = path.resolve(options.cwd || '.')

  const configFile = options.config && path.resolve(options.cwd, options.config)

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

  const loadConfig = (): { sheet: VirtualSheet; tw: TW } => {
    // TODO use esbuild to bundle config
    unknownRules.clear()
    const config = configFile && tryLoadConfig(configFile)
    const sheet = virtualSheet()
    return {
      sheet,
      tw: create({ ...config, sheet, mode, hash: false }).tw,
    }
  }

  let { sheet, tw } = loadConfig()

  const outputFile = options.output && path.resolve(options.cwd, options.output)

  if (outputFile) {
    await fs.mkdir(path.dirname(outputFile), { recursive: true })
  }

  const watched = new Map<string, Stats>()
  const candidatesByFile = new Map<string, string[]>()
  let lastCandidates = new Set<string>(['' /* ensure an empty CSS may be generated */])

  for await (const changes of watch(configFile ? [configFile, ...globs] : globs, options)) {
    // console.log([...changes.keys()])
    console.log(
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
        const configEndTime = timeSpan()
        ;({ sheet, tw } = loadConfig())
        hasChanged = true
        lastCandidates = new Set<string>(['' /* ensure an empty CSS may be generated */])
        console.log(
          kleur.green(
            `Loaded configuration from ${kleur.bold(
              path.relative(process.cwd(), configFile),
            )} in ${kleur.bold(configEndTime.rounded() + ' ms')}`,
          ),
        )
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
              // console.log({file, candidates})
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

    console.log(
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
      // console.log([...nextCandidates].sort().join(' '))
      console.log(
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
        const result = await esbuild.transform(css, {
          minify: !options.beautify,
          loader: 'css',
          sourcemap: false,
        })

        css = result.code
        console.log(
          kleur.gray(
            `${options.beautify ? 'Beautified' : 'Minimized'} CSS in ${kleur.bold(
              cssEndTime.rounded() + ' ms',
            )}`,
          ),
        )
      }

      // Write to file or console
      if (outputFile) {
        await fs.writeFile(outputFile, css)
        console.log(
          kleur.green(
            `Finished ${kleur.bold(path.relative(process.cwd(), outputFile))} in ${kleur.bold(
              endTime.rounded() + ' ms',
            )}`,
          ),
        )
      } else {
        // console.log(css)
      }
    } else {
      console.log(kleur.green().dim(`No new classes detected - skipped generating CSS`))
    }

    if (options.watch) {
      console.log('\n' + kleur.dim('Waiting for file changes...'))
    }
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
