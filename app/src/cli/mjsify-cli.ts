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
  
.parse(process.argv)


const options = program.opts()
options.verbose = !options.silent
delete options.silent

if (program.args[0] !== undefined) mjsify(program.args[0], options)
else program.help()
