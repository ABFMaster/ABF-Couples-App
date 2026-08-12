import { defineConfig } from 'vitest/config'

// Minimal config — no aliases, no jsdom. These tests exercise plain
// exported functions from lib/, not React components or Next.js routing.
// A full route-handler test (importing app/api/.../route.js directly via
// the '@/*' alias from jsconfig.json) was attempted for the sensitive-
// content gate (task #187) but abandoned: this sandbox's Vitest couldn't
// resolve '@/*' imports inside route files even with resolve.alias/
// test.alias configured, and chasing that further would have meant
// building test-infrastructure plumbing Matt explicitly said not to build.
// Instead, the gate's exact branching logic was extracted into
// lib/safety.js's resolveSafetyAction() — a pure function both routes call
// — and is unit-tested directly (tests/safety-gate-decision.test.js),
// which pins the same behavior without needing route-level resolution.
//
// lib/nora.js and lib/nora-memory.js both instantiate real clients
// (Anthropic, Supabase) at module load time — importing them at all
// requires these env vars to be present with *some* syntactically valid
// value, even in tests that mock the client or never call out over the
// network. These are dummy values; no real network call is ever made in
// this test suite (see tests/privacy-boundary.test.js for how the
// Supabase client itself gets mocked for tests that need to inspect what
// tables were queried).
export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
    },
  },
})
