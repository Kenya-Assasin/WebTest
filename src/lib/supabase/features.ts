/** Enable only after the phase 3 migrations have been audited and applied. */
export const phase3Enabled = process.env.NEXT_PUBLIC_MCA_PHASE3 === 'true';
