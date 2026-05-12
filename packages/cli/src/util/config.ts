import { z } from "zod"

export const KeybindsConfig = z.object({
  leader: z.string().optional().default("ctrl+x").describe("Leader key for keybind combinations"),
  app_exit: z.string().optional().default("ctrl+c,<leader>q,q").describe("Exit the application"),
  theme_mode_toggle: z.string().optional().default("<leader>t").describe("Toggle between light and dark theme"),
  debug_toggle: z.string().optional().default("ctrl+d").describe("Toggle debug mode"),
  next: z.string().optional().default("j,down").describe("Next object"),
  previous: z.string().optional().default("k,up").describe("Previous object"),
  discard_file: z.string().optional().default("d").describe("Discard file"),
  stage_unstage_file: z.string().optional().default("space").describe("Stage/Unstage file"),
  stage_all_files: z.string().optional().default("a").describe("Stage all files"),
  unstage_all_files: z.string().optional().default("shift+a").describe("Unstage all files"),
  commit: z.string().optional().default("c").describe("Commit staged files"),
  close_dialog: z.string().optional().default("esc").describe("Close dialog"),
  confirm: z.string().optional().default("return").describe("Confirm action"),
  trigger_generic_action: z.string().optional().default("<leader>g").describe("Trigger generic action"),
  trigger_sidebar: z.string().optional().default("s").describe("Trigger sidebar"),
  trigger_diff: z.string().optional().default("<leader>d").describe("Trigger diff"),
})

export type KeybindsConfig = z.infer<typeof KeybindsConfig>
