// #!/usr/bin/env node
import mjsify from "../mjsify"
import { program } from "commander"
import reqPackageJson from "req-package-json"
const config = reqPackageJson()

program
  .version(config.version)
  .name(config.name)

program
  .option('-s, --silent', 'silence stdout')
.parse(process.argv)


const options = program.opts()
options.verbose = !options.silent
delete options.silent

mjsify(program.args[0], options)
