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

  if (!fs.existsSync(ownerApk) || !fs.existsSync(driverApk)) {
    throw new Error("APK files missing from apks/ directory");
  }

  const ownerStats = fs.statSync(ownerApk);
  const driverStats = fs.statSync(driverApk);
  console.log(`✓ Found Owner APK: ${(ownerStats.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`✓ Found Driver APK: ${(driverStats.size / (1024 * 1024)).toFixed(2)} MB`);

  const tag = "v1.0.0";
  const title = "NG Travels Production Release v1.0.0 (Owner & Driver APKs)";
  const notes = `## NG Travels v1.0.0 Production Release

### 📱 Android APKs Included in this Release:
1. **NG Travels Owner APK** (\`NG-Travels-Owner-v1.0.apk\`) - 5.19 MB
   - **Application ID**: \`com.ngtravels.owner\`
   - **Role**: Fleet Owner / Operations Admin / Dispatcher
   - **Features**: Real-time fleet tracking, booking dispatch, vehicle health & document expiry alerts, driver duty roster, customer directory, payments ledger, and financial reporting.

2. **NG Travels Driver APK** (\`NG-Travels-Driver-v1.0.apk\`) - 5.19 MB
   - **Application ID**: \`com.ngtravels.driver\`
   - **Role**: Fleet Driver / Pilot
   - **Features**: Mobile driver cockpit, today's schedule, assigned trips, odometer starting/closing submissions with live GPS validation, toll & expense recording, and real-time status broadcasting to Owner dashboard.

### 🌐 Cloud Backend & Services:
- **Production Vercel Host**: https://ng-travels-operations-black.vercel.app
- **Production Supabase Backend**: https://ddysnnfnzlhiidxkuvmh.supabase.co
`;

  console.log(`Creating GitHub Release ${tag} on Geetorus0/ng-travels...`);

  const ghExe = "C:\\Program Files\\GitHub CLI\\gh.exe";
  const args = [
    "release",
    "create",
    tag,
    ownerApk,
    driverApk,
    "--repo",
    "Geetorus0/ng-travels",
    "--title",
    title,
    "--notes",
    notes,
  ];

  const gh = spawn(ghExe, args, {
    env: { ...process.env, GH_TOKEN: token },
    stdio: "inherit",
  });

  gh.on("close", (code) => {
    if (code === 0) {
      console.log(`\n🎉 Successfully created GitHub Release ${tag} with Owner and Driver APKs!`);
      process.exit(0);
    } else {
      console.error(`\n❌ Failed with exit code ${code}`);
      process.exit(code);
    }
  });
}

run().catch((err) => {
  console.error("Error creating GitHub release:", err);
  process.exit(1);
});
