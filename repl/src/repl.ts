import mjsify, {mjsifyPackageJson} from "../../app/src/mjsify"
import reqPackageJson from "req-package-json"

console.log(mjsifyPackageJson(reqPackageJson(), "app/dist/esm", {verbose: true}))
