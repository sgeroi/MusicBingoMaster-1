import { create } from 'zustand';

interface User {
  id: number;
  username: string;
  isAdmin: boolean;
}

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

export async function login(username: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const user = await res.json();
  useAuth.getState().setUser(user);
  return user;
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  useAuth.getState().setUser(null);
}
