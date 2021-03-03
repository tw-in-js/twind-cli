import { match } from 'assert'
import { readFile } from 'fs/promises'

const cleanCandidate = (candidate: string): string => {
  // 1. remove leading class: (svelte)
  return candidate.replace(/^class:/, '')
}

const COMMON_INVALID_CANDIDATES = new Set([
  '!DOCTYPE',
  'true',
  'false',
  'null',
  'undefined',
  'class',
  'className',
  'currentColor',
])

const removeInvalidCandidate = (candidate: string): boolean => {
  return !(
    COMMON_INVALID_CANDIDATES.has(candidate) ||
    // Remove candiate if it matches the following rules
    // - no lower case char
    !/[a-z]/.test(candidate) ||
    // - containing uppercase letters
    // - non number fractions and decimals
    // - ending with -, /, @, $, &
    // - white space only
    /[A-Z]|\D[/.]\D|[-/@$&]$|^\s*$/.test(candidate) ||
    // Either of the following two must match
    // support @sm:..., >sm:..., <sm:...
    /^[@<>][^:]+:/.test(candidate) !=
      // - starts with <:#.,;?\d[\]%/$&@_
      // - v-*: (vue)
      // - aria-*
      // - url like
      /^-?[<:#.,;?\d[\]%/$&@_]|^v-[^:]+:|^aria-|^https?:\/\/|^mailto:|^tel:/.test(candidate)
  )
}

export const extractRulesFromString = (content: string): string[] => {
  return (content.match(/[^>"'`\s(){}[\]=][^<>"'`\s(){}=]*[^<>"'`\s(){}=:#.,;?]/g) || [])
    .map(cleanCandidate)
    .filter(removeInvalidCandidate)
}

export const extractRulesFromFile = async (file: string): Promise<string[]> => {
  try {
    return extractRulesFromString(await readFile(file, { encoding: 'utf-8' }))
  } catch (error) {
    // TODO log error
    return []
  }
}
