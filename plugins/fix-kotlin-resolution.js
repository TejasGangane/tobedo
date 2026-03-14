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

// Duplicate MANIFEST.MF from OkHttp and JSpecify JARs; exclude so mergeReleaseJavaResource succeeds.
const PACKAGING_BLOCK = `
    packaging {
        resources {
            excludes += ["META-INF/versions/9/OSGI-INF/MANIFEST.MF"]
        }
    }
`;

function withFixKotlinResolution(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;

      // 1) Root build.gradle: Kotlin resolution strategy
      const buildGradlePath = path.join(projectRoot, "build.gradle");
      if (fs.existsSync(buildGradlePath)) {
        let content = fs.readFileSync(buildGradlePath, "utf8");
        if (!content.includes("Align Kotlin stdlib/reflect with Expo Kotlin toolchain")) {
          const anchor = "allprojects {";
          const start = content.indexOf(anchor);
          if (start !== -1) {
            const endOfBlock = content.indexOf("  }\n}\n", start);
            if (endOfBlock !== -1) {
              const insertIdx = endOfBlock + "  }\n}\n".length;
              content =
                content.slice(0, insertIdx) +
                KOTLIN_RESOLUTION_BLOCK +
                content.slice(insertIdx);
              fs.writeFileSync(buildGradlePath, content);
            }
          }
        }
      }

      // 2) App build.gradle: packaging exclude for duplicate OSGI MANIFEST.MF
      const appBuildGradlePath = path.join(projectRoot, "app", "build.gradle");
      if (fs.existsSync(appBuildGradlePath)) {
        let appContent = fs.readFileSync(appBuildGradlePath, "utf8");
        if (
          !appContent.includes("META-INF/versions/9/OSGI-INF/MANIFEST.MF") &&
          !appContent.includes("packaging {")
        ) {
          const androidBlock = "android {";
          const idx = appContent.indexOf(androidBlock);
          if (idx !== -1) {
            const insertIdx = idx + androidBlock.length;
            appContent =
              appContent.slice(0, insertIdx) +
              PACKAGING_BLOCK +
              appContent.slice(insertIdx);
            fs.writeFileSync(appBuildGradlePath, appContent);
          }
        }
      }

      return config;
    },
  ]);
}

module.exports = withFixKotlinResolution;
