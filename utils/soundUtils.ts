import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";

let moveSound: Audio.Sound | null = null;
let captureSound: Audio.Sound | null = null;
let audioInitialized = false;

// Initialize audio and sounds
const initializeAudio = async () => {
  try {
    if (!audioInitialized) {
      // Set audio mode for mobile devices
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      });
      audioInitialized = true;
      console.log("Audio mode set successfully");
    }
  } catch (error) {
    console.log("Error setting audio mode:", error);
  }
};

// Initialize sounds
const initializeSounds = async () => {
  try {
    await initializeAudio();

    if (!moveSound) {
      console.log("Loading move sound...");
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/move-self.mp3"),
        { shouldPlay: false }
      );
      moveSound = sound;
      console.log("Move sound loaded");
    }

    if (!captureSound) {
      console.log("Loading capture sound...");
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/capture.mp3"),
        { shouldPlay: false }
      );
      captureSound = sound;
      console.log("Capture sound loaded");
    }
  } catch (error) {
    console.log("Error initializing sounds:", error);
  }
};

// Sound utilities for chess moves
export const playMoveSound = async (): Promise<void> => {
  try {
    console.log("Attempting to play move sound...");
    await initializeSounds();
    if (moveSound) {
      await moveSound.setPositionAsync(0); // Reset to beginning
      await moveSound.playAsync();
      console.log("Move sound played successfully");
    } else {
      console.log("Move sound played (sound file not loaded)");
    }
  } catch (error) {
    console.log("Error playing move sound:", error);
  }
};

export const playCaptureSound = async (): Promise<void> => {
  try {
    console.log("Attempting to play capture sound...");
    await initializeSounds();
    if (captureSound) {
      await captureSound.setPositionAsync(0); // Reset to beginning
      await captureSound.playAsync();
      console.log("Capture sound played successfully");
    } else {
      console.log("Capture sound played (sound file not loaded)");
    }
  } catch (error) {
    console.log("Error playing capture sound:", error);
  }
};

// Clean up sounds when app is closed
export const cleanupSounds = async (): Promise<void> => {
  try {
    if (moveSound) {
      await moveSound.unloadAsync();
      moveSound = null;
    }
    if (captureSound) {
      await captureSound.unloadAsync();
      captureSound = null;
    }
  } catch (error) {
    console.log("Error cleaning up sounds:", error);
  }
};
