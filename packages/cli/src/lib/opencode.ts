import { createOpencode } from "@opencode-ai/sdk"
import type { Provider } from "@opencode-ai/sdk"

const AI_MODEL = { providerID: "opencode", modelID: "big-pickle" }

let _client: Awaited<ReturnType<typeof createOpencode>> | null = null

export namespace Opencode {
  export const defaultModel = AI_MODEL

  async function getClient() {
    if (!_client) {
      _client = await createOpencode({
        port: 0,
      })
    }
    return _client
  }

  export function closeClient() {
    if (_client) {
      _client.server.close()
      _client = null
    }
  }

  export async function providers(): Promise<Array<Provider>> {
    try {
      const opencode = await getClient()
      const result = await opencode.client.config.providers()
      return result.data?.providers ?? []
    } catch (e) {
      console.log("Error fetching opencode providers", e)
      return []
    }
  }

  export async function prompt(message: string, model = defaultModel): Promise<string | null> {
    try {
      const opencode = await getClient()
      const session = await opencode.client.session.create()
      const result = await opencode.client.session.prompt({
        path: { id: session.data!.id },
        body: {
          model,
          parts: [{ type: "text", text: message }],
          tools: { "*": false },
        },
      })
      const text = result.data?.parts?.find((p) => p.type === "text")?.text ?? null
      return text
    } catch (e) {
      return null
    }
  }
}
