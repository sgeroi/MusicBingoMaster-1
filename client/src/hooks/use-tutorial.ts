import { useState, useEffect } from "react";

const TUTORIAL_KEY = "bingo_tutorial_completed";

export function useTutorial() {
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(TUTORIAL_KEY) === "true";
  });

  const completeTutorial = () => {
    localStorage.setItem(TUTORIAL_KEY, "true");
    setHasCompletedTutorial(true);
  };

  const resetTutorial = () => {
    localStorage.removeItem(TUTORIAL_KEY);
    setHasCompletedTutorial(false);
  };

  return {
    hasCompletedTutorial,
    completeTutorial,
    resetTutorial,
  };
}
