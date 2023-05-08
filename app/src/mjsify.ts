import { promises as fs } from "fs"
import * as readDir from "recursive-readdir"
import { mergeKeysDeep, cloneKeys } from "circ-clone"
import * as console from "./lib/logger"


export async function mjsify(dir: string) {
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
      console.info(`mjsify: ${file} -> ${newFilePath}`)
    })())
  }

  await Promise.all(proms)
}
export default mjsify



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


function ensureCorrectJsonExportStructure(packageJsonParsed: any, distDir: string, esmDistDir: string, cjsDistDir: string | undefined) {
  const doenstHaveCjsDistDir = cjsDistDir === undefined
  if (packageJsonParsed.main !== undefined) {
    const mainIsInDist = isInPath(distDir, packageJsonParsed.main)
    if (!mainIsInDist) {
      throw new Error(`mjsifyPackageJson: main: ${packageJsonParsed.main} is not in ${distDir}. Canceling`)
    }

    const mainIsInMjsDist = isInPath(esmDistDir, packageJsonParsed.main)
    const mainIsInCjsDist = doenstHaveCjsDistDir && isInPath(cjsDistDir, packageJsonParsed.main)
    if (mainIsInCjsDist) console.warn(`mjsifyPackageJson: main: ${packageJsonParsed.main} is in ${cjsDistDir}. Skipping`)
    else {
      if (!mainIsInMjsDist) {
        console.warn(`mjsifyPackageJson: main: ${packageJsonParsed.main} is not in ${esmDistDir}. Replacing with new path`)
        packageJsonParsed.main = path.join(esmDistDir, path.relative(distDir, packageJsonParsed.main))
      }
    }

    if (packageJsonParsed.module !== undefined) {
      const moduleIsInDist = isInPath(distDir, packageJsonParsed.module)
      if (!moduleIsInDist) {
        console.warn(`mjsifyPackageJson: module: ${packageJsonParsed.module} is not in ${distDir}. Skipping`)
      }
      else {
        const moduleIsInMjsDist = isInPath(esmDistDir, packageJsonParsed.module)
        const moduleIsInCjsDist = doenstHaveCjsDistDir && isInPath(cjsDistDir, packageJsonParsed.module)

        if (moduleIsInCjsDist) console.warn(`mjsifyPackageJson: module: ${packageJsonParsed.module} is in ${cjsDistDir}. Skipping`)
        else {
          if (!moduleIsInMjsDist) {
            console.warn(`mjsifyPackageJson: module: ${packageJsonParsed.module} is not in ${esmDistDir}. Replacing with new path`)
            packageJsonParsed.module = path.join(esmDistDir, path.relative(distDir, packageJsonParsed.module))
          }
        }
      }
    }

    if (packageJsonParsed.bin !== undefined) {
      const binIsInDist = isInPath(distDir, packageJsonParsed.bin)
      if (!binIsInDist) {
        console.warn(`mjsifyPackageJson: bin: ${packageJsonParsed.bin} is not in ${distDir}. Skipping`)
      }
      else {
        const binIsInMjsDist = isInPath(esmDistDir, packageJsonParsed.bin)
        const binIsInCjsDist = doenstHaveCjsDistDir && isInPath(cjsDistDir, packageJsonParsed.bin)

        if (binIsInCjsDist) console.warn(`mjsifyPackageJson: bin: ${packageJsonParsed.bin} is in ${cjsDistDir}. Skipping`)
        else {
          if (!binIsInMjsDist) {
            console.warn(`mjsifyPackageJson: bin: ${packageJsonParsed.bin} is not in ${esmDistDir}. Replacing with new path`)
            packageJsonParsed.bin = path.join(esmDistDir, path.relative(distDir, packageJsonParsed.bin))
          }
        }
      }
    }

    if (!doenstHaveCjsDistDir) {
      if (packageJsonParsed.exports === undefined) {
        const mainFileName = path.relative(esmDistDir, packageJsonParsed.main)
        const exports = packageJsonParsed.exports = {} as any
        exports.default = packageJsonParsed.main
        exports.node = {
          import: path.join(esmDistDir, mainFileName),
          require: path.join(cjsDistDir, mainFileName)
        }
      }
    }
    else {
      console.warn(`mjsifyPackageJson: cjsDistDir is undefined. Skipping exports`)
    }
    
  }
}


export function mjsifyPackageJson(packageJsonParsed: any, distDir: string, {esmSubDir, cjsSubDir}: {esmSubDir: string, cjsSubDir?: string}) {
  packageJsonParsed = cloneKeys(packageJsonParsed)

  const esmDistDir = path.join(distDir, esmSubDir)
  const cjsDistDir = cjsSubDir !== undefined ? path.join(distDir, cjsSubDir) : undefined
  
  ensureCorrectJsonExportStructure(packageJsonParsed, distDir, esmDistDir, cjsDistDir)
  


  const ob = filterPackageJsonProps(packageJsonParsed)

  let doneSomething = false
  function walk(ob: object, path: string[] = []) {
    for (const key in ob) {
      if (typeof ob[key] === "object") walk(ob[key], [...path, key])
      else {
        const potentialMatch = ob[key]
        const isMatch = isInPath(esmDistDir, potentialMatch) && isJsFile(potentialMatch)
        if (isMatch) {
          console.info(`mjsifyPackageJson: ${[...path, key].join(".")}: ${potentialMatch} -> ${potentialMatch.replace(/\.js$/, ".mjs")}`)
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





