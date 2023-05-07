#!/usr/bin/env node
import mjsify from "../mjsify"
import { program } from "commander"
import reqPackageJson from "req-package-json"
const config = reqPackageJson()

program
  .version(config.version)
  .name(config.name)
  .option('-s, --silent', 'silence stdout')
  .arguments('<dir>')
  .action((dir, p) => {
    const options = p.opts()
    mjsify(dir, { verbose: !options.silent })
  })

.parse(process.argv)

