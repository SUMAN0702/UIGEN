// @vitest-environment node
import { test, expect, vi, beforeEach, describe } from "vitest";
import { jwtVerify, SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    set: mockSet,
    get: mockGet,
    delete: mockDelete,
  })),
}));

import { createSession, getSession } from "../../lib/auth";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function createValidToken(
  userId: string,
  email: string,
  expiresIn = "7d"
) {
  return new SignJWT({ userId, email, expiresAt: new Date().toISOString() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets an auth-token cookie with correct options", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockSet).toHaveBeenCalledOnce();
    const [name, token, options] = mockSet.mock.calls[0];

    expect(name).toBe("auth-token");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.expires).toBeInstanceOf(Date);

    const expiresIn = options.expires.getTime() - Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresIn).toBeGreaterThan(sevenDaysMs - 5000);
    expect(expiresIn).toBeLessThanOrEqual(sevenDaysMs);
  });

  test("generates a verifiable JWT containing userId and email", async () => {
    await createSession("user-456", "hello@test.com");

    const token = mockSet.mock.calls[0][1];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-456");
    expect(payload.email).toBe("hello@test.com");
    expect(payload.exp).toBeDefined();
    expect(payload.iat).toBeDefined();
  });
});

describe("getSession", () => {
  test("returns null when no cookie is set", async () => {
    mockGet.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await createValidToken("user-789", "valid@test.com");
    mockGet.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-789");
    expect(session!.email).toBe("valid@test.com");
  });

  test("returns null for an invalid token", async () => {
    mockGet.mockReturnValue({ value: "not-a-real-jwt" });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for a token signed with the wrong secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "user-1", email: "a@b.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(wrongSecret);

    mockGet.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const token = await new SignJWT({ userId: "user-1", email: "a@b.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("0s")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 10)
      .sign(JWT_SECRET);

    mockGet.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("reads from the auth-token cookie", async () => {
    mockGet.mockReturnValue(undefined);

    await getSession();

    expect(mockGet).toHaveBeenCalledWith("auth-token");
  });
});
