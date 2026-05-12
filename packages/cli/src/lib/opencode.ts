import { createOpencode } from "@opencode-ai/sdk"
import type { Provider } from "@opencode-ai/sdk"
import { Debug } from "@util/debug"

const AI_MODEL = { providerID: "opencode", modelID: "big-pickle" }

let _client: Awaited<ReturnType<typeof createOpencode>> | null = null

export namespace Opencode {
  async function getClient() {
    if (!_client) {
      Debug.log("opencode client starting")
      _client = await createOpencode({
        port: 0,
      })
      Debug.log("opencode client started")
    }
    return _client
  }

  export function closeClient() {
    if (_client) {
      Debug.log("opencode client closing")
      _client.server.close()
      _client = null
    }
  }

  export async function providers(): Promise<Array<Provider>> {
    try {
      Debug.log("opencode providers loading")
      const opencode = await getClient()
      const result = await opencode.client.config.providers()
      Debug.log("opencode providers loaded", { count: result.data?.providers?.length ?? 0 })
      return result.data?.providers ?? []
    } catch (e) {
      Debug.error("opencode providers failed", e)
      console.log("Error fetching opencode providers", e)
      return []
    }
  }

  export async function prompt(message: string): Promise<string | null> {
    try {
      const opencode = await getClient()
      const session = await opencode.client.session.create()
      const start = Date.now()
      const result = await opencode.client.session.prompt({
        path: { id: session.data!.id },
        body: {
          model: AI_MODEL,
          parts: [{ type: "text", text: message }],
          tools: { "*": false },
        },
      })
      const end = Date.now()
      console.log(`Opencode prompt took ${(end - start) / 1000}s`)
      console.log("res", result.data?.parts)
      const text = result.data?.parts?.find((p) => p.type === "text")?.text ?? null
      return text
    } catch (e) {
      return null
    }
  }
}
