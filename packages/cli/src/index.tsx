import { Debug } from "@util/debug"

Debug.install()
Debug.log("starting cli", {
  cwd: process.cwd(),
  platform: process.platform,
  arch: process.arch,
  pid: process.pid,
  bun: Bun.version,
  execPath: process.execPath,
  term: process.env.TERM,
  tty: process.stdin.isTTY === true,
  treeSitterWorker: process.env.OTUI_TREE_SITTER_WORKER_PATH,
})

const core = await import("@opentui/core").catch((error: unknown) => {
  Debug.error("opentui core import failed", error)
  throw error
})

const solid = await import("@opentui/solid").catch((error: unknown) => {
  Debug.error("opentui solid import failed", error)
  throw error
})

const app = await import("./app").catch((error: unknown) => {
  Debug.error("app import failed", error)
  throw error
})

function copyToClipboard(text: string) {
  const proc = Bun.spawn(["pbcopy"], { stdin: "pipe" })
  proc.stdin.write(text)
  proc.stdin.end()
  console.info("Copied to clipboard")
}

Debug.log("render starting")

await solid.render(app.tui, {
  targetFps: 60,
  gatherStats: false,
  exitOnCtrlC: true,
  consoleOptions: {
    position: core.ConsolePosition.BOTTOM,
    maxStoredLogs: 1000,
    sizePercent: 70,
    onCopySelection: (text) => copyToClipboard(text),
  },
}).catch((error: unknown) => {
  Debug.error("render failed", error)
  throw error
})

Debug.log("render resolved")
