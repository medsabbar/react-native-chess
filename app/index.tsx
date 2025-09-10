import WelcomeScreen from "@/components/WelcomeScreen";
import { router } from "expo-router";
import React from "react";

export default function Index() {
  const handleStartGame = (
    gameMode: "human-vs-ai" | "human-vs-human",
    difficulty?: "easy" | "medium" | "hard"
  ) => {
    // Navigate to chess screen with game mode and difficulty parameters
    const params = new URLSearchParams();
    params.set("gameMode", gameMode);
    if (difficulty) {
      params.set("difficulty", difficulty);
    }
    router.push(`/(tabs)/chess?${params.toString()}`);
  };

  return <WelcomeScreen onStartGame={handleStartGame} />;
}
