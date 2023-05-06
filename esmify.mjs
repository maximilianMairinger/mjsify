import { promises as fs } from "fs"
import { program } from "commander"
import readDir from "recursive-readdir"

program.parse()

const dir = program.args[0]
const files = await readDir(dir)
for (const file of files) {
  const content = await fs.readFile(file, "utf8")
  const newContent = content.replace(/(?<=((import)|(export))\s+(([^\s{}"',]+)|({\s*[^\s{}"',]+(\s+as\s+[^\s{}"',]+)?(\s*,\s*[^\s{}"',]+(\s+as\s+[^\s{}"',]+)?)*\s*}))\s+from\s+['"](\.{1,2}\/)([^'"]+))(?=['"])/g, ".mjs")
  const newFilePath = file.replace(/\.js$/, ".mjs")
  fs.writeFile(newFilePath, newContent)
  fs.unlink(file)
}