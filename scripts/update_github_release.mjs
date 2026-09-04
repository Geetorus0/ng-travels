import { spawn } from "child_process";
import fs from "fs";
import path from "path";

async function getGitToken() {
  return new Promise((resolve, reject) => {
    const p = spawn("git", ["credential", "fill"]);
    p.stdin.write("protocol=https\nhost=github.com\n\n");
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("close", (code) => {
      const m = out.match(/password=(.+)/);
      if (m) {
        resolve(m[1].trim());
      } else {
        reject(new Error("Could not retrieve password from git credential helper"));
      }
    });
    p.on("error", reject);
  });
}

async function run() {
  const token = await getGitToken();
  console.log("✓ Retrieved GitHub authentication credentials.");

  const ownerApk = path.resolve("apks/NG-Travels-Owner-v1.0.apk");
  const driverApk = path.resolve("apks/NG-Travels-Driver-v1.0.apk");

  const ghExe = "C:\\Program Files\\GitHub CLI\\gh.exe";
  const args = [
    "release",
    "upload",
    "v1.0.0",
    ownerApk,
    driverApk,
    "--repo",
    "Geetorus0/ng-travels",
    "--clobber",
  ];

  console.log("Uploading updated APKs to GitHub Release v1.0.0 with --clobber...");
  const gh = spawn(ghExe, args, {
    env: { ...process.env, GH_TOKEN: token },
    stdio: "inherit",
  });

  gh.on("close", (code) => {
    if (code === 0) {
      console.log("\n🎉 Successfully updated APKs on GitHub Release v1.0.0!");
      process.exit(0);
    } else {
      console.error(`\n❌ Failed with exit code ${code}`);
      process.exit(code);
    }
  });
}

run().catch((err) => {
  console.error("Error updating GitHub release:", err);
  process.exit(1);
});
