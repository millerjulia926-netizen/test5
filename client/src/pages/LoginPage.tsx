import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate("/notes");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page" data-testid="login-page">
      <h1>{isSignup ? "Create account" : "Log in"}</h1>
      <form onSubmit={handleSubmit}>
        {error ? <p className="auth-page__error">{error}</p> : null}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
        </button>
      </form>
      <button type="button" className="link-button" onClick={() => setIsSignup((value) => !value)}>
        {isSignup ? "Already have an account? Log in" : "Need an account? Sign up"}
      </button>
    </section>
  );
}
