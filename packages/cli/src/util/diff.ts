import path from "path"
import { LANGUAGE_EXTENSIONS } from "./language"

export function filetype(input?: string) {
  if (!input) return "text"
  const ext = path.extname(input)
  const language = LANGUAGE_EXTENSIONS[ext]
  if (["typescriptreact", "javascriptreact", "javascript"].includes(language)) return "typescript"
  return language ?? "text"
}
