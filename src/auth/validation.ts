export function validateEmail(email: string): string | null {
  if (!email?.trim()) {
    return "Email is required";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Invalid email address";
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must include a number";
  }

  return null;
}
