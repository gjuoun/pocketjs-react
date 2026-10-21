// Fixture: pulls a file from a Pocket3D-licensed path of the framework package. The build
// must refuse it.
// @ts-expect-error a text import of a file without type declarations; only the build reads it
import license from "../../../node_modules/@pocketjs/framework/devices/LICENSE" with { type: "text" };

console.log(license.length);
