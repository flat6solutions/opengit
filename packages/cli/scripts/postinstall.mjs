#!/usr/bin/env node

import fs from "fs"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"
import { createRequire } from "module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const scope = "@flat6"
const app = "opengit"

function platform() {
  const map = {
    darwin: "darwin",
    linux: "linux",
    win32: "windows",
  }
  return map[os.platform()] ?? os.platform()
}

function arch() {
  const map = {
    x64: "x64",
    arm64: "arm64",
    arm: "arm",
  }
  return map[os.arch()] ?? os.arch()
}

function supportsAvx2(platform, arch) {
  if (arch !== "x64") return false

  if (platform === "linux") {
    try {
      return /(^|\s)avx2(\s|$)/i.test(fs.readFileSync("/proc/cpuinfo", "utf8"))
    } catch {
      return false
    }
  }

  if (platform === "darwin") {
    try {
      const result = require("child_process").spawnSync("sysctl", ["-n", "hw.optional.avx2_0"], {
        encoding: "utf8",
        timeout: 1500,
      })
      if (result.status !== 0) return false
      return (result.stdout || "").trim() === "1"
    } catch {
      return false
    }
  }

  if (platform === "windows") {
    const cmd =
      '(Add-Type -MemberDefinition "[DllImport(""kernel32.dll"")] public static extern bool IsProcessorFeaturePresent(int ProcessorFeature);" -Name Kernel32 -Namespace Win32 -PassThru)::IsProcessorFeaturePresent(40)'

    for (const exe of ["powershell.exe", "pwsh.exe", "pwsh", "powershell"]) {
      try {
        const result = require("child_process").spawnSync(exe, ["-NoProfile", "-NonInteractive", "-Command", cmd], {
          encoding: "utf8",
          timeout: 3000,
          windowsHide: true,
        })
        if (result.status !== 0) continue
        const out = (result.stdout || "").trim().toLowerCase()
        if (out === "true" || out === "1") return true
        if (out === "false" || out === "0") return false
      } catch {}
    }

    return false
  }

  return false
}

function packages() {
  const p = platform()
  const a = arch()
  const base = `${app}-${p}-${a}`
  const baseline = a === "x64" && !supportsAvx2(p, a)

  if (p === "linux") {
    const musl = (() => {
      try {
        if (fs.existsSync("/etc/alpine-release")) return true
      } catch {}

      try {
        const result = require("child_process").spawnSync("ldd", ["--version"], { encoding: "utf8" })
        const text = ((result.stdout || "") + (result.stderr || "")).toLowerCase()
        if (text.includes("musl")) return true
      } catch {}

      return false
    })()

    if (musl) {
      if (a === "x64") {
        if (baseline) return [`${base}-baseline-musl`, `${base}-musl`, `${base}-baseline`, base]
        return [`${base}-musl`, `${base}-baseline-musl`, base, `${base}-baseline`]
      }
      return [`${base}-musl`, base]
    }

    if (a === "x64") {
      if (baseline) return [`${base}-baseline`, base, `${base}-baseline-musl`, `${base}-musl`]
      return [base, `${base}-baseline`, `${base}-musl`, `${base}-baseline-musl`]
    }
    return [base, `${base}-musl`]
  }

  if (a === "x64") {
    if (baseline) return [`${base}-baseline`, base]
    return [base, `${base}-baseline`]
  }
  return [base]
}

function find() {
  const binary = platform() === "windows" ? `${app}.exe` : app
  for (const name of packages()) {
    try {
      const file = require.resolve(`${scope}/${name}/package.json`)
      const candidate = path.join(path.dirname(file), "bin", binary)
      if (fs.existsSync(candidate)) return candidate
    } catch {}
  }
}

function main() {
  if (platform() === "windows") return

  const binary = find()
  if (!binary) throw new Error(`Could not find opengit platform package: ${packages().join(", ")}`)

  const target = path.join(__dirname, "bin", ".opengit")
  if (fs.existsSync(target)) fs.unlinkSync(target)
  try {
    fs.linkSync(binary, target)
  } catch {
    fs.copyFileSync(binary, target)
  }
  fs.chmodSync(target, 0o755)
}

try {
  main()
} catch (error) {
  console.error("Failed to setup opengit binary:", error.message)
  process.exit(1)
}
