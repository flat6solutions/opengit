import fs from "fs/promises"
import { xdgConfig, xdgState } from "xdg-basedir"
import path from "path"

const app = "opengit"

const config = path.join(xdgConfig!, app)
const state = path.join(xdgState!, app)

export namespace Global {
  export const Path = {
    config,
    state,
  }
}

await Promise.all([
  fs.mkdir(Global.Path.config, { recursive: true }),
  fs.mkdir(Global.Path.state, { recursive: true }),
])

