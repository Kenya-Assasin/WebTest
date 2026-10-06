process.env.MCA_TEST_PHASE3='1';
process.env.MCA_TEST_ORIGINS='1';
process.env.MCA_TEST_TRAITS='1';
await import('./playwright.mjs');
