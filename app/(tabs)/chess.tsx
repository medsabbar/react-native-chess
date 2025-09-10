import ChessBoard from "@/components/ChessBoard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { playCaptureSound, playMoveSound } from "@/utils/soundUtils";
import { Chess } from "chess.js";
import { router, useLocalSearchParams } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Dimensions, Pressable, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

// Difficulty mappings for Stockfish
const MOVETIME_BY_DIFFICULTY: Record<"easy" | "medium" | "hard", number> = {
  easy: 40,
  medium: 80,
  hard: 160,
};
const SKILL_BY_DIFFICULTY: Record<"easy" | "medium" | "hard", number> = {
  easy: 1,
  medium: 5,
  hard: 10,
};

export default function ChessScreen() {
  const params = useLocalSearchParams<{
    gameMode?: string;
    difficulty?: string;
  }>();
  
  const gameMode = (params.gameMode as "human-vs-ai" | "human-vs-human") || "human-vs-ai";
  const initialDifficulty = (params.difficulty as "easy" | "medium" | "hard") || "medium";
  
  const [game, setGame] = useState(() => new Chess());
  const [isAITurn, setIsAITurn] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">(initialDifficulty);

  // Stockfish via hidden WebView
  const webViewRef = useRef<WebView | null>(null);
  // Engine readiness not needed for UI
  const awaitingBestMoveRef = useRef(false);

  const stockfishHtml = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body>
  <script>
    function post(msg){ try { window.ReactNativeWebView.postMessage(String(msg)); } catch(e){} }
    post('webview-started');
    // Queue commands until worker is ready
    window._sf_queue = [];
    window.SF_SEND = function(cmd){ window._sf_queue.push(String(cmd)); };
    (function init(){
      var url = 'https://cdn.jsdelivr.net/gh/nmrugg/stockfish.js/stockfish.js';
      fetch(url).then(function(r){ return r.text(); }).then(function(src){
        var blob = new Blob([src], { type: 'application/javascript' });
        var worker = new Worker(URL.createObjectURL(blob));
        window._sf_worker = worker;
        worker.onmessage = function(e){ var line = (e && e.data) ? e.data : e; post(line); };
        // Replace SF_SEND and flush queued commands
        window.SF_SEND = function(cmd){ if (worker) { worker.postMessage(String(cmd)); } };
        var q = window._sf_queue || [];
        for (var i = 0; i < q.length; i++){ try { window.SF_SEND(q[i]); } catch(e){} }
        window._sf_queue = [];
        post('worker-created');
      }).catch(function(err){ post('worker-fetch-error: ' + err); });
    })();
  </script>
  </body></html>`;

  const fen = useMemo(() => game.fen(), [game]);
  const statusText = useMemo(() => {
    if (game.isCheckmate()) return "Checkmate";
    if (game.isStalemate()) return "Stalemate";
    if (game.isDraw()) return "Draw";
    if (gameMode === "human-vs-ai" && isAITurn) return "AI is thinking...";
    return `${game.turn() === "w" ? "White" : "Black"} to move`;
  }, [game, isAITurn, gameMode]);

  const onMove = useCallback(
    (from: string, to: string) => {
      // Don't allow moves during AI turn
      if (gameMode === "human-vs-ai" && isAITurn) {
        console.log("Blocking move - AI turn in progress");
        return false;
      }

      console.log(
        "Move attempt:",
        from,
        "to",
        to,
        "current turn:",
        game.turn(),
        "game mode:",
        gameMode
      );
      const next = new Chess(game.fen());
      const result = next.move({ from, to, promotion: "q" as any });
      if (result) {
        console.log("Move successful, new turn:", next.turn());
        setGame(next);

        // If playing against AI and it's now black's turn, trigger AI move
        if (gameMode === "human-vs-ai" && next.turn() === "b" && !next.isGameOver()) {
          console.log("Setting AI turn to true - black to move");
          setIsAITurn(true);
        }

        return true;
      } else {
        console.log("Move failed");
      }
      return false;
    },
    [game, isAITurn, gameMode]
  );

  // AI move logic using Stockfish
  const makeAIMove = useCallback(async () => {
    if (!isAITurn || game.isGameOver()) return;
    if (!webViewRef.current) return;
    if (awaitingBestMoveRef.current) return;

    try {
      awaitingBestMoveRef.current = true;
      const fenNow = game.fen();
      const movetime = MOVETIME_BY_DIFFICULTY[aiDifficulty];
      const skill = SKILL_BY_DIFFICULTY[aiDifficulty];
      // Initialize engine and search (commands will queue until worker ready)
      const js = `window.SF_SEND && (SF_SEND('uci'), SF_SEND('isready'), SF_SEND('ucinewgame'), SF_SEND('position fen ${fenNow.replace(
        /'/g,
        ""
      )}'), SF_SEND('setoption name Skill Level value ${skill}'), SF_SEND('go movetime ${movetime}')); true;`;
      webViewRef.current.injectJavaScript(js);

      // Fallback watchdog: if no bestmove within time, make a quick move
      const anyRef: any = webViewRef.current;
      if (anyRef._sfTimeout) clearTimeout(anyRef._sfTimeout);
      anyRef._sfTimeout = setTimeout(async () => {
        if (!awaitingBestMoveRef.current) return;
        console.log("Stockfish timeout - using fallback move");
        const quick = new Chess(fenNow);
        const legal = quick.moves({ verbose: true }) as any[];
        if (legal.length > 0) {
          const captures = legal.filter((m) => !!m.captured);
          const pick = captures[0] || legal[0];
          const next = new Chess(fenNow);
          const pieceAtTarget = next.get(pick.to as any);
          const res = next.move({
            from: pick.from,
            to: pick.to,
            promotion: (pick.promotion as any) || ("q" as any),
          });
          if (res) {
            setGame(next);
            setIsAITurn(false);
            if (pieceAtTarget) {
              await playCaptureSound();
            } else {
              await playMoveSound();
            }
          }
        }
        awaitingBestMoveRef.current = false;
      }, Math.max(300, MOVETIME_BY_DIFFICULTY[aiDifficulty] + 900));
    } catch (e) {
      console.log("Error starting Stockfish search", e);
      awaitingBestMoveRef.current = false;
      setIsAITurn(false);
    }
  }, [aiDifficulty, game, isAITurn]);

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    console.log("useEffect triggered", {
      isAITurn,
      gameMode,
      gameOver: game.isGameOver(),
      turn: game.turn(),
    });
    if (gameMode === "human-vs-ai" && isAITurn && !game.isGameOver()) {
      console.log("Setting timeout for AI move");
      const timer = setTimeout(() => {
        makeAIMove();
      }, 50); // Short delay to show "AI is thinking..."

      return () => clearTimeout(timer);
    }
  }, [isAITurn, game, makeAIMove, gameMode]);

  // Check if AI should move on game state change (for initial state or after reset)
  useEffect(() => {
    console.log("Checking if AI should move:", {
      gameMode,
      turn: game.turn(),
      isAITurn,
      isGameOver: game.isGameOver(),
      fen: game.fen(),
    });
    if (gameMode === "human-vs-ai" && game.turn() === "b" && !isAITurn && !game.isGameOver()) {
      console.log("Game is black's turn, setting AI turn");
      setIsAITurn(true);
    }
  }, [game, isAITurn, gameMode]);

  const goBackToWelcome = useCallback(() => {
    router.replace("/");
  }, []);

  const resetGame = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    setIsAITurn(false);
    Alert.alert("Game Reset", "A new game has been started");
  }, []);

  const changeDifficulty = useCallback(
    (difficulty: "easy" | "medium" | "hard") => {
      setAiDifficulty(difficulty);
      Alert.alert("Difficulty Changed", `AI difficulty set to ${difficulty}`);
    },
    []
  );

  const windowWidth = Dimensions.get("window").width;
  const boardSize = Math.min(windowWidth - 32, 420);

  return (
    <ThemedView style={styles.container}>
      {/* Header with back button and game info */}
      <View style={styles.header}>
        <Pressable onPress={goBackToWelcome} style={styles.backButton}>
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </Pressable>
        <View style={styles.headerInfo}>
          <ThemedText style={styles.gameModeText}>
            {gameMode === "human-vs-ai" ? "vs AI" : "Local Game"}
          </ThemedText>
          {gameMode === "human-vs-ai" && (
            <ThemedText style={styles.difficultyText}>
              {aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1)}
            </ThemedText>
          )}
        </View>
        <Pressable onPress={resetGame} style={styles.resetButton}>
          <ThemedText style={styles.resetButtonText}>Reset</ThemedText>
        </Pressable>
      </View>

      <View
        style={{
          flex: 1,
          alignSelf: "stretch",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ChessBoard
          fen={fen}
          size={boardSize}
          onMove={onMove}
          isPlayerTurn={gameMode === "human-vs-human" || !isAITurn}
          playerColor={gameMode === "human-vs-human" ? undefined : "w"}
        />
        <View style={{ height: 12 }} />
        <ThemedText style={styles.statusText}>{statusText}</ThemedText>
        
        {/* Show difficulty selector only for AI games and before any move has been made */}
        {gameMode === "human-vs-ai" && fen === new Chess().fen() && (
          <View style={styles.difficultyRow}>
            <ThemedText style={styles.difficultyLabel}>
              AI Difficulty
            </ThemedText>
            <View style={styles.difficultyButtons}>
              <Pressable
                onPress={() => changeDifficulty("easy")}
                style={[
                  styles.difficultyButton,
                  aiDifficulty === "easy" && styles.difficultyButtonActive,
                ]}
              >
                <ThemedText
                  style={[
                    styles.difficultyButtonText,
                    aiDifficulty === "easy" &&
                      styles.difficultyButtonTextActive,
                  ]}
                >
                  Easy
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => changeDifficulty("medium")}
                style={[
                  styles.difficultyButton,
                  aiDifficulty === "medium" && styles.difficultyButtonActive,
                ]}
              >
                <ThemedText
                  style={[
                    styles.difficultyButtonText,
                    aiDifficulty === "medium" &&
                      styles.difficultyButtonTextActive,
                  ]}
                >
                  Medium
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => changeDifficulty("hard")}
                style={[
                  styles.difficultyButton,
                  aiDifficulty === "hard" && styles.difficultyButtonActive,
                ]}
              >
                <ThemedText
                  style={[
                    styles.difficultyButtonText,
                    aiDifficulty === "hard" &&
                      styles.difficultyButtonTextActive,
                  ]}
                >
                  Hard
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}
      </View>
      
      {/* Hidden Stockfish WebView - only render for AI games */}
      {gameMode === "human-vs-ai" && (
        <WebView
          ref={(r) => {
            webViewRef.current = r;
          }}
          originWhitelist={["*"]}
          source={{ html: stockfishHtml }}
          onLoadEnd={() => {
            webViewRef.current?.injectJavaScript(
              "window.SF_SEND && (SF_SEND('uci'), SF_SEND('isready')); true;"
            );
          }}
          onMessage={async (event) => {
            const data = String(event.nativeEvent.data || "");
            if (data.includes("uciok")) {
              webViewRef.current?.injectJavaScript(
                "window.SF_SEND && SF_SEND('isready'); true;"
              );
            }
            // readyok indicates the engine is ready
            if (data.startsWith("bestmove")) {
              const parts = data.split(/\s+/);
              const moveStr = parts[1] || "";
              if (moveStr.length >= 4) {
                const from = moveStr.slice(0, 2);
                const to = moveStr.slice(2, 4);
                const promo =
                  moveStr.length > 4 ? moveStr.slice(4, 5) : undefined;
                const next = new Chess(game.fen());
                const pieceAtTarget = next.get(to as any);
                const res = next.move({
                  from,
                  to,
                  promotion: (promo as any) || ("q" as any),
                });
                if (res) {
                  setGame(next);
                  setIsAITurn(false);
                  if (pieceAtTarget) {
                    await playCaptureSound();
                  } else {
                    await playMoveSound();
                  }
                }
              }
              awaitingBestMoveRef.current = false;
              const anyRef: any = webViewRef.current;
              if (anyRef && anyRef._sfTimeout) clearTimeout(anyRef._sfTimeout);
            }
          }}
          onError={(e) => {
            console.log("WebView error", e.nativeEvent);
          }}
          style={{ width: 0, height: 0, opacity: 0 }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    minWidth: 60,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#007AFF",
  },
  headerInfo: {
    alignItems: "center",
    flex: 1,
  },
  gameModeText: {
    fontSize: 16,
    fontWeight: "600",
  },
  difficultyText: {
    fontSize: 12,
    opacity: 0.7,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FF3B30",
    borderRadius: 6,
    minWidth: 60,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  difficultyRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  difficultyButtons: {
    flexDirection: "row",
    gap: 4,
  },
  difficultyButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#d0d0d0",
  },
  difficultyButtonActive: {
    backgroundColor: "#34C759",
    borderColor: "#34C759",
  },
  difficultyButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
  difficultyButtonTextActive: {
    color: "#fff",
  },
});
