import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import React, { useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

interface WelcomeScreenProps {
  onStartGame: (gameMode: "human-vs-ai" | "human-vs-human", difficulty?: "easy" | "medium" | "hard") => void;
}

export default function WelcomeScreen({ onStartGame }: WelcomeScreenProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  const windowWidth = Dimensions.get("window").width;
  const isLargeScreen = windowWidth > 400;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <ThemedText style={[styles.title, isLargeScreen && styles.titleLarge]}>
            ♛ Chess Game ♛
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Choose your game mode
          </ThemedText>
        </View>

        {/* Game Mode Options */}
        <View style={styles.optionsContainer}>
          {/* Play vs AI */}
          <View style={styles.gameOptionSection}>
            <ThemedText style={styles.sectionTitle}>Play Against AI</ThemedText>
            
            {/* AI Difficulty Selection */}
            <View style={styles.difficultyContainer}>
              <ThemedText style={styles.difficultyLabel}>Difficulty:</ThemedText>
              <View style={styles.difficultyButtons}>
                {(["easy", "medium", "hard"] as const).map((difficulty) => (
                  <Pressable
                    key={difficulty}
                    onPress={() => setSelectedDifficulty(difficulty)}
                    style={[
                      styles.difficultyButton,
                      selectedDifficulty === difficulty && styles.difficultyButtonActive,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.difficultyButtonText,
                        selectedDifficulty === difficulty && styles.difficultyButtonTextActive,
                      ]}
                    >
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={[styles.gameButton, styles.aiButton]}
              onPress={() => onStartGame("human-vs-ai", selectedDifficulty)}
            >
              <ThemedText style={styles.gameButtonText}>
                🤖 Start AI Game
              </ThemedText>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Play vs Human */}
          <View style={styles.gameOptionSection}>
            <ThemedText style={styles.sectionTitle}>Play Against Friend</ThemedText>
            <ThemedText style={styles.sectionDescription}>
              Take turns on the same device
            </ThemedText>
            
            <Pressable
              style={[styles.gameButton, styles.humanButton]}
              onPress={() => onStartGame("human-vs-human")}
            >
              <ThemedText style={styles.gameButtonText}>
                👥 Start Local Game
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  titleLarge: {
    fontSize: 40,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
  optionsContainer: {
    width: "100%",
    gap: 24,
  },
  gameOptionSection: {
    alignItems: "center",
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    marginBottom: 8,
  },
  difficultyContainer: {
    alignItems: "center",
    gap: 8,
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  difficultyButtons: {
    flexDirection: "row",
    gap: 8,
  },
  difficultyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    borderWidth: 1.5,
    borderColor: "#d0d0d0",
    minWidth: 60,
    alignItems: "center",
  },
  difficultyButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  difficultyButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  difficultyButtonTextActive: {
    color: "#fff",
  },
  gameButton: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  aiButton: {
    backgroundColor: "#34C759",
  },
  humanButton: {
    backgroundColor: "#FF9500",
  },
  gameButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    width: "80%",
    alignSelf: "center",
    opacity: 0.5,
  },
});