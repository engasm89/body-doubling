"use client";

import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

export function useAnonymousUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(firebaseAuth));

  useEffect(() => {
    let mounted = true;
    if (!firebaseAuth) {
      return;
    }
    const authClient = firebaseAuth;

    const unsubscribe = onAuthStateChanged(authClient, async (nextUser) => {
      if (!mounted) return;

      if (nextUser) {
        setUser(nextUser);
        setLoading(false);
        return;
      }

      try {
        const credential = await signInAnonymously(authClient);
        if (!mounted) return;
        setUser(credential.user);
      } catch {
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { user, loading };
}
