import { promises as fs } from "fs"
import * as readDir from "recursive-readdir"
import { mergeKeysDeep, cloneKeys } from "circ-clone"


export async function mjsify(dir: string, {verbose = false}: {verbose?: boolean} = {}) {
  const files = await readDir(dir)
  const proms = []
  for (const file of files) {
    if (!file.endsWith(".js")) continue
    proms.push((async () => {
      const content = await fs.readFile(file, "utf8")
      const newContent = content.replace(/(?<=((import)|(export))(\s+(([^\s{}"',]+)|({\s*[^\s{}"',]+(\s+as\s+[^\s{}"',]+)?(\s*,\s*[^\s{}"',]+(\s+as\s+[^\s{}"',]+)?)*\s*}))\s+from)?\s+['"](\.{1,2}\/)([^'"]+))((\.js)|(?<!(\.m?js)))(?=['"])/g, ".mjs")
      const newFilePath = file.replace(/\.js$/, ".mjs")
      fs.writeFile(newFilePath, newContent)
      fs.unlink(file)
      if (verbose) console.log(`mjsify: ${file} -> ${newFilePath}`)
    })())
  }

  await Promise.all(proms)
}




const whiteListOfPackageJsonProps: (string | string[])[] = ["main", "bin", "module", "exports"]
function filterPackageJsonProps(packageJsonParsed: any) {
  const ob = {} as any
  for (const keys of whiteListOfPackageJsonProps) {
    let keysAr = typeof keys === "string" ? keys.split(".") : keys
    let local = packageJsonParsed
    
    let failed = false
    for (const key of keysAr) {
      if (local[key] !== undefined) {
        local = local[key]
      }
      else {
        failed = true
        break
      }
    }
    if (failed) continue

    let localCopy = ob
    for (let i = 0; i < keysAr.length-1; i++) {
      const key = keysAr[i];
      localCopy[key] = {}
      localCopy = localCopy[key]
    }

    localCopy[keysAr[keysAr.length-1]] = local
  }
  return ob
}



export function mjsifyPackageJson(packageJsonParsed: any, dirOfMjsDist: string, {verbose = false}: {verbose?: boolean} = {}) {
  packageJsonParsed = cloneKeys(packageJsonParsed)
  const ob = filterPackageJsonProps(packageJsonParsed)

  let doneSomething = false
  function walk(ob: object, path: string[] = []) {
    for (const key in ob) {
      if (typeof ob[key] === "object") walk(ob[key], [...path, key])
      else {
        const potentialMatch = ob[key]
        const isMatch = isInPath(dirOfMjsDist, potentialMatch) && isJsFile(potentialMatch)
        if (isMatch) {
          if (verbose) console.log(`mjsifyPackageJson: ${[...path, key].join(".")}: ${potentialMatch} -> ${potentialMatch.replace(/\.js$/, ".mjs")}`)
          ob[key] = potentialMatch.replace(/\.js$/, ".mjs")
          doneSomething = true
        }
      }
    }
  }

  walk(ob)


  return {doneSomething, packageJson: mergeKeysDeep(packageJsonParsed, ob)}
}


import * as path from "path"

function isInPath(superPath: string, subPath: string) {
  return !path.relative(superPath, subPath).startsWith("..")
}
function isJsFile(filePath: string) {
  return filePath.endsWith(".js")
}




export default mjsify
