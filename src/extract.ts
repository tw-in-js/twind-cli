import { readFile } from "fs/promises"

function tailwindExtractor(content: string): string[] {
  return content.match(/(?=[^\d<>.,;(){}#=%:/@$&])[^<>"'`\s(){}=]{3,}[^<>"'`\s.,;(){}#=%:/@$&]/g) || []
}

export const extractRules = async (file: string): Promise<string[]> => {
  try {
    return tailwindExtractor(await readFile(file, {encoding: 'utf-8'}))
  } catch (error) {
    // TODO log error
    return []
  }
}
