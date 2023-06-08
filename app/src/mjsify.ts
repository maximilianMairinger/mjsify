import { promises as fs } from "fs"
import * as readDir from "recursive-readdir"
import { mergeKeysDeep, cloneKeys } from "circ-clone"
import * as console from "colorful-cli-logger"


export async function mjsify(dir: string) {
  const files = await readDir(dir)
  const proms = []
  for (const file of files) {
    if (!file.endsWith(".js")) continue
    proms.push((async () => {
      const content = await fs.readFile(file, "utf8")
      const newContent = content.replace(/((?<=((import)|(export))(\s+(([^\s{}"',]+(\s*,\s*({\s*[^\s{}"',]+(\s+as\s+[^\s{}"',]+)?(\s*,\s*[^\s{}"',]+(\s+as\s+[^\s{}"',]+)?)*\s*}))?)|({\s*[^\s{}"',]+(\s+as\s+[^\s{}"',]+)?(\s*,\s*[^\s{}"',]+(\s+as\s+[^\s{}"',]+)?)*\s*})|(\*\s+as\s[^\s{}"',]+))\s+from)?\s+['"](\.{1,2}\/)([^'"]+))(?<!(\.m?js))(?=["']))/g, ".mjs")
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
      if (localCopy[key] === undefined) localCopy[key] = {}
      localCopy = localCopy[key]
    }

    localCopy[keysAr[keysAr.length-1]] = local
  }
  return ob
}


function ensureCorrectJsonExportStructure(packageJsonParsed: any, distDir: string, esmDistDir: string, cjsDistDir: string | undefined) {
  let doneSomething = false
  const hasCjsDistDir = cjsDistDir !== undefined
  if (packageJsonParsed.main !== undefined) {
    const mainIsInDist = isInPath(distDir, packageJsonParsed.main)
    if (!mainIsInDist) {
      throw new Error(`mjsifyPackageJson: main: ${packageJsonParsed.main} is not in ${distDir}. Canceling`)
    }

    const mainIsInMjsDist = isInPath(esmDistDir, packageJsonParsed.main)
    const mainIsInCjsDist = hasCjsDistDir && isInPath(cjsDistDir, packageJsonParsed.main)
    if (mainIsInCjsDist) console.info(`mjsifyPackageJson: main: ${packageJsonParsed.main} is in ${cjsDistDir}. Skipping`)
    else {
      if (!mainIsInMjsDist) {
        console.warn(`mjsifyPackageJson: main: ${packageJsonParsed.main} is not in ${esmDistDir}. Replacing with new path`)
        packageJsonParsed.main = "./" + path.join(esmDistDir, path.relative(distDir, packageJsonParsed.main))
        doneSomething = true
      }
    }

    if (packageJsonParsed.types !== undefined) {
      const typesIsInDist = isInPath(distDir, packageJsonParsed.types)
      if (!typesIsInDist) {
        console.warn(`mjsifyPackageJson: types: ${packageJsonParsed.types} is not in ${distDir}. Skipping`)
      }
      else {
        const typesIsInMjsDist = isInPath(esmDistDir, packageJsonParsed.types)
        const typesIsInCjsDist = hasCjsDistDir && isInPath(cjsDistDir, packageJsonParsed.types)

        if (typesIsInCjsDist) console.info(`mjsifyPackageJson: types: ${packageJsonParsed.types} is in ${cjsDistDir}. Skipping`)
        else {
          if (!typesIsInMjsDist) {
            console.warn(`mjsifyPackageJson: types: ${packageJsonParsed.types} is not in ${esmDistDir}. Replacing with new path`)
            packageJsonParsed.types = "./" + path.join(esmDistDir, path.relative(distDir, packageJsonParsed.types))
            doneSomething = true
          }
        }
      }
    }

    if (packageJsonParsed.module !== undefined) {
      const moduleIsInDist = isInPath(distDir, packageJsonParsed.module)
      if (!moduleIsInDist) {
        console.warn(`mjsifyPackageJson: module: ${packageJsonParsed.module} is not in ${distDir}. Skipping`)
      }
      else {
        const moduleIsInMjsDist = isInPath(esmDistDir, packageJsonParsed.module)
        const moduleIsInCjsDist = hasCjsDistDir && isInPath(cjsDistDir, packageJsonParsed.module)

        if (moduleIsInCjsDist) console.info(`mjsifyPackageJson: module: ${packageJsonParsed.module} is in ${cjsDistDir}. Skipping`)
        else {
          if (!moduleIsInMjsDist) {
            console.warn(`mjsifyPackageJson: module: ${packageJsonParsed.module} is not in ${esmDistDir}. Replacing with new path`)
            packageJsonParsed.module = "./" + path.join(esmDistDir, path.relative(distDir, packageJsonParsed.module))
            doneSomething = true
          }
        }
      }
    }

    if (packageJsonParsed.bin !== undefined) {
      if (typeof packageJsonParsed.bin === "object") {
        for (const key in packageJsonParsed.bin) {
          const bin = packageJsonParsed.bin[key]
          packageJsonParsed.bin[key] = handleBin(bin)
        }
      }
      else packageJsonParsed.bin = handleBin(packageJsonParsed.bin)

      function handleBin(bin: string) {
        const binIsInDist = isInPath(distDir, bin)
        if (!binIsInDist) {
          console.warn(`mjsifyPackageJson: bin: ${bin} is not in ${distDir}. Skipping`)
        }
        else {
          if (hasCjsDistDir) {
            const binIsInMjsDist = isInPath(esmDistDir, bin)
            const binIsInCjsDist = isInPath(cjsDistDir, bin)
  
            if (binIsInMjsDist) console.info(`mjsifyPackageJson: bin: ${bin} is in ${esmDistDir}. Skipping`)
            else {
              if (!binIsInCjsDist) {
                console.warn(`mjsifyPackageJson: bin: ${bin} is not in ${cjsDistDir}. Replacing with new path`)
                doneSomething = true
                return "./" + path.join(cjsDistDir, path.relative(distDir, bin))
              }
            }
          }
          else {
            const binIsInMjsDist = isInPath(esmDistDir, bin)
            const binIsInCjsDist = false
  
            if (binIsInCjsDist) console.info(`mjsifyPackageJson: bin: ${bin} is in ${cjsDistDir}. Skipping`)
            else {
              if (!binIsInMjsDist) {
                console.warn(`mjsifyPackageJson: bin: ${bin} is not in ${esmDistDir}. Replacing with new path`)
                doneSomething = true
                return "./" + path.join(esmDistDir, path.relative(distDir, bin))
              }
            }
          }
          
        }
        return bin
      }
    }

    if (hasCjsDistDir) {
      if (packageJsonParsed.exports === undefined) {
        doneSomething = true
        const mainFileName = path.relative(esmDistDir, packageJsonParsed.main)
        const exports = packageJsonParsed.exports = {} as any
        exports.default = packageJsonParsed.main
        exports.node = {
          import: "./" + path.join(esmDistDir, mainFileName),
          require: "./" + path.join(cjsDistDir, mainFileName)
        }
      }
    }
    else {
      console.warn(`mjsifyPackageJson: cjsDistDir is undefined. Skipping exports`)
    }
    
  }
  return doneSomething
}


export function mjsifyPackageJson(packageJsonParsed: any, distDir: string, {esmSubDir, cjsSubDir}: {esmSubDir: string, cjsSubDir?: string}) {
  packageJsonParsed = cloneKeys(packageJsonParsed)

  const esmDistDir = path.join(distDir, esmSubDir)
  const cjsDistDir = cjsSubDir !== undefined ? path.join(distDir, cjsSubDir) : undefined
  
  let doneSomething = ensureCorrectJsonExportStructure(packageJsonParsed, distDir, esmDistDir, cjsDistDir)
  


  const ob = filterPackageJsonProps(packageJsonParsed)

  
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




  return {doneSomething, packageJson: ensureCorrectOrderOfPropsInPackageJson(mergeKeysDeep(packageJsonParsed, ob))}
}



const packageJsonProps = ["name", "version", "description", "type", "main", "types", "bin", "exports", "scripts"]
function ensureCorrectOrderOfPropsInPackageJson(packageJson: any) {
  const clone = {}

  for (const key of packageJsonProps) {
    if (packageJson[key] !== undefined) {
      clone[key] = packageJson[key]
    }
  }

  for (const key in packageJson) {
    if (!packageJsonProps.includes(key)) {
      clone[key] = packageJson[key]
    }
  }

  return clone
}


import * as path from "path"

function isInPath(superPath: string, subPath: string) {
  return !path.relative(superPath, subPath).startsWith("..")
}
function isJsFile(filePath: string) {
  return filePath.endsWith(".js")
}





