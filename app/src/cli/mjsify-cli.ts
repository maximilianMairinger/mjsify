#!/usr/bin/env node
import mjsify, { mjsifyPackageJson } from "../mjsify"
import { program } from "commander"
import reqPackageJson, { reqPackagePath } from "req-package-json"
import {promises as fs} from "fs"
import * as path from "path"
const config = reqPackageJson()
import * as console from "colorful-cli-logger"

program
  .version(config.version)
  .description(config.description)
  .name(config.name)
  .option('-s, --silent', 'silence stdout')
  .argument('<dist dir>', "the directory of the dist files")
  .argument('<esm sub dir>', "the directory of the esm files under <dist dir>.")
  .argument('[cjs sub dir]', "the directory of the cjs files under <dist dir>. If not provided some package.json checks will not be performed.")
  .action((distDir, esmSubDir, cjsSubDir, options) => {
    console.setVerbose(!options.silent)
    
    const esmDir = path.join(distDir, esmSubDir)
    const cjsDir = cjsSubDir !== undefined ? path.join(distDir, cjsSubDir) : undefined

    mjsify(esmDir)
    
    try {
      const {doneSomething, packageJson} = mjsifyPackageJson(reqPackageJson(""), distDir, {esmSubDir, cjsSubDir})
      if (doneSomething) {
        const packagePath = path.join(reqPackagePath(""), "package.json")
        fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2) + "\n").then(() => {
          console.info(`mjsifyPackageJson: ${packagePath} updated`)
        })
      }
    }
    catch (err) {
      console.error(err)
    }
    
    
  })

.parse(process.argv)

