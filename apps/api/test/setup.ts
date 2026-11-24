/**
 * Runs before each test file. Integration tests talk to TEST_DATABASE_URL
 * (a throwaway database, never your real one); without it they're skipped.
 */
process.env.NODE_ENV = "test";
process.env.AI_PROVIDER = "mock";
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else {
  // Config needs some URL to load; nothing connects to it when the suite is skipped.
  process.env.DATABASE_URL = "postgres://unused@localhost:1/unused";
}
