"use client";

import {
  User,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
} from "firebase/auth";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, hasFirebaseConfig } from "@/lib/firebase";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  hasFirebase: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasFirebaseConfig && Boolean(auth));

  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      return;
    }
    const authClient = auth;

    const unsubscribe = onAuthStateChanged(authClient, async (nextUser) => {
      try {
        setUser(nextUser);

        if (!nextUser) {
          await signInAnonymously(authClient);
          return;
        }

        const { upsertUser } = await import("@/lib/firebase/firestore");
        await upsertUser(nextUser.uid);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      hasFirebase: hasFirebaseConfig,
      signIn: async () => {
        if (!auth) return;
        await signInAnonymously(auth);
      },
      logout: async () => {
        if (!auth) return;
        await signOut(auth);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
