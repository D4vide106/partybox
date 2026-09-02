import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Player, Round, Room } from "./hooks";
import { isBot } from "./hooks";
import {
  GAME_META,
  type GameType,
  scoreTapBlitz,
  scoreMathBlitz,
  scoreReaction,
  scorePriceGuess,
  scoreTypeRush,
  scoreEmojiMemory,
  scoreWordScramble,
  scoreOddOneOut,
  scoreStroop,
  scoreTrivia,
  scoreCountEmoji,
  scoreFlagGuess,
  scoreHigherLower,
  scoreAimTrainer,
  scoreSimon,
  scoreColorMatch,
  scorePopBubbles,
  scoreSpeedSort,
  scoreWhackMole,
  scoreEmojiRiddle,
  scoreNineTarget,
  scorePatternCopy,
  scoreTrueFalse,
  scoreRhythmTap,
  scoreStackTower,
  scoreSnake,
  scorePerfectCircle,
  scoreCardMatch,
  scoreGuessNumber,
  scoreSequenceNext,
  scoreCapitals,
  scorePieChart,
  scoreTypoHunt,
  scoreMemoryDigits,
  scoreAnagramSprint,
  scoreFindPair,
  scoreConnectDots,
  scoreGoNoGo,
  scoreSpotDiff,
  scoreMathTruth,
  scoreQuickBiggest,
  scoreLetterPop,
  scoreCoinSplit,
} from "./games";

/**
 * Generates realistic simulation payload and points for an AI Bot in any minigame.
 */
export function generateBotSubmission(
  gameType: GameType,
  roundConfig: Record<string, unknown>,
  difficulty: "easy" | "normal" | "hard" = "normal",
): { payload: Record<string, unknown>; points: number } {
  const diffMultiplier = difficulty === "easy" ? 0.75 : difficulty === "hard" ? 1.25 : 1.0;
  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

  switch (gameType) {
    case "tapblitz": {
      const taps = Math.round(randInt(35, 60) * diffMultiplier);
      return { payload: { taps, bot: true }, points: scoreTapBlitz(taps) };
    }
    case "typerush": {
      const phrase = (roundConfig.phrase as { it: string })?.it || "PartyBox";
      const wpm = Math.round(randInt(45, 80) * diffMultiplier);
      const acc = randInt(92, 100);
      const elapsedMs = Math.round((phrase.length / (wpm * 5)) * 60000);
      return {
        payload: { wpm, accuracy: acc, elapsedMs, bot: true },
        points: scoreTypeRush(elapsedMs, phrase.length, acc),
      };
    }
    case "reaction": {
      const ms = Math.max(160, Math.round(randInt(220, 380) / diffMultiplier));
      return { payload: { reactionMs: ms, bot: true }, points: scoreReaction(ms) };
    }
    case "mathblitz": {
      const correct = Math.round(randInt(8, 16) * diffMultiplier);
      const wrong = randInt(0, 2);
      const avgMs = randInt(1200, 2200);
      return {
        payload: { correct, wrong, avgMs, bot: true },
        points: scoreMathBlitz(correct, wrong, avgMs),
      };
    }
    case "priceguess": {
      const actual = ((roundConfig.product as { price: number })?.price) || 50;
      const errorPct = rand(0.02, 0.25) / diffMultiplier;
      const guess = Math.max(1, Math.round(actual * (1 + (Math.random() < 0.5 ? -errorPct : errorPct))));
      const diff = Math.abs(guess - actual);
      return {
        payload: { guess, diff, bot: true },
        points: scorePriceGuess(guess, actual),
      };
    }
    case "flagguess": {
      const answers = (roundConfig.answers as string[]) || ["Italia"];
      const correct = Math.random() < 0.85 * diffMultiplier;
      const answer = correct ? answers[0] : "Altro Paese";
      const elapsedMs = randInt(2500, 7000);
      return {
        payload: { answer, correct, elapsedMs, bot: true },
        points: scoreFlagGuess(correct, elapsedMs),
      };
    }
    case "trivia": {
      const answer = (roundConfig.answer as number) ?? 0;
      const choices = (roundConfig.choices as string[]) || ["A", "B", "C", "D"];
      const isCorrect = Math.random() < 0.8 * diffMultiplier;
      const chosenIdx = isCorrect ? answer : (answer + 1) % choices.length;
      const elapsedMs = randInt(3000, 8000);
      return {
        payload: { selected: chosenIdx, correct: isCorrect, elapsedMs, bot: true },
        points: scoreTrivia(isCorrect, elapsedMs),
      };
    }
    case "capitals": {
      const capital = (roundConfig.capital as string) || "Roma";
      const options = (roundConfig.options as string[]) || [capital, "Milano", "Torino", "Napoli"];
      const isCorrect = Math.random() < 0.85 * diffMultiplier;
      const chosen = isCorrect ? capital : options.find((o) => o !== capital) || "Sconosciuta";
      const elapsedMs = randInt(2000, 6000);
      return {
        payload: { selected: chosen, correct: isCorrect, elapsedMs, bot: true },
        points: scoreCapitals(isCorrect, elapsedMs),
      };
    }
    case "wordscramble": {
      const isCorrect = Math.random() < 0.85 * diffMultiplier;
      const elapsedMs = randInt(3000, 9000);
      return {
        payload: { correct: isCorrect, elapsedMs, bot: true },
        points: scoreWordScramble(isCorrect, elapsedMs),
      };
    }
    case "aimtrainer": {
      const hits = Math.round(randInt(14, 26) * diffMultiplier);
      const tries = hits + randInt(0, 3);
      return {
        payload: { hits, tries, bot: true },
        points: scoreAimTrainer(hits, tries),
      };
    }
    case "whackmole": {
      const moles = Math.round(randInt(12, 22) * diffMultiplier);
      const bombs = randInt(0, 1);
      return {
        payload: { moles, bombs, bot: true },
        points: scoreWhackMole(moles, bombs),
      };
    }
    case "popbubbles": {
      const bubbles = Math.round(randInt(18, 35) * diffMultiplier);
      const bombs = randInt(0, 1);
      return {
        payload: { bubbles, bombs, bot: true },
        points: scorePopBubbles(bubbles, bombs),
      };
    }
    case "simon": {
      const streak = Math.round(randInt(6, 12) * diffMultiplier);
      return {
        payload: { streak, bot: true },
        points: scoreSimon(streak),
      };
    }
    case "snake": {
      const apples = Math.round(randInt(8, 18) * diffMultiplier);
      return {
        payload: { apples, bot: true },
        points: scoreSnake(apples),
      };
    }
    case "stacktower": {
      const blocks = Math.round(randInt(9, 20) * diffMultiplier);
      const perfects = randInt(2, Math.floor(blocks / 2));
      return {
        payload: { blocks, perfects, bot: true },
        points: scoreStackTower(blocks, perfects),
      };
    }
    case "perfectcircle": {
      const score = Math.min(99, Math.round(randInt(78, 96) * diffMultiplier));
      return {
        payload: { score, bot: true },
        points: scorePerfectCircle(score),
      };
    }
    case "drawblitz": {
      // Create a cute mini SVG doodle for the bot
      const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
      const c1 = colors[randInt(0, colors.length - 1)];
      const c2 = colors[randInt(0, colors.length - 1)];
      const svg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23ffffff"/><circle cx="150" cy="140" r="70" fill="${encodeURIComponent(c1!)}"/><circle cx="125" cy="125" r="12" fill="%23ffffff"/><circle cx="175" cy="125" r="12" fill="%23ffffff"/><path d="M 110 160 Q 150 200 190 160" stroke="${encodeURIComponent(c2!)}" stroke-width="8" fill="none" stroke-linecap="round"/></svg>`;
      return {
        payload: { image: svg, votes: [], bot: true },
        points: 100,
      };
    }
    default: {
      // Fallback for other standard games
      const correct = Math.round(randInt(7, 14) * diffMultiplier);
      const wrong = randInt(0, 2);
      const basePts = correct * 100 - wrong * 50;
      return {
        payload: { correct, wrong, bot: true },
        points: Math.max(0, basePts),
      };
    }
  }
}

/**
 * Host-side hook to run AI bot simulations during active rounds.
 */
export function useBotRunner(
  room: Room | null,
  round: Round | null,
  players: Player[],
  isHost: boolean,
) {
  const botsRunningRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!room || !round || !isHost || round.status !== "active") {
      botsRunningRef.current.clear();
      return;
    }

    const botPlayers = players.filter((p) => isBot(p) && !p.kicked && p.is_connected);
    if (botPlayers.length === 0) return;

    const gameType = round.game_type as GameType;
    const meta = GAME_META[gameType];
    const durSec = room.settings?.roundDurationSec || meta?.durationSec || 15;
    const difficulty = room.settings?.difficulty ?? "normal";

    for (const bot of botPlayers) {
      if (botsRunningRef.current.has(bot.id)) continue;
      botsRunningRef.current.add(bot.id);

      // Random delay before bot submits (between 25% and 75% of round time)
      const delayMs = Math.round(
        (2500 + Math.random() * (durSec * 600)) + (Number((round.config as any)?.launchGraceMs) || 1000),
      );

      const timeoutId = setTimeout(async () => {
        // Verify round is still active
        const { data: currentRound } = await supabase
          .from("rounds")
          .select("status")
          .eq("id", round.id)
          .maybeSingle();

        if (currentRound && (currentRound as any).status === "active") {
          // Check if already submitted
          const { data: existing } = await supabase
            .from("submissions")
            .select("id")
            .eq("round_id", round.id)
            .eq("player_id", bot.id)
            .maybeSingle();

          if (!existing) {
            const { payload, points } = generateBotSubmission(
              gameType,
              (round.config as Record<string, unknown>) || {},
              difficulty,
            );

            await supabase.from("submissions").insert({
              round_id: round.id,
              player_id: bot.id,
              payload,
              points,
            });
          }
        }
      }, delayMs);

      // Cleanup
      return () => clearTimeout(timeoutId);
    }
  }, [room, round, players, isHost]);
}
