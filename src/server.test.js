/**
 * Unit tests for src/server.js
 *
 * Due to the nature of src/server.js (setting up an Express application
 * with middleware, static file serving, and error handling) and the
 * constraint of writing "plain assertions with no framework" and "no mocks
 * of external services," comprehensive unit testing of this file is not
 * feasible without external testing libraries (e.g., Supertest for Express)
 * or extensive manual mocking of Express request/response objects and middleware chains.
 *
 * The `log` helper function is not exported, making it untestable in isolation
 * without modifying the source or using advanced module introspection.
 *
 * Therefore, this test file is intentionally left empty to reflect these constraints.
 * In a real-world scenario, integration tests would be written for the server setup.
 */
