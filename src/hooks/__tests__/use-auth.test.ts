import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (input: unknown) => mockCreateProject(input),
}));

import { useAuth } from "@/hooks/use-auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth", () => {
  test("returns signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.signIn).toBeTypeOf("function");
    expect(result.current.signUp).toBeTypeOf("function");
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    test("calls signIn action and returns the result", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());

      let response: { success: boolean; error?: string } | undefined;
      await act(async () => {
        response = await result.current.signIn("test@example.com", "password123");
      });

      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
      expect(response).toEqual({ success: false, error: "Invalid credentials" });
    });

    test("sets isLoading to true during sign in and false after", async () => {
      let resolveSignIn!: (value: { success: boolean }) => void;
      mockSignIn.mockReturnValue(
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
      );

      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);

      let signInPromise: Promise<unknown>;
      act(() => {
        signInPromise = result.current.signIn("a@b.com", "pass");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: false });
        await signInPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false when signIn action throws", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.signIn("a@b.com", "pw")).rejects.toThrow("Network error");
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not navigate when signIn fails", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "bad creds" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    describe("post sign-in routing", () => {
      beforeEach(() => {
        mockSignIn.mockResolvedValue({ success: true });
      });

      test("saves anonymous work as a project and navigates to it", async () => {
        mockGetAnonWorkData.mockReturnValue({
          messages: [{ role: "user", content: "hello" }],
          fileSystemData: { "/": { type: "directory" } },
        });
        mockCreateProject.mockResolvedValue({ id: "proj-anon" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("a@b.com", "pw");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [{ role: "user", content: "hello" }],
            data: { "/": { type: "directory" } },
          })
        );
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/proj-anon");
      });

      test("navigates to most recent project when no anonymous work exists", async () => {
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue([
          { id: "proj-1" },
          { id: "proj-2" },
        ]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("a@b.com", "pw");
        });

        expect(mockPush).toHaveBeenCalledWith("/proj-1");
        expect(mockCreateProject).not.toHaveBeenCalled();
      });

      test("creates a new project when no anon work and no existing projects", async () => {
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "proj-new" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("a@b.com", "pw");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [],
            data: {},
          })
        );
        expect(mockPush).toHaveBeenCalledWith("/proj-new");
      });

      test("treats anon work with empty messages as no work", async () => {
        mockGetAnonWorkData.mockReturnValue({
          messages: [],
          fileSystemData: {},
        });
        mockGetProjects.mockResolvedValue([{ id: "proj-existing" }]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("a@b.com", "pw");
        });

        expect(mockClearAnonWork).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/proj-existing");
      });
    });
  });

  describe("signUp", () => {
    test("calls signUp action and returns the result", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());

      let response: { success: boolean; error?: string } | undefined;
      await act(async () => {
        response = await result.current.signUp("test@example.com", "password123");
      });

      expect(mockSignUp).toHaveBeenCalledWith("test@example.com", "password123");
      expect(response).toEqual({ success: false, error: "Email already registered" });
    });

    test("sets isLoading to true during sign up and false after", async () => {
      let resolveSignUp!: (value: { success: boolean }) => void;
      mockSignUp.mockReturnValue(
        new Promise((resolve) => {
          resolveSignUp = resolve;
        })
      );

      const { result } = renderHook(() => useAuth());

      let signUpPromise: Promise<unknown>;
      act(() => {
        signUpPromise = result.current.signUp("a@b.com", "pass");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: false });
        await signUpPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false when signUp action throws", async () => {
      mockSignUp.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.signUp("a@b.com", "pw")).rejects.toThrow("Server error");
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not navigate when signUp fails", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "exists" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("a@b.com", "pw");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("runs post sign-in flow on successful sign up", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "proj-after-signup" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@user.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-after-signup");
    });
  });
});
