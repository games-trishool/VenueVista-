'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  getMultiFactorResolver,
  inMemoryPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  TotpMultiFactorGenerator,
  type MultiFactorError,
  type MultiFactorResolver,
} from 'firebase/auth';
import {
  ArrowRight,
  Building2,
  CircleCheck,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function LoginForm({
  developmentEnabled,
  firebaseConfig,
}: {
  developmentEnabled: boolean;
  firebaseConfig: FirebaseOptions;
}) {
  const router = useRouter();
  const configured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function establishSession(idToken?: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(idToken ? { idToken } : { development: true }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Sign-in failed.',
      );
    router.replace('/');
    router.refresh();
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const auth = getAuth(getApps().length ? getApp() : initializeApp(firebaseConfig));
      await setPersistence(auth, inMemoryPersistence);
      let token: string;
      if (resolver) {
        const hint = resolver.hints.find(
          (item) => item.factorId === TotpMultiFactorGenerator.FACTOR_ID,
        );
        if (!hint)
          throw new Error(
            'An authenticator-app MFA factor must be enrolled for this administrator account.',
          );
        const credential = await resolver.resolveSignIn(
          TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code),
        );
        token = await credential.user.getIdToken(true);
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        token = await credential.user.getIdToken(true);
      }
      await establishSession(token);
      await signOut(auth); // The platform session lives only in an HTTP-only server cookie.
    } catch (cause) {
      if ((cause as MultiFactorError).code === 'auth/multi-factor-auth-required') {
        const auth = getAuth(getApps().length ? getApp() : initializeApp(firebaseConfig));
        const nextResolver = getMultiFactorResolver(auth, cause as MultiFactorError);
        if (
          !nextResolver.hints.some((hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID)
        ) {
          setError(
            'Enroll an authenticator-app MFA factor with your identity administrator before signing in.',
          );
        } else {
          setResolver(nextResolver);
        }
      } else {
        setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.');
      }
    } finally {
      setPassword('');
      setBusy(false);
    }
  }

  async function developmentLogin() {
    setBusy(true);
    setError('');
    try {
      await establishSession();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The API is unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-story">
        <a className="brand" href="/login" aria-label="VenueVista console">
          <span className="brand-mark">
            <Building2 size={23} />
          </span>
          <span>
            venue<span className="brand-light">vista</span>
            <small>PLATFORM CONSOLE</small>
          </span>
        </a>
        <div className="login-story-content">
          <div className="eyebrow">
            <Sparkles size={15} /> EVERY CELEBRATION STARTS SOMEWHERE
          </div>
          <h1>
            Great venues.
            <br />
            Thoughtfully
            <br />
            <em>curated.</em>
          </h1>
          <p>
            Build trust at every step. Review the spaces, support our partners, and help people find
            a place worth celebrating.
          </p>
          <div className="login-illustration" aria-hidden="true">
            <div className="arch arch-outer" />
            <div className="arch arch-middle" />
            <div className="arch arch-inner">
              <Building2 size={64} strokeWidth={1} />
              <span>VENUEVISTA</span>
            </div>
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
          </div>
        </div>
        <div className="story-footer">
          <span className="gold-dot" /> Andhra Pradesh & Telangana{' '}
          <span>Built for celebrations.</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-box">
          <div className="login-shield">
            <ShieldCheck size={27} />
          </div>
          <div className="eyebrow muted">RESTRICTED ACCESS</div>
          <h2>Welcome to the console</h2>
          <p className="muted">
            Sign in with your approved administrator account. Multi-factor authentication is
            required.
          </p>
          {error && (
            <div role="alert" className="alert alert-error">
              {error}
            </div>
          )}
          {configured ? (
            <form onSubmit={login} className="form-stack">
              {resolver ? (
                <label>
                  Authenticator code
                  <input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    required
                    placeholder="6-digit code"
                    autoFocus
                  />
                </label>
              ) : (
                <>
                  <label>
                    Work email
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="username"
                      required
                      placeholder="you@venuevista.com"
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      minLength={8}
                      required
                      placeholder="Enter your password"
                    />
                  </label>
                </>
              )}
              <button type="submit" className="button button-primary button-full" disabled={busy}>
                {busy ? 'Verifying account…' : resolver ? 'Verify & sign in' : 'Continue securely'}
                <ArrowRight size={17} />
              </button>
              {resolver && (
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => {
                    setResolver(null);
                    setCode('');
                  }}
                  disabled={busy}
                >
                  Use another account
                </button>
              )}
            </form>
          ) : (
            <div className="setup-notice">
              <LockKeyhole size={19} />
              <div>
                <strong>Production sign-in awaits configuration</strong>
                <p>
                  Configure Firebase for this dashboard and enrol administrators with
                  authenticator-app MFA. Public registration is not available here.
                </p>
              </div>
            </div>
          )}
          {developmentEnabled && (
            <div className="development-box">
              <span className="badge badge-gold">DEVELOPMENT ONLY</span>
              <p>
                Use the seeded administrator to exercise the local approval workflow. This option is
                disabled in production.
              </p>
              <button
                className="button button-secondary button-full"
                onClick={developmentLogin}
                disabled={busy}
              >
                {busy ? 'Connecting…' : 'Enter development console'}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          <div className="login-assurance">
            <Fingerprint size={18} />
            <span>Role-verified access</span>
            <CircleCheck size={16} />
            <span>Audited decisions</span>
          </div>
        </div>
        <p className="login-footnote">VenueVista Operations · Authorised personnel only</p>
      </section>
    </main>
  );
}
