import { $ } from "bun"

const env = {
  OPENGIT_BUMP: process.env["OPENGIT_BUMP"],
  OPENGIT_VERSION: process.env["OPENGIT_VERSION"],
}

const VERSION = await (async () => {
  if (env.OPENGIT_VERSION) return env.OPENGIT_VERSION

  // Fetch current version from npm
  const version = await fetch("https://registry.npmjs.org/opengit/latest")
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText)
      return res.json()
    })
    .then((data: any) => data.version)
    .catch(() => "0.0.0") // First publish

  const [major, minor, patch] = version.split(".").map((x: string) => Number(x) || 0)
  const bump = env.OPENGIT_BUMP?.toLowerCase()

  if (bump === "major") return `${major + 1}.0.0`
  if (bump === "minor") return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
})()

export const Script = {
  get version() {
    return VERSION
  },
}

console.log(`opengit script`, JSON.stringify(Script, null, 2))
