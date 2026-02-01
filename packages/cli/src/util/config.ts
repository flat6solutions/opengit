import { z } from 'zod';

export const KeybindsConfig = z.object({
  leader: z.string().optional().default("ctrl+x").describe("Leader key for keybind combinations"),
  app_exit: z.string().optional().default("ctrl+c,<leader>q,q").describe("Exit the application"),
  theme_mode_toggle: z.string().optional().default("<leader>t").describe("Toggle between light and dark theme"),
  debug_toggle: z.string().optional().default("ctrl+d").describe("Toggle debug mode"),
  next: z.string().optional().default("j,up").describe("Next object"),
  previous: z.string().optional().default("k,down").describe("Previous object"),
})

export type KeybindsConfig = z.infer<typeof KeybindsConfig>
