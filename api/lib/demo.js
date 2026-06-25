// Single source of truth for the DEMO_MODE switch.
//
// Set DEMO_MODE=true ONLY on the public demo deployment. Anyone who deploys
// their own copy leaves it unset and automatically gets the full, real
// uploader experience — no configuration required on their part.
export function isDemoMode() {
  return /^(true|1|yes|on)$/i.test(String(process.env.DEMO_MODE || '').trim());
}
