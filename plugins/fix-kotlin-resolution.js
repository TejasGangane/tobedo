const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const KOTLIN_RESOLUTION_BLOCK = `
// Force Kotlin stdlib/reflect to 2.1.0 to match Expo toolchain (avoids 2.3.0 metadata errors).
// Only override kotlinx-serialization-core* so Clerk/Ktor can resolve json-io etc. normally.
allprojects { proj ->
  configurations.configureEach { cfg ->
    resolutionStrategy.eachDependency { details ->
      if (details.requested.group == "org.jetbrains.kotlin") {
        if (details.requested.name.startsWith("kotlin-stdlib") || details.requested.name == "kotlin-reflect") {
          details.useVersion("2.1.0")
          details.because("Align Kotlin stdlib/reflect with Expo Kotlin 2.1.0 toolchain")
        }
      }
      if (details.requested.group == "org.jetbrains.kotlinx" && details.requested.name.startsWith("kotlinx-serialization-core")) {
        details.useVersion("1.6.3")
        details.because("Use serialization-core compatible with Kotlin 2.1.x")
      }
    }
  }
}
`;

function withFixKotlinResolution(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const buildGradlePath = path.join(projectRoot, "build.gradle");
      if (!fs.existsSync(buildGradlePath)) return config;

      let content = fs.readFileSync(buildGradlePath, "utf8");
      if (content.includes("Align Kotlin stdlib/reflect with Expo Kotlin toolchain")) return config;

      // Insert after the first allprojects { repositories { ... } } block
      const anchor = "allprojects {";
      const start = content.indexOf(anchor);
      if (start === -1) return config;
      const endOfBlock = content.indexOf("  }\n}\n", start);
      if (endOfBlock === -1) return config;
      const insertIdx = endOfBlock + "  }\n}\n".length;

      content =
        content.slice(0, insertIdx) +
        KOTLIN_RESOLUTION_BLOCK +
        content.slice(insertIdx);
      fs.writeFileSync(buildGradlePath, content);
      return config;
    },
  ]);
}

module.exports = withFixKotlinResolution;
