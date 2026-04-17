#!/usr/bin/env bun

import { $ } from "bun"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"
import { Script } from "../../script/src/index.ts"


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")


process.chdir(dir)


const version = Script.version


console.log(`Publishing opengit@${version}`)


const distDir = path.join(dir, "dist")
const platformDirs = fs.readdirSync(distDir).filter((name) => {
  const fullPath = path.join(distDir, name)
  const stat = fs.statSync(fullPath)
  return stat.isDirectory() && name.startsWith("opengit-")
})


console.log(`Found ${platformDirs.length} platform packages`)


const optionalDependencies: Record<string, string> = {}
for (const platformName of platformDirs) {
  optionalDependencies[platformName] = version
}


const mainPkgDir = path.join(distDir, "opengit")
await $`mkdir -p ${mainPkgDir}`


await $`cp -r ./bin ${mainPkgDir}/bin`


await Bun.file(path.join(mainPkgDir, "package.json")).write(
  JSON.stringify(
    {
      name: "opengit",
      version: version,
      description: "A CLI tool for managing Git",
      bin: {
        opengit: `./bin/opengit`,
      },
      optionalDependencies,
    },
    null,
    2,
  )
)


console.log("Created main package with optionalDependencies:")
console.log(JSON.stringify(optionalDependencies, null, 2))


const publishTasks = platformDirs.map(async (platformName) => {
  const platformDir = path.join(distDir, platformName)


  if (process.platform !== "win32") {
    await $`chmod -R 755 .`.cwd(platformDir)
  }


  console.log(`Publishing ${platformName}@${version}...`)


  try {
    await $`npm publish --access public`.cwd(platformDir)
    console.log(`  ✓ ${platformName}`)
  } catch (error) {
    const errorMessage = String(error)
    if (errorMessage.includes("403") || errorMessage.includes("cannot publish over") || errorMessage.includes("You cannot publish over the previously published versions")) {
      console.log(`  ✓ ${platformName} (already published)`)
    } else {
      throw error
    }
  }
})


await Promise.all(publishTasks)


console.log(`\nPublishing opengit@${version}...`)
try {
  await $`npm publish --access public`.cwd(mainPkgDir)
  console.log(`✓ opengit@${version}`)
} catch (error) {
  const errorMessage = String(error)
  if (errorMessage.includes("403") || errorMessage.includes("cannot publish over") || errorMessage.includes("You cannot publish over the previously published versions")) {
    console.log(`✓ opengit@${version} (already published)`)
  } else {
    throw error
  }
}


console.log(`\nPublish complete!`)
