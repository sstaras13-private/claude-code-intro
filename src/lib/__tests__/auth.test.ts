// @vitest-environment node
import { test, expect, vi, beforeEach, describe } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
const mockGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ set: mockSet, get: mockGet })),
}));

import { createSession, getSession } from "../auth";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets a cookie named auth-token", async () => {
    await createSession("user-1", "test@example.com");
    expect(mockSet).toHaveBeenCalledOnce();
    expect(mockSet.mock.calls[0][0]).toBe("auth-token");
  });

  test("cookie has correct options", async () => {
    await createSession("user-1", "test@example.com");
    const [, , options] = mockSet.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.secure).toBe(false); // NODE_ENV is "test", not "production"
  });

  test("cookie expires approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, , options] = mockSet.mock.calls[0];
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  test("sets a valid signed JWT", async () => {
    await createSession("user-1", "test@example.com");
    const [, token] = mockSet.mock.calls[0];
    await expect(jwtVerify(token, JWT_SECRET)).resolves.toBeDefined();
  });

  test("token payload contains userId and email", async () => {
    await createSession("user-42", "hello@world.com");
    const [, token] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@world.com");
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockGet.mockReturnValue(undefined);
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null when cookie value is undefined", async () => {
    mockGet.mockReturnValue({ value: undefined });
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null when token is invalid", async () => {
    mockGet.mockReturnValue({ value: "not.a.valid.jwt" });
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null when token is signed with a different secret", async () => {
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

  test("returns null when token is expired", async () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 10; // 10 seconds in the past
    const token = await new SignJWT({ userId: "user-1", email: "a@b.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(expiredAt)
      .setIssuedAt()
      .sign(JWT_SECRET);
    mockGet.mockReturnValue({ value: token });
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await makeToken({ userId: "user-1", email: "test@example.com" });
    mockGet.mockReturnValue({ value: token });
    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("test@example.com");
  });

  test("reads the auth-token cookie by name", async () => {
    mockGet.mockReturnValue(undefined);
    await getSession();
    expect(mockGet).toHaveBeenCalledWith("auth-token");
  });
});
