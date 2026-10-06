import { spawn } from 'node:child_process';
for (const args of [
  ['--test','tests/database.test.mjs','tests/audited-database.test.mjs','tests/origins-database.test.mjs'],
  ['scripts/playwright.mjs','test','tests/migration.spec.ts','tests/phase2.spec.ts'],
  ['scripts/playwright-phase3.mjs','test','tests/phase3.spec.ts'],
  ['scripts/playwright-origins.mjs','test','tests/origins.spec.ts'],
]) {
  const code = await new Promise((resolve,reject) => {
    const child=spawn(process.execPath,args,{stdio:'inherit',env:process.env});
    child.on('error',reject); child.on('exit',code=>resolve(code??1));
  });
  if (code) process.exit(code);
}
