/** Enable only after the phase 3 migrations have been audited and applied. */
export const phase3Enabled = process.env.NEXT_PUBLIC_MCA_PHASE3 === 'true';
/** Enable only after applying and verifying supabase/apply-origins.sql. */
export const originsEnabled = phase3Enabled && process.env.NEXT_PUBLIC_MCA_ORIGINS === 'true';
/** Enable only after applying and verifying supabase/apply-traits.sql. */
export const traitsEnabled = originsEnabled && process.env.NEXT_PUBLIC_MCA_TRAITS === 'true';
