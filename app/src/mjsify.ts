import { promises as fs } from "fs"
import * as readDir from "recursive-readdir"


export async function mjsify(dir: string, {verbose = false}: {verbose?: boolean} = {}) {
  const files = await readDir(dir)
  const proms = []
  for (const file of files) {
    proms.push((async () => {
      const content = await fs.readFile(file, "utf8")
      const newContent = content.replace(/(?<=((import)|(export))\s+(([^\s{}"',]+)|({\s*[^\s{}"',]+(\s+as\s+[^\s{}"',]+)?(\s*,\s*[^\s{}"',]+(\s+as\s+[^\s{}"',]+)?)*\s*}))\s+from\s+['"](\.{1,2}\/)([^'"]+))(?=['"])/g, ".mjs")
      const newFilePath = file.replace(/\.js$/, ".mjs")
      fs.writeFile(newFilePath, newContent)
      fs.unlink(file)
      if (verbose) console.log(`mjsify: ${file} -> ${newFilePath}`)
    })())
  }

  await Promise.all(proms)
}

export default mjsify
