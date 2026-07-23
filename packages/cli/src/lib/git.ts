import { $ } from "bun"
import { z } from "zod"

const Commit = z.object({
  hash: z.string(),
  refs: z.string(),
  author: z.string(),
  email: z.string(),
  relative: z.string(),
  subject: z.string(),
})
export type Commit = z.infer<typeof Commit>

const Branch = z.object({
  name: z.string(),
  current: z.boolean(),
})
export type Branch = z.infer<typeof Branch>

let cachedGitRoot: string | null = null

export namespace Git {
  export async function getGitRoot() {
    if (cachedGitRoot) return cachedGitRoot
    const res = await $`git rev-parse --show-toplevel`.quiet().nothrow()
    cachedGitRoot = res.stdout.toString().trim()
    return cachedGitRoot
  }

  export async function getRepoName() {
    const root = await getGitRoot()
    return root.split("/").pop()
  }

  export async function getCurrentBranch() {
    const root = await getGitRoot()
    const res = await $`git -C ${root} branch --show-current`.quiet().nothrow()
    return res.stdout.toString().trim()
  }

  export async function getBranches(): Promise<Array<Branch>> {
    const root = await getGitRoot()
    const res =
      await $`git -C ${root} for-each-ref --sort=-committerdate --format="%(refname:short)%00%(HEAD)" refs/heads`
        .quiet()
        .nothrow()
    return res
      .text()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name = "", head = ""] = line.split("\0")
        return {
          name,
          current: head.trim() === "*",
        }
      })
  }

  export function isFileStaged(status: string) {
    if (status.endsWith(" ")) return true
    return false
  }

  export async function stageFile(path: string) {
    const root = await getGitRoot()
    return await $`git -C ${root} add ${path}`.quiet().nothrow()
  }

  export async function unstageFile(path: string) {
    const root = await getGitRoot()
    return await $`git -C ${root} restore --staged ${path}`.quiet().nothrow()
  }

  export async function stageAllFiles() {
    const root = await getGitRoot()
    return await $`git -C ${root} add .`.quiet().nothrow()
  }

  export async function getDiffStaged(): Promise<Array<string>> {
    const root = await getGitRoot()
    const res = await $`git -C ${root} diff --staged`.quiet().nothrow()
    if (!res.stdout.toString()) return []
    return res.stdout.toString().trim().split("\n")
  }

  export async function getStagedFiles(): Promise<Array<string>> {
    const root = await getGitRoot()
    const res = await $`git -C ${root} diff --staged --name-only`.quiet().nothrow()
    if (!res.stdout.toString()) return []
    return res.stdout.toString().trim().split("\n")
  }

  export async function unstageAllFiles() {
    const root = await getGitRoot()
    return await $`git -C ${root} restore --staged .`.quiet().nothrow()
  }

  export async function commit(message: string) {
    const root = await getGitRoot()
    const res = await $`git -C ${root} commit -m "${message}"`.quiet().nothrow()

    if (res.exitCode === 0) {
      return { success: "Success" }
    }

    const stderr = res.stderr.toString().trim()
    const stdout = res.stdout.toString().trim()

    const useful =
      stderr.split("\n").find((line) => line.trim().length > 0) ||
      stdout.split("\n").find((line) => line.trim().length > 0) ||
      `git commit failed (exit ${res.exitCode})`

    return { error: useful }
  }

  export async function discardFile(path: string, status?: string) {
    const root = await getGitRoot()

    let res
    if (status === "??") {
      res = await $`git -C ${root} clean -f -- ${path}`.quiet().nothrow()
    } else {
      res = await $`git -C ${root} restore ${path}`.quiet().nothrow()
    }

    if (res.exitCode === 0) {
      return { success: "Success" }
    }

    const stderr = res.stderr.toString().trim()
    const stdout = res.stdout.toString().trim()

    const useful =
      stderr.split("\n").find((line) => line.trim().length > 0) ||
      stdout.split("\n").find((line) => line.trim().length > 0) ||
      `git restore failed (exit ${res.exitCode})`

    return { error: useful }
  }

  export async function discardAllFiles() {
    const root = await getGitRoot()
    const restore = await $`git -C ${root} restore .`.quiet().nothrow()

    if (restore.exitCode !== 0) {
      return { error: restore.stderr.toString().trim() || `git restore failed (exit ${restore.exitCode})` }
    }

    const clean = await $`git -C ${root} clean -fd`.quiet().nothrow()
    if (clean.exitCode === 0) return { success: "Success" }

    return { error: clean.stderr.toString().trim() || `git clean failed (exit ${clean.exitCode})` }
  }

  export function getLineCounts(diff: string): {
    added: number
    removed: number
  } {
    let added = 0
    let removed = 0
    for (const line of diff.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++")) added++
      else if (line.startsWith("-") && !line.startsWith("---")) removed++
    }
    return { added, removed }
  }

  export async function getDiff(path: string, status: string) {
    const root = await getGitRoot()
    const isUntracked = status === "??"
    const isStaged = status[0] !== " " && status[0] !== "?"
    const hasUnstagedChanges = status[1] !== " "

    if (isUntracked) {
      // Untracked file - compare against nothing (shows all content as additions)
      return await Bun.$`git -C ${root} diff -U5 --no-index -- /dev/null ${path}`.quiet().nothrow().text()
    } else if (isStaged && !hasUnstagedChanges) {
      // Only staged changes (e.g., "M ", "A ", "D ")
      return await Bun.$`git -C ${root} diff -U5 --cached -- ${path}`.quiet().nothrow().text()
    }

    // Unstaged changes (e.g., " M", " D") or mixed (e.g., "MM"m "AM")
    // Shows work tree changes by default
    return await Bun.$`git -C ${root} diff -U5 -- ${path}`.quiet().nothrow().text()
  }
}
