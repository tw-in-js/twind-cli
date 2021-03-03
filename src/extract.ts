import { match } from 'assert'
import { readFile } from 'fs/promises'

const cleanCandidate = (candidate: string): string => {
  // 1. remove leading :class and class:
  return candidate.replace(/^:?class:/, '')
}

const COMMON_INVALID_CANDIDATES = new Set(['!DOCTYPE'])

const removeInvalidCandidate = (candidate: string): boolean => {
  return !(
    COMMON_INVALID_CANDIDATES.has(candidate) ||
    // Remove candiate match the following rules
    // 1. url like
    // 2. non number fractions and decimals
    // 3. starting with number like
    // 4. ending with -, /, @, $, &
    // 5. empty
    /^https?:\/\/|^mailto:|^tel:|\D[/.]\D|^[-\d.\/!]+|[-/@$&]$|^\s*$/.test(candidate)
  )
}

export const extractRulesFromString = (content: string): string[] => {
  return (
    // TODO support @sm:..., >sm:..., <sm:...
    content.match(/(?![<>"'`\s(){}=:#.,;?\d[\]%/$&])[^<>"'`\s(){}=]+[^<>"'`\s(){}=:#.,;?]/g) || []
  )
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
