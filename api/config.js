import { isDemoMode } from './lib/demo.js';

// Exposes deploy-time config to the static frontend so it can decide what to
// render. The only flag today is demoMode (driven by the DEMO_MODE env var).
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ demoMode: isDemoMode() });
}
