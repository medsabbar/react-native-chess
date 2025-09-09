import { Chess, Move } from "chess.js";

export interface AIMove {
  from: string;
  to: string;
  promotion?: string;
}

export interface AISettings {
  depth: number;
  difficulty: "easy" | "medium" | "hard";
  timeLimitMs: number; // soft time limit for thinking, used with iterative deepening
}

// Piece values for evaluation
const PIECE_VALUES = {
  p: 1, // pawn
  n: 3, // knight
  b: 3, // bishop
  r: 5, // rook
  q: 9, // queen
  k: 100, // king
};

// Position values for better piece placement
const PAWN_POSITION_VALUES = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 5, 5, 5, 5, 5, 5, 5],
  [1, 1, 2, 3, 3, 2, 1, 1],
  [0.5, 0.5, 1, 2.5, 2.5, 1, 0.5, 0.5],
  [0, 0, 0, 2, 2, 0, 0, 0],
  [0.5, -0.5, -1, 0, 0, -1, -0.5, 0.5],
  [0.5, 1, 1, -2, -2, 1, 1, 0.5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_POSITION_VALUES = [
  [-5, -4, -3, -3, -3, -3, -4, -5],
  [-4, -2, 0, 0, 0, 0, -2, -4],
  [-3, 0, 1, 1.5, 1.5, 1, 0, -3],
  [-3, 0.5, 1.5, 2, 2, 1.5, 0.5, -3],
  [-3, 0, 1.5, 2, 2, 1.5, 0, -3],
  [-3, 0.5, 1, 1.5, 1.5, 1, 0.5, -3],
  [-4, -2, 0, 0.5, 0.5, 0, -2, -4],
  [-5, -4, -3, -3, -3, -3, -4, -5],
];

const BISHOP_POSITION_VALUES = [
  [-2, -1, -1, -1, -1, -1, -1, -2],
  [-1, 0, 0, 0, 0, 0, 0, -1],
  [-1, 0, 0.5, 1, 1, 0.5, 0, -1],
  [-1, 0.5, 0.5, 1, 1, 0.5, 0.5, -1],
  [-1, 0, 1, 1, 1, 1, 0, -1],
  [-1, 1, 1, 1, 1, 1, 1, -1],
  [-1, 0.5, 0, 0, 0, 0, 0.5, -1],
  [-2, -1, -1, -1, -1, -1, -1, -2],
];

const ROOK_POSITION_VALUES = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0.5, 1, 1, 1, 1, 1, 1, 0.5],
  [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
  [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
  [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
  [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
  [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
  [0, 0, 0, 0.5, 0.5, 0, 0, 0],
];

const QUEEN_POSITION_VALUES = [
  [-2, -1, -1, -0.5, -0.5, -1, -1, -2],
  [-1, 0, 0, 0, 0, 0, 0, -1],
  [-1, 0, 0.5, 0.5, 0.5, 0.5, 0, -1],
  [-0.5, 0, 0.5, 0.5, 0.5, 0.5, 0, -0.5],
  [0, 0, 0.5, 0.5, 0.5, 0.5, 0, -0.5],
  [-1, 0.5, 0.5, 0.5, 0.5, 0.5, 0, -1],
  [-1, 0, 0.5, 0, 0, 0, 0, -1],
  [-2, -1, -1, -0.5, -0.5, -1, -1, -2],
];

const KING_POSITION_VALUES = [
  [-3, -4, -4, -5, -5, -4, -4, -3],
  [-3, -4, -4, -5, -5, -4, -4, -3],
  [-3, -4, -4, -5, -5, -4, -4, -3],
  [-3, -4, -4, -5, -5, -4, -4, -3],
  [-2, -3, -3, -4, -4, -3, -3, -2],
  [-1, -2, -2, -2, -2, -2, -2, -1],
  [2, 2, 0, 0, 0, 0, 2, 2],
  [2, 3, 1, 0, 0, 1, 3, 2],
];

export class ChessAI {
  private settings: AISettings;

  constructor(
    settings: AISettings = { depth: 3, difficulty: "medium", timeLimitMs: 800 }
  ) {
    this.settings = settings;
  }

  // Get the best move for the AI
  public getBestMove(game: Chess): AIMove | null {
    console.log("AI getBestMove called for turn:", game.turn());
    const moves = game.moves({ verbose: true }) as Move[];
    console.log("Available moves:", moves.length);
    if (moves.length === 0) {
      console.log("No moves available");
      return null;
    }

    // Ultra-fast strategies for responsiveness
    if (this.settings.difficulty === "easy") {
      // Prefer captures; otherwise random for variety
      const capturing = (moves as any[]).filter((m) => !!m.captured);
      const pool = capturing.length > 0 ? capturing : moves;
      const chosen = pool[Math.floor(Math.random() * pool.length)] as Move;
      return { from: chosen.from, to: chosen.to, promotion: chosen.promotion };
    }

    if (this.settings.difficulty === "medium") {
      // One-ply lookahead: evaluate resulting position and pick best instantly
      const isWhite = game.turn() === "w";
      let bestMove: Move | null = null;
      let bestScore = isWhite ? -Infinity : Infinity;

      // Light ordering: evaluate captures first
      const ordered = [...moves].sort(
        (a: any, b: any) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0)
      );
      for (const move of ordered) {
        const next = new Chess(game.fen());
        next.move(move);
        const score = this.evaluatePosition(next);
        if (isWhite) {
          if (score > bestScore) {
            bestScore = score;
            bestMove = move;
          }
        } else {
          if (score < bestScore) {
            bestScore = score;
            bestMove = move;
          }
        }
      }
      if (bestMove) {
        return {
          from: bestMove.from,
          to: bestMove.to,
          promotion: bestMove.promotion,
        };
      }
      // Fallback to a random move (shouldn't happen)
      const fallback = moves[0];
      return {
        from: fallback.from,
        to: fallback.to,
        promotion: (fallback as any).promotion,
      };
    }

    // Iterative deepening with soft time limit
    const deadline = Date.now() + (this.settings.timeLimitMs || 300);
    let selectedMove: Move | null = null;
    const isRootWhite = game.turn() === "w";

    // Basic move ordering: try captures first to improve pruning
    const orderedMoves = [...moves].sort((a, b) => {
      const ax = (a as any).captured ? 1 : 0;
      const bx = (b as any).captured ? 1 : 0;
      return bx - ax;
    });

    for (let depth = 1; depth <= this.settings.depth; depth++) {
      let bestScoreAtDepth = isRootWhite ? -Infinity : Infinity;
      let bestMoveAtDepth: Move | null = null;

      for (const move of orderedMoves) {
        if (Date.now() > deadline) break;
        const newGame = new Chess(game.fen());
        newGame.move(move);

        const score = this.minimax(
          newGame,
          depth - 1,
          newGame.turn() === "w",
          -Infinity,
          Infinity,
          deadline
        );

        if (isRootWhite) {
          if (score > bestScoreAtDepth) {
            bestScoreAtDepth = score;
            bestMoveAtDepth = move;
          }
        } else {
          if (score < bestScoreAtDepth) {
            bestScoreAtDepth = score;
            bestMoveAtDepth = move;
          }
        }
      }

      if (bestMoveAtDepth) {
        selectedMove = bestMoveAtDepth;
      }

      if (Date.now() > deadline) {
        console.log("AI time limit reached at depth", depth);
        break;
      }
    }

    const result = selectedMove
      ? {
          from: selectedMove.from,
          to: selectedMove.to,
          promotion: selectedMove.promotion,
        }
      : null;

    console.log("AI selected move:", result);
    return result;
  }

  // Minimax algorithm with alpha-beta pruning
  private minimax(
    game: Chess,
    depth: number,
    isMaximizing: boolean,
    alpha: number = -Infinity,
    beta: number = Infinity,
    deadline: number = Number.POSITIVE_INFINITY
  ): number {
    if (Date.now() > deadline || depth === 0 || game.isGameOver()) {
      return this.evaluatePosition(game);
    }

    const moves = game.moves({ verbose: true }) as Move[];
    // Basic move ordering: explore captures first
    moves.sort((a: any, b: any) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const newGame = new Chess(game.fen());
        newGame.move(move);
        const evaluation = this.minimax(
          newGame,
          depth - 1,
          false,
          alpha,
          beta,
          deadline
        );
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const newGame = new Chess(game.fen());
        newGame.move(move);
        const evaluation = this.minimax(
          newGame,
          depth - 1,
          true,
          alpha,
          beta,
          deadline
        );
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return minEval;
    }
  }

  // Evaluate the current position
  private evaluatePosition(game: Chess): number {
    if (game.isCheckmate()) {
      return game.turn() === "w" ? -1000 : 1000;
    }

    if (game.isDraw()) {
      return 0;
    }

    let score = 0;
    const board = game.board();

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (!piece) continue;

        const pieceValue =
          PIECE_VALUES[piece.type as keyof typeof PIECE_VALUES];
        const positionValue = this.getPositionValue(piece, rank, file);
        const totalValue = pieceValue + positionValue;

        if (piece.color === "w") {
          score += totalValue;
        } else {
          score -= totalValue;
        }
      }
    }

    // Add some randomness for easier difficulty
    if (this.settings.difficulty === "easy") {
      score += (Math.random() - 0.5) * 2;
    } else if (this.settings.difficulty === "medium") {
      score += (Math.random() - 0.5) * 1;
    }

    return score;
  }

  // Get position value for a piece
  private getPositionValue(piece: any, rank: number, file: number): number {
    const positionValues = this.getPositionTable(piece.type);
    const actualRank = piece.color === "w" ? 7 - rank : rank;
    return positionValues[actualRank][file];
  }

  // Get position table for piece type
  private getPositionTable(pieceType: string): number[][] {
    switch (pieceType) {
      case "p":
        return PAWN_POSITION_VALUES;
      case "n":
        return KNIGHT_POSITION_VALUES;
      case "b":
        return BISHOP_POSITION_VALUES;
      case "r":
        return ROOK_POSITION_VALUES;
      case "q":
        return QUEEN_POSITION_VALUES;
      case "k":
        return KING_POSITION_VALUES;
      default:
        return Array(8)
          .fill(null)
          .map(() => Array(8).fill(0));
    }
  }

  // Update AI settings
  public updateSettings(newSettings: Partial<AISettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  // Get current settings
  public getSettings(): AISettings {
    return { ...this.settings };
  }
}

// Factory function to create AI with different difficulties
export function createChessAI(
  difficulty: "easy" | "medium" | "hard" = "medium"
): ChessAI {
  const depthMap = {
    easy: 2,
    medium: 3,
    hard: 4,
  };
  const timeLimitMap = {
    easy: 400,
    medium: 800,
    hard: 1500,
  } as const;

  return new ChessAI({
    depth: depthMap[difficulty],
    difficulty,
    timeLimitMs: timeLimitMap[difficulty],
  });
}
