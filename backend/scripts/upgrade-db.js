// Additive upgrade for existing project databases. Never resets user data.
require("dotenv").config({ quiet: true });
const fs = require("node:fs");
const path = require("node:path");
const prisma = require("../src/config/prisma");
async function main() {
  const name = "20261030_functional_upgrade";
  await prisma.$executeRawUnsafe(
    "CREATE TABLE IF NOT EXISTS project_upgrades (name VARCHAR(100) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );
  const existing =
    await prisma.$queryRaw`SELECT name FROM project_upgrades WHERE name = ${name}`;
  if (existing.length) {
    console.log("Database upgrade already applied.");
    return;
  }
  const sql = fs.readFileSync(
    path.join(__dirname, "../prisma/upgrades", `${name}.sql`),
    "utf8",
  );
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
    `Applied ${statements.length} additive statements; existing rows retained.`,
  );
}
main()
  .then(() => require("../src/services/catalogService").syncCatalog(prisma))
  .catch((error) => {
    console.error("Database upgrade failed:", error.code || error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
