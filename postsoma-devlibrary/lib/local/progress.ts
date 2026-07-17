"use client";

import { useState, useEffect, useCallback } from "react";

const PROGRESS_STORAGE_KEY = "postsoma_path_progress";

// Gets the list of completed step IDs from localStorage
export function getCompletedSteps(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setCompletedSteps(steps: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(steps));
  window.dispatchEvent(new Event("postsoma_progress_changed"));
}

export function toggleStepCompletion(stepId: string): boolean {
  const current = getCompletedSteps();
  const index = current.indexOf(stepId);
  let completed = false;

  if (index >= 0) {
    current.splice(index, 1);
  } else {
    current.push(stepId);
    completed = true;
  }

  setCompletedSteps(current);
  return completed;
}

export function usePathProgress() {
  const [completedSteps, setCompletedStepsState] = useState<string[]>([]);

  useEffect(() => {
    // Initial load
    setCompletedStepsState(getCompletedSteps());

    const handleCustomChange = () => {
      setCompletedStepsState(getCompletedSteps());
    };

    window.addEventListener("postsoma_progress_changed", handleCustomChange);

    return () => {
      window.removeEventListener("postsoma_progress_changed", handleCustomChange);
    };
  }, []);

  const toggleStep = useCallback((id: string) => {
    return toggleStepCompletion(id);
  }, []);

  const isStepCompleted = useCallback(
    (id: string) => {
      return completedSteps.includes(id);
    },
    [completedSteps]
  );

  return {
    completedSteps,
    toggleStep,
    isStepCompleted,
  };
}
