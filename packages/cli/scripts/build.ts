#!/usr/bin/env bun

import { $ } from "bun"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import solidPlugin from "../node_modules/@opentui/solid/scripts/solid-plugin"
import { Script } from "../../script/src/index.ts"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")

process.chdir(dir)

import pkg from "../package.json"

const app = "opengit"
const scope = "@flat6"

const singleFlag = process.argv.includes("--single") || (!!process.env.CI && !process.argv.includes("--all"))
const baselineFlag = process.argv.includes("--baseline")
const skipInstall = process.argv.includes("--skip-install")

const allTargets: {
  os: string
  arch: "arm64" | "x64"
  abi?: "musl"
  avx2?: false
}[] = [
  {
    os: "linux",
    arch: "arm64",
  },
  {
    os: "linux",
    arch: "x64",
  },
  {
    os: "linux",
    arch: "x64",
    avx2: false,
  },
  {
    os: "linux",
    arch: "arm64",
    abi: "musl",
  },
  {
    os: "linux",
    arch: "x64",
    abi: "musl",
  },
  {
    os: "linux",
    arch: "x64",
    abi: "musl",
    avx2: false,
  },
  {
    os: "darwin",
    arch: "arm64",
  },
  {
    os: "darwin",
    arch: "x64",
  },
  {
    os: "darwin",
    arch: "x64",
    avx2: false,
  },
  {
    os: "win32",
    arch: "x64",
  },
  {
    os: "win32",
    arch: "x64",
    avx2: false,
  },
  {
    os: "win32",
    arch: "arm64",
  },
]

const targets = singleFlag
  ? allTargets.filter((item) => {
      if (item.os !== process.platform || item.arch !== process.arch) {
        return false
      }

      if (item.avx2 === false) {
        return baselineFlag
      }

      if (item.abi !== undefined) {
        return false
      }

      return true
    })
  : allTargets

await $`rm -rf dist`

const binaries: Record<string, string> = {}
if (!skipInstall) {
  await $`bun install --os="*" --cpu="*" @opentui/core@${pkg.dependencies["@opentui/core"]}`
  await $`bun install --os="*" --cpu="*" @opentui/solid@${pkg.dependencies["@opentui/solid"]}`
}
for (const item of targets) {
  const name = [
    app,
    item.os === "win32" ? "windows" : item.os,
    item.arch,
    item.avx2 === false ? "baseline" : undefined,
    item.abi === undefined ? undefined : item.abi,
  ]
    .filter(Boolean)
    .join("-")
  console.log(`building ${name}`)
  await $`mkdir -p dist/${name}/bin`

  const parserWorker = fs.realpathSync(path.resolve(dir, "./node_modules/@opentui/core/parser.worker.js"))

  const bunfsRoot = item.os === "win32" ? "B:/~BUN/root/" : "/$bunfs/root/"
  const workerRelativePath = path.relative(dir, parserWorker).replaceAll("\\", "/")

  const exeExtension = item.os === "win32" ? ".exe" : ""
  const outfile = `dist/${name}/bin/opengit${exeExtension}`

  const result = await Bun.build({
    conditions: ["browser"],
    tsconfig: "./tsconfig.json",
    plugins: [solidPlugin],
    sourcemap: process.argv.includes("--sourcemaps") ? "linked" : "none",
    compile: {
      autoloadBunfig: false,
      autoloadDotenv: false,
      target: name.replace(app, "bun").replace("windows", "win32") as any,
      outfile,
      execArgv: ["--"],
      windows: {},
    },
    entrypoints: ["./src/index.tsx", parserWorker],
    define: {
      OPENGIT_VERSION: `'${Script.version}'`,
      OTUI_TREE_SITTER_WORKER_PATH: bunfsRoot + workerRelativePath,
    },
  })

  if (!result.success) {
    console.error(`Failed to build ${name}`)
    for (const log of result.logs) {
      console.error(log)
    }
    process.exit(1)
  }

  if (item.os === process.platform && item.arch === process.arch && item.abi === undefined && item.avx2 !== false) {
    const version = await $`${outfile} --version`.text()
    console.log(`✓ ${name} smoke test: ${version.trim()}`)
  }

  await Bun.file(`dist/${name}/package.json`).write(
    JSON.stringify(
      {
        name: `${scope}/${name}`,
        version: Script.version,
        license: "MIT",
        repository: {
          type: "git",
          url: "git+https://github.com/flat6solutions/opengit.git",
        },
        os: [item.os],
        cpu: [item.arch],
      },
      null,
      2,
    ),
  )
  binaries[name] = Script.version
  console.log(`✓ ${name} built successfully`)
}

if (Script.release) {
  for (const key of Object.keys(binaries)) {
    if (key.includes("linux")) {
      await $`tar -czf ../../${key}.tar.gz *`.cwd(`dist/${key}/bin`)
    } else {
      await $`zip -r ../../${key}.zip *`.cwd(`dist/${key}/bin`)
    }
  }
  await $`gh release upload v${Script.version} ./dist/*.zip ./dist/*.tar.gz --clobber --repo ${process.env.GH_REPO}`
}

export { binaries }
