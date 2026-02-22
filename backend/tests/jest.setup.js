// MongoMemoryServer may download binaries on first run (especially on Windows).
// Increase timeout to keep CI/dev machines stable.
import { jest } from "@jest/globals";

jest.setTimeout(180000);
