"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { PasswordToggle } from "@/components/auth/PasswordToggle";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { User as UserIcon, Mail, Lock, ArrowRight, Atom } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const { setAuthSession } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  // Surface Google sign-up errors passed back via ?error=
  useEffect(() => {
    const err = searchParams.get("error");
    if (!err) return;
    const messages: Record<string, string> = {
      google_not_configured:
        "Google sign-up isn't set up yet. Add your Google keys to enable it.",
      google_denied: "Google sign-up was cancelled.",
      google_state: "Your Google session expired. Please try again.",
      google_token: "Couldn't complete Google sign-up. Please try again.",
      google_verify: "Couldn't verify your Google account. Please try again.",
      google_email: "Your Google account didn't share a verified email address.",
      google_account:
        "Something went wrong creating your account. Please try again.",
      account_disabled:
        "This account has been deactivated. Contact your administrator.",
    };
    addToast("error", messages[err] || "Google sign-up failed. Please try again.");
    // Clean the error out of the URL so it doesn't reappear on refresh
    router.replace("/register");
  }, [searchParams, addToast, router]);

  // Surface Google sign-up errors passed back via ?error=
  useEffect(() => {
    const err = searchParams.get('error')
    if (!err) return
    const messages: Record<string, string> = {
      google_not_configured: 'Google sign-up isn’t set up yet. Add your Google keys to enable it.',
      google_denied: 'Google sign-up was cancelled.',
      google_state: 'Your Google session expired. Please try again.',
      google_token: 'Couldn’t complete Google sign-up. Please try again.',
      google_verify: 'Couldn’t verify your Google account. Please try again.',
      google_email: 'Your Google account didn’t share a verified email address.',
      google_account: 'Something went wrong creating your account. Please try again.',
      account_disabled: 'This account has been deactivated. Contact your administrator.',
    }
    addToast('error', messages[err] || 'Google sign-up failed. Please try again.')
    // Clean the error out of the URL so it doesn't reappear on refresh
    router.replace('/register')
  }, [searchParams, addToast, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    if (password !== confirmPassword) {
      addToast("error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user && data.token) {
          setAuthSession(data.user, data.token);
        }
        addToast("success", "Account created! Just one more step.");
        // Same landing as Continue with Google — finish your profile first
        window.location.href = "/welcome";
      } else {
        addToast("error", data.error || "Failed to create account");
      }
    } catch {
      addToast("error", "Network error creating account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      contentClassName="max-w-sm"
      headline="Start your research Journey today."
      subheadline="Create an account to track papers, extract ArXiv metadata in one click, and collaborate with your lab."
      title="Create your account"
      subtitle="Set up your workspace in under a minute."
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Full Name *"
          placeholder="Dr. Evelyn Vance"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<UserIcon size={15} />}
          required
        />

        <Input
          label="Academic or Work Email *"
          placeholder="e.vance@stanford.edu"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail size={15} />}
          required
        />

        {/* Password with strength meter */}
        <div className="space-y-1.5">
          <Input
            label="Password *"
            placeholder="At least 6 characters"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={15} />}
            trailing={
              <PasswordToggle
                visible={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                label="password"
              />
            }
            required
          />

          {/* Password strength meter */}
          <PasswordStrengthMeter password={password} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Input
            label="Confirm Password *"
            placeholder="Re-enter your password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<Lock size={15} />}
            trailing={
              <PasswordToggle
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((v) => !v)}
                label="confirm password"
              />
            }
            required
          />
          {confirmPassword.length > 0 && confirmPassword !== password && (
            <span className="text-[10px] text-danger">
              Passwords don&apos;t match
            </span>
          )}
        </div>

        <Button
          type="submit"
          loading={loading}
          disabled={!!confirmPassword && confirmPassword !== password}
          className="w-full mt-5 h-11"
          icon={<ArrowRight size={15} />}
        >
          Create Account
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-default" />
        <span className="text-[11px] uppercase tracking-wider text-text-tertiary">
          or sign up with
        </span>
        <div className="h-px flex-1 bg-border-default" />
      </div>

      {/* Google sign-up */}
      <GoogleButton mode="register" label="Sign up with Google" />

      {/* Bottom link */}
      <p className="text-center text-[13px] text-text-secondary border-t border-border-default pt-4">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-accent hover:text-accent-hover font-semibold transition-colors"
        >
          Sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-subtle text-accent border border-accent/30 shadow-glow animate-spin-slow">
              <Atom size={26} />
            </div>
            <p className="text-xs text-text-secondary">Loading ResearchTrack...</p>
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
