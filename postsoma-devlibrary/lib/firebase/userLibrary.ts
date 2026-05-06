import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import { app } from "./client";
import type {
  UserBookmark,
  UserProgress,
  ReadingStatus,
} from "../types/userLibrary";

const db = getFirestore(app);

export async function addBookmark(
  userId: string,
  resourceId: string,
): Promise<void> {
  const bookmarkRef = doc(db, `users/${userId}/bookmarks/${resourceId}`);
  await setDoc(bookmarkRef, {
    resourceId,
    createdAt: new Date().toISOString(),
  });
}

export async function removeBookmark(
  userId: string,
  resourceId: string,
): Promise<void> {
  const bookmarkRef = doc(db, `users/${userId}/bookmarks/${resourceId}`);
  await deleteDoc(bookmarkRef);
}

export async function listBookmarks(userId: string): Promise<UserBookmark[]> {
  const bookmarksRef = collection(db, `users/${userId}/bookmarks`);
  const snapshot = await getDocs(bookmarksRef);
  return snapshot.docs.map((doc) => doc.data() as UserBookmark);
}

export async function setReadingStatus(
  userId: string,
  resourceId: string,
  status: ReadingStatus,
): Promise<void> {
  const progressRef = doc(db, `users/${userId}/progress/${resourceId}`);
  
  if (status === "not_started") {
    // If not started, just remove the progress document
    await deleteDoc(progressRef);
    return;
  }

  await setDoc(
    progressRef,
    {
      resourceId,
      status,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }, // Keep lastOpenedAt if it exists
  );
}

export async function listProgress(userId: string): Promise<UserProgress[]> {
  const progressRef = collection(db, `users/${userId}/progress`);
  const snapshot = await getDocs(progressRef);
  return snapshot.docs.map((doc) => doc.data() as UserProgress);
}
