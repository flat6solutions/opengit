import type { File } from "@context/application"

export type TreeNodeType = "directory" | "file"

export type TreeNode = {
  name: string
  type: TreeNodeType
  fullPath: string
  status?: string
  previousPath?: string
  added?: number
  removed?: number
  children: TreeNode[]
  depth: number
}

export type FlatNode = TreeNode & {
  fileIndex: number | null // null for directories, sequential index for files
}

/**
 * Sorts tree nodes alphabetically at each level (directories and files mixed together)
 */
function sortTreeLevel(nodes: TreeNode[]): void {
  nodes.sort((a, b) => a.name.localeCompare(b.name))
  for (const node of nodes) {
    if (node.children.length > 0) {
      sortTreeLevel(node.children)
    }
  }
}

/**
 * Consolidates single-child directory chains into combined paths.
 * e.g., packages -> cli -> src becomes packages/cli/src
 * Only consolidates when a directory has exactly one child that is also a directory.
 */
function consolidateDirectories(nodes: TreeNode[]): void {
  for (const node of nodes) {
    if (node.type !== "directory") continue

    // While this dir has exactly one child that is also a directory, merge them
    while (
      node.children.length === 1 &&
        node.children[0].type === "directory"
    ) {
      const child = node.children[0]
      node.name = node.name + "/" + child.name
      node.fullPath = child.fullPath
      node.children = child.children
    }

    // Recurse into children (which may also need consolidating)
    consolidateDirectories(node.children)
  }
}

/**
 * Recalculates depth values after consolidation since the tree is now shallower.
 */
function recalculateDepths(nodes: TreeNode[], depth: number = 0): void {
  for (const node of nodes) {
    node.depth = depth
    recalculateDepths(node.children, depth + 1)
  }
}

/**
 * Builds a tree structure from a flat file list.
 * Files are organized into their directory hierarchy.
 */
export function buildFileTree(files: File[]): TreeNode[] {
  const root: TreeNode[] = []

  for (const file of files) {
    const parts = file.path.split("/")
    let currentLevel = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      const fullPath = parts.slice(0, i + 1).join("/")

      let existing = currentLevel.find((n) => n.name === part)

      if (!existing) {
        const node: TreeNode = {
          name: part,
          type: isFile ? "file" : "directory",
          fullPath,
          children: [],
          depth: i,
          ...(isFile && {
            status: file.status,
            previousPath: file.previousPath,
            added: file.added,
            removed: file.removed,
          }),
        }
        currentLevel.push(node)
        existing = node
      }

      if (!isFile) {
        currentLevel = existing.children
      }
    }
  }

  // Sort each level alphabetically
  sortTreeLevel(root)

  // Consolidate single-child directory chains (e.g., packages/cli/src)
  consolidateDirectories(root)

  // Recalculate depths after consolidation
  recalculateDepths(root)

  return root
}

/**
 * Flattens tree for rendering, assigning sequential fileIndex only to files.
 * Directories get fileIndex: null
 */
export function flattenTree(nodes: TreeNode[]): FlatNode[] {
  const result: FlatNode[] = []
  let fileIndex = 0

  function traverse(nodes: TreeNode[]): void {
    for (const node of nodes) {
      if (node.type === "file") {
        result.push({ ...node, fileIndex: fileIndex++ })
      } else {
        result.push({ ...node, fileIndex: null })
        traverse(node.children)
      }
    }
  }

  traverse(nodes)
  return result
}

/**
 * Gets total count of selectable files in the flattened tree
 */
export function getFileCount(flatNodes: FlatNode[]): number {
  return flatNodes.filter((n) => n.type === "file").length
}

/**
 * Finds the flat array index for a given file index.
 * Useful for scrolling to the selected item.
 */
export function flatIndexFromFileIndex(
  flatNodes: FlatNode[],
  fileIndex: number
): number {
  return flatNodes.findIndex((n) => n.fileIndex === fileIndex)
}

/**
 * Gets the file data (for app.setFile) from a flat node list by file index
 */
export function getFileByIndex(
  flatNodes: FlatNode[],
  fileIndex: number
): File | null {
  const node = flatNodes.find((n) => n.fileIndex === fileIndex)
  if (!node || node.type !== "file") return null
  return {
    status: node.status || "",
    path: node.fullPath,
    previousPath: node.previousPath,
    added: node.added,
    removed: node.removed,
  }
}
