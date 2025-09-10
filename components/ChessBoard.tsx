import { playCaptureSound, playMoveSound } from "@/utils/soundUtils";
import {
  Canvas,
  Circle,
  Group,
  Image,
  Rect,
  Text,
  useFont,
  useImage,
} from "@shopify/react-native-skia";
import { Chess, Square } from "chess.js";
import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

type ChessBoardProps = {
  fen: string;
  size: number;
  onMove: (from: string, to: string) => boolean | void;
  isPlayerTurn?: boolean;
  playerColor?: "w" | "b";
};

const LIGHT_SQUARE_COLOR = "#EEEED2";
const DARK_SQUARE_COLOR = "#769656";

const SELECTED_HIGHLIGHT_COLOR = "rgba(246, 246, 84, 0.45)";
const MOVE_DOT_COLOR = "rgba(33, 33, 33, 0.35)";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

// Chess piece PNG image mappings
const PIECE_IMAGES = {
  w: {
    k: require("@/assets/images/pieces/white-king.png"),
    q: require("@/assets/images/pieces/white-queen.png"),
    r: require("@/assets/images/pieces/white-rook.png"),
    b: require("@/assets/images/pieces/white-bishop.png"),
    n: require("@/assets/images/pieces/white-knight.png"),
    p: require("@/assets/images/pieces/white-pawn.png"),
  },
  b: {
    k: require("@/assets/images/pieces/black-king.png"),
    q: require("@/assets/images/pieces/black-queen.png"),
    r: require("@/assets/images/pieces/black-rook.png"),
    b: require("@/assets/images/pieces/black-bishop.png"),
    n: require("@/assets/images/pieces/black-knight.png"),
    p: require("@/assets/images/pieces/black-pawn.png"),
  },
};

function toSquare(fileIndex: number, rankIndexFromTop: number): string {
  // rankIndexFromTop: 0 is rank 8, 7 is rank 1
  const file = FILES[fileIndex];
  const rank = 8 - rankIndexFromTop;
  return `${file}${rank}`;
}

export default function ChessBoard(props: ChessBoardProps) {
  // IMPORTANT: don't default playerColor to "w"; when undefined we allow both colors (local game)
  const { fen, size, onMove, isPlayerTurn = true, playerColor } = props;
  const squareSize = size / 8;
  const fontSize = squareSize * 0.6;

  const font = useFont(
    require("@/assets/fonts/SpaceMono-Regular.ttf"),
    fontSize
  );

  // Load all chess piece images
  const whiteKing = useImage(PIECE_IMAGES.w.k);
  const whiteQueen = useImage(PIECE_IMAGES.w.q);
  const whiteRook = useImage(PIECE_IMAGES.w.r);
  const whiteBishop = useImage(PIECE_IMAGES.w.b);
  const whiteKnight = useImage(PIECE_IMAGES.w.n);
  const whitePawn = useImage(PIECE_IMAGES.w.p);
  const blackKing = useImage(PIECE_IMAGES.b.k);
  const blackQueen = useImage(PIECE_IMAGES.b.q);
  const blackRook = useImage(PIECE_IMAGES.b.r);
  const blackBishop = useImage(PIECE_IMAGES.b.b);
  const blackKnight = useImage(PIECE_IMAGES.b.n);
  const blackPawn = useImage(PIECE_IMAGES.b.p);

  const pieceImages = useMemo(
    () =>
      ({
        "w-k": whiteKing,
        "w-q": whiteQueen,
        "w-r": whiteRook,
        "w-b": whiteBishop,
        "w-n": whiteKnight,
        "w-p": whitePawn,
        "b-k": blackKing,
        "b-q": blackQueen,
        "b-r": blackRook,
        "b-b": blackBishop,
        "b-n": blackKnight,
        "b-p": blackPawn,
      } as { [key: string]: any }),
    [
      whiteKing,
      whiteQueen,
      whiteRook,
      whiteBishop,
      whiteKnight,
      whitePawn,
      blackKing,
      blackQueen,
      blackRook,
      blackBishop,
      blackKnight,
      blackPawn,
    ]
  );

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);

  const board = useMemo(() => {
    const game = new Chess(fen);
    return game.board();
  }, [fen]);

  const computeLegalTargets = useCallback(
    (square: Square) => {
      const game = new Chess(fen);
      const piece = game.get(square);
      if (!piece) return [] as string[];
      if (piece.color !== game.turn()) return [] as string[];

      // In human vs AI mode, only allow moves for the player's color
      // In human vs human mode, allow moves for both colors based on turn
      if (!isPlayerTurn) {
        return [] as string[];
      }
      
      // If playerColor is specified (human vs AI), only allow moves for that color
  // If playerColor is specified (e.g. human vs AI), restrict moves to that color only
  if (playerColor !== undefined && piece.color !== playerColor) {
        return [] as string[];
      }

      const verboseMoves = game.moves({
        square,
        verbose: true as any,
      }) as any[];
      return verboseMoves.map((m) => m.to as string);
    },
    [fen, isPlayerTurn, playerColor]
  );

  const tryUserMove = useCallback(
    async (from: string, to: string) => {
      const game = new Chess(fen);
      const pieceAtTarget = game.get(to as Square);
      const didMove = onMove(from, to);

      if (didMove) {
        // Play appropriate sound
        if (pieceAtTarget) {
          await playCaptureSound();
        } else {
          await playMoveSound();
        }
      }

      setSelectedSquare(null);
      setLegalTargets([]);
      return didMove;
    },
    [onMove, fen]
  );

  const handleTap = useCallback(
    async (x: number, y: number) => {
      const fileIndex = Math.floor(x / squareSize);
      const rankIndexFromTop = Math.floor(y / squareSize);
      if (
        fileIndex < 0 ||
        fileIndex > 7 ||
        rankIndexFromTop < 0 ||
        rankIndexFromTop > 7
      )
        return;
      const tappedSquare = toSquare(fileIndex, rankIndexFromTop);

      if (!selectedSquare) {
        const targets = computeLegalTargets(tappedSquare as Square);
        if (targets.length > 0) {
          setSelectedSquare(tappedSquare);
          setLegalTargets(targets);
        } else {
          setSelectedSquare(null);
          setLegalTargets([]);
        }
        return;
      }

      // If tapping same square, deselect
      if (tappedSquare === selectedSquare) {
        setSelectedSquare(null);
        setLegalTargets([]);
        return;
      }

      // If tapping a legal target, attempt the move
      if (legalTargets.includes(tappedSquare)) {
        await tryUserMove(selectedSquare, tappedSquare);
        return;
      }

      // Otherwise, try selecting another piece of the current side
      const targets = computeLegalTargets(tappedSquare as Square);
      if (targets.length > 0) {
        setSelectedSquare(tappedSquare);
        setLegalTargets(targets);
      } else {
        setSelectedSquare(null);
        setLegalTargets([]);
      }
    },
    [computeLegalTargets, legalTargets, selectedSquare, squareSize, tryUserMove]
  );

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        <Group>
          {/* Draw squares */}
          {Array.from({ length: 8 }).map((_, rankIndexFromTop) =>
            Array.from({ length: 8 }).map((__, fileIndex) => {
              const isDark = (fileIndex + rankIndexFromTop) % 2 === 1;
              const x = fileIndex * squareSize;
              const y = rankIndexFromTop * squareSize;
              const square = toSquare(fileIndex, rankIndexFromTop);
              const isSelected = selectedSquare === square;
              return (
                <Group key={`${fileIndex}-${rankIndexFromTop}`}>
                  <Rect
                    x={x}
                    y={y}
                    width={squareSize}
                    height={squareSize}
                    color={isDark ? DARK_SQUARE_COLOR : LIGHT_SQUARE_COLOR}
                  />
                  {isSelected && (
                    <Rect
                      x={x}
                      y={y}
                      width={squareSize}
                      height={squareSize}
                      color={SELECTED_HIGHLIGHT_COLOR}
                    />
                  )}
                </Group>
              );
            })
          )}

          {/* Draw legal move indicators */}
          {legalTargets.map((sq) => {
            const fileIndex = FILES.indexOf(sq[0] as any);
            const rankIndexFromTop = 8 - Number(sq[1]);
            const cx = fileIndex * squareSize + squareSize / 2;
            const cy = rankIndexFromTop * squareSize + squareSize / 2;
            return (
              <Circle
                key={`m-${sq}`}
                cx={cx}
                cy={cy}
                r={squareSize * 0.15}
                color={MOVE_DOT_COLOR}
              />
            );
          })}

          {/* Draw pieces */}
          {board.map((rank, rankIndexFromTop) =>
            rank.map((piece, fileIndex) => {
              if (!piece) return null;
              const x = fileIndex * squareSize;
              const y = rankIndexFromTop * squareSize;
              const imageKey = `${piece.color}-${piece.type}`;
              const pieceImage = pieceImages[imageKey];

              if (!pieceImage) {
                // Fallback to text if image not loaded
                const symbol = piece.type.toUpperCase();
                const isWhite = piece.color === "w";
                const textColor = isWhite ? "#FFFFFF" : "#000000";
                return (
                  <Text
                    key={`p-${fileIndex}-${rankIndexFromTop}`}
                    x={x + squareSize * 0.3}
                    y={y + squareSize * 0.7}
                    text={symbol}
                    font={font}
                    color={textColor}
                  />
                );
              }

              return (
                <Image
                  key={`p-${fileIndex}-${rankIndexFromTop}`}
                  image={pieceImage}
                  x={x + squareSize * 0.1}
                  y={y + squareSize * 0.1}
                  width={squareSize * 0.8}
                  height={squareSize * 0.8}
                  fit="contain"
                />
              );
            })
          )}
        </Group>
      </Canvas>
      <Pressable
        onPress={async (e) => {
          const { locationX, locationY } = e.nativeEvent;
          await handleTap(locationX, locationY);
        }}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: size,
          height: size,
        }}
      />
    </View>
  );
}
