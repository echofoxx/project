"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

function FormShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <FormShell
      title="Sign in"
      subtitle="Welcome back. Pick up where you left off."
    >
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const form = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await signIn("credentials", {
              email: form.get("email"),
              password: form.get("password"),
              redirect: false,
            });
            if (result?.error) {
              setError("Invalid email or password.");
              return;
            }
            router.push(callbackUrl);
            router.refresh();
          });
        }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            name="email"
            type="email"
            required
            className={inputClass}
            autoComplete="email"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            name="password"
            type="password"
            required
            className={inputClass}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        No account?{" "}
        <a href="/sign-up" className="font-medium text-indigo-600">
          Create one
        </a>
      </p>
    </FormShell>
  );
}

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <FormShell
      title="Create your account"
      subtitle="Set up your workspace in under a minute."
    >
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const form = new FormData(e.currentTarget);
          const payload = {
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
          };
          startTransition(async () => {
            const res = await fetch("/api/auth/sign-up", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error ?? "Something went wrong.");
              return;
            }
            const result = await signIn("credentials", {
              email: payload.email,
              password: payload.password,
              redirect: false,
            });
            if (result?.error) {
              setError("Account created, but sign-in failed. Try signing in.");
              return;
            }
            router.push("/dashboard");
            router.refresh();
          });
        }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input
            name="name"
            type="text"
            required
            className={inputClass}
            autoComplete="name"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            name="email"
            type="email"
            required
            className={inputClass}
            autoComplete="email"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className={inputClass}
            autoComplete="new-password"
          />
          <span className="mt-1 block text-xs text-slate-400">
            At least 8 characters.
          </span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {isPending ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        Already have an account?{" "}
        <a href="/sign-in" className="font-medium text-indigo-600">
          Sign in
        </a>
      </p>
    </FormShell>
  );
}
