#!/usr/bin/env node
import mjsify, { mjsifyPackageJson } from "../mjsify"
import { program } from "commander"
import reqPackageJson, { reqPackagePath } from "req-package-json"
import {promises as fs} from "fs"
import * as path from "path"
const config = reqPackageJson()

program
  .version(config.version)
  .name(config.name)
  .option('-s, --silent', 'silence stdout')
  .arguments('<dir>')
  .action((dir, p) => {
    const options = p.opts()
    mjsify(dir, { verbose: !options.silent })


    const {doneSomething, packageJson} = mjsifyPackageJson(reqPackageJson(""), dir, { verbose: !options.silent })
    if (doneSomething) {
      const packagePath = path.join(reqPackagePath(""), "package.json")
      fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2)).then(() => {
        if (!options.silent) console.log(`mjsify: ${packagePath} updated`)
      })
    }
  })

.parse(process.argv)

