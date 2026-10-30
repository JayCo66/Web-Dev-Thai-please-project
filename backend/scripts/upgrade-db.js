// Additive upgrade for existing project databases. Never resets user data.
require("dotenv").config({ quiet: true });
const fs = require("node:fs");
const path = require("node:path");
const prisma = require("../src/config/prisma");
const dir = path.join(__dirname, "../prisma/upgrades");

async function apply(name) {
  const existing =
    await prisma.$queryRaw`SELECT name FROM project_upgrades WHERE name = ${name}`;
  if (existing.length) {
    console.log(`${name}: already applied.`);
    return;
  }
  const sql = fs.readFileSync(path.join(dir, `${name}.sql`), "utf8");
  const statements = sql
    .replace(/^--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (statements.some((s) => /\bDROP\b|^\s*(TRUNCATE|DELETE)\b/i.test(s)))
    throw new Error("Refusing a non-additive upgrade");
  for (const statement of statements) await prisma.$executeRawUnsafe(statement);
  await prisma.$executeRaw`INSERT INTO project_upgrades (name) VALUES (${name})`;
  console.log(
    `${name}: applied ${statements.length} additive statements; existing rows retained.`,
  );
}

async function main() {
  await prisma.$executeRawUnsafe(
    "CREATE TABLE IF NOT EXISTS project_upgrades (name VARCHAR(100) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );
  // File names start with a date, so sorting runs them in the order they were written.
  const names = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => file.slice(0, -4))
    .sort();
  for (const name of names) await apply(name);
}
main()
  .then(() => require("../src/services/catalogService").syncCatalog(prisma))
  .catch((error) => {
    console.error("Database upgrade failed:", error.meta?.message || error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
