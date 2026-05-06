export type ReadingStatus = "not_started" | "reading" | "completed";

export interface UserBookmark {
  resourceId: string;
  createdAt: string;
}

export interface UserProgress {
  resourceId: string;
  status: ReadingStatus;
  lastOpenedAt?: string;
  updatedAt: string;
}

export interface UserLibrary {
  bookmarks: UserBookmark[];
  progress: UserProgress[];
}
