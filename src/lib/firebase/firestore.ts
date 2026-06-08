"use client";

import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  type CollectionReference,
  type DocumentReference,
  type WithFieldValue,
} from "firebase/firestore";
import { firebaseAuth, firestore } from "@/lib/firebase/client";
import type {
  CheckInEventDocument,
  CoachPreferencesDocument,
  CreateSessionInput,
  DebriefSummaryDocument,
  SaveCheckInInput,
  SessionDocument,
  SessionGoalDocument,
  UserDocument,
  UserResponseDocument,
} from "@/lib/firebase/types";

function requireFirestore() {
  if (!firestore) {
    throw new Error("Firebase Firestore client is unavailable. Check NEXT_PUBLIC_FIREBASE_* env vars.");
  }
  return firestore;
}

function usersCollection() {
  return collection(requireFirestore(), "users") as CollectionReference<UserDocument>;
}

function sessionsCollection() {
  return collection(requireFirestore(), "sessions") as CollectionReference<SessionDocument>;
}

function sessionGoalsCollection() {
  return collection(requireFirestore(), "session_goals") as CollectionReference<SessionGoalDocument>;
}

function checkInEventsCollection() {
  return collection(requireFirestore(), "check_in_events") as CollectionReference<CheckInEventDocument>;
}

function userResponsesCollection() {
  return collection(requireFirestore(), "user_responses") as CollectionReference<UserResponseDocument>;
}

function debriefSummariesCollection() {
  return collection(requireFirestore(), "debrief_summaries") as CollectionReference<DebriefSummaryDocument>;
}

function coachPreferencesCollection() {
  return collection(requireFirestore(), "coach_preferences") as CollectionReference<CoachPreferencesDocument>;
}

function requireUid(userId?: string): string {
  const uid = userId ?? firebaseAuth?.currentUser?.uid;
  if (!uid) {
    throw new Error("Anonymous auth user is required before writing Firestore data.");
  }
  return uid;
}

export async function upsertUser(userId?: string): Promise<void> {
  const uid = requireUid(userId);
  const userRef = doc(usersCollection(), uid);
  const payload: WithFieldValue<UserDocument> = {
    uid,
    is_anonymous: true,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  await setDoc(userRef, payload, { merge: true });
}

export async function createSession(
  input: CreateSessionInput,
): Promise<DocumentReference> {
  const uid = requireUid(input.user_id);
  const payload: WithFieldValue<SessionDocument> = {
    ...input,
    user_id: uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  return addDoc(sessionsCollection(), payload);
}

export async function createSessionGoal(
  input: Omit<SessionGoalDocument, "created_at" | "updated_at" | "user_id"> & {
    user_id?: string;
  }
): Promise<DocumentReference> {
  const uid = requireUid(input.user_id);
  return addDoc(sessionGoalsCollection(), {
    ...input,
    user_id: uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function saveCheckIn(
  input: SaveCheckInInput,
): Promise<DocumentReference> {
  const uid = requireUid(input.user_id);
  return addDoc(checkInEventsCollection(), {
    ...input,
    user_id: uid,
    created_at: serverTimestamp(),
  });
}

export async function saveUserResponse(
  input: Omit<UserResponseDocument, "created_at" | "updated_at" | "user_id"> & {
    user_id?: string;
  }
): Promise<DocumentReference> {
  const uid = requireUid(input.user_id);
  return addDoc(userResponsesCollection(), {
    ...input,
    user_id: uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function saveDebriefSummary(
  input: Omit<DebriefSummaryDocument, "created_at" | "updated_at" | "user_id"> & {
    user_id?: string;
  }
): Promise<DocumentReference> {
  const uid = requireUid(input.user_id);
  return addDoc(debriefSummariesCollection(), {
    ...input,
    user_id: uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function saveCoachPreferences(
  input: Omit<CoachPreferencesDocument, "updated_at" | "user_id"> & {
    user_id?: string;
  }
): Promise<void> {
  const uid = requireUid(input.user_id);
  const preferencesRef = doc(coachPreferencesCollection(), uid);
  await setDoc(
    preferencesRef,
    {
      ...input,
      user_id: uid,
      updated_at: serverTimestamp(),
    },
    { merge: true }
  );
}
