#!/usr/bin/env node
// import mjsify from "mjsify"
const { program } = require("commander")
const reqPackageJson = require("req-package-json").default
const config = reqPackageJson()

program
  .arguments("<dir>", "directory to mjsify")
  .version(config.version)
  .name(config.name)

program
  .option('-s, --silent', 'silence stdout')
.parse(process.argv)


const options = program.opts()
options.verbose = !options.silent
delete options.silent

//  if (program.args[0] !== undefined) mjsify(program.args[0], options)
if (program.args[0] !== undefined) console.log("run", options)
else program.help()
