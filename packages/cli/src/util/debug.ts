const enabled = process.env.OPENGIT_DEBUG === "1" || process.env.OPENGIT_DEBUG === "true"

function write(message: string) {
  process.stderr.write(`[opengit debug] ${message}\n`)
}

function format(value: unknown) {
  if (value instanceof Error) return value.stack ?? value.message
  if (typeof value === "string") return value
  return String(value)
}

export namespace Debug {
  export function log(message: string, data?: Record<string, string | number | boolean | null | undefined>) {
    if (!enabled) return
    write(data ? `${message} ${JSON.stringify(data)}` : message)
  }

  export function error(message: string, value: unknown) {
    if (!enabled) return
    write(`${message}: ${format(value)}`)
  }

  export function install() {
    if (!enabled) return

    process.on("uncaughtException", (error) => {
      Debug.error("uncaught exception", error)
      process.exit(1)
    })

    process.on("unhandledRejection", (reason) => {
      Debug.error("unhandled rejection", reason)
    })
  }
}
