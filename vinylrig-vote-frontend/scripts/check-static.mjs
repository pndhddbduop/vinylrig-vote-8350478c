import * as fs from "fs";
import * as path from "path";

const line = "\n===================================================================\n";

// Prohibited patterns for static export
const prohibitedPatterns = [
  { pattern: /getServerSideProps/g, message: "getServerSideProps (use client-side data fetching)" },
  { pattern: /getInitialProps/g, message: "getInitialProps (use client-side data fetching)" },
  { pattern: /export\s+async\s+function\s+GET/g, message: "Route handlers (GET)" },
  { pattern: /export\s+async\s+function\s+POST/g, message: "Route handlers (POST)" },
  { pattern: /from\s+['"]next\/headers['"]/g, message: "next/headers import" },
  { pattern: /from\s+['"]next\/server['"]/g, message: "next/server import (use client-side alternatives)" },
  { pattern: /\bcookies\(\)/g, message: "cookies() function" },
  { pattern: /\bheaders\(\)/g, message: "headers() function" },
  { pattern: /['"]server-only['"]/g, message: "server-only module" },
  { pattern: /dynamic\s*=\s*['"]force-dynamic['"]/g, message: "dynamic='force-dynamic'" },
];

// Directories to check
const appDir = path.resolve("./app");
const componentsDir = path.resolve("./components");
const hooksDir = path.resolve("./hooks");
const libDir = path.resolve("./lib");

const dirsToCheck = [appDir, componentsDir, hooksDir, libDir].filter(dir => fs.existsSync(dir));

let hasErrors = false;

function checkFile(filePath) {
  const ext = path.extname(filePath);
  if (![".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const relativePath = path.relative(process.cwd(), filePath);

  for (const { pattern, message } of prohibitedPatterns) {
    if (pattern.test(content)) {
      console.error(`❌ ${relativePath}: Found prohibited pattern: ${message}`);
      hasErrors = true;
    }
  }

  // Check for API routes
  if (filePath.includes("/api/") && (filePath.includes("/app/") || filePath.includes("/pages/"))) {
    console.error(`❌ ${relativePath}: API routes are not allowed with static export`);
    hasErrors = true;
  }

  // Check for dynamic routes without generateStaticParams
  const dirName = path.dirname(filePath);
  const baseName = path.basename(dirName);
  
  if (baseName.startsWith("[") && baseName.endsWith("]")) {
    // This is a dynamic route directory
    const pageFile = path.join(dirName, "page.tsx");
    if (fs.existsSync(pageFile)) {
      const pageContent = fs.readFileSync(pageFile, "utf-8");
      if (!pageContent.includes("generateStaticParams")) {
        console.error(`❌ ${relativePath}: Dynamic route without generateStaticParams export`);
        hasErrors = true;
      }
    }
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else {
      checkFile(filePath);
    }
  }
}

console.log("🔍 Checking for static export violations...\n");

for (const dir of dirsToCheck) {
  walkDir(dir);
}

if (hasErrors) {
  console.error(`${line}❌ Static export validation FAILED!${line}`);
  console.error("Please fix the violations above before building.\n");
  process.exit(1);
} else {
  console.log(`${line}✅ Static export validation PASSED!${line}`);
  console.log("No violations found. Safe to build.\n");
}

