import { notFound } from "next/navigation";
import GameShell from "@/components/GameShell";
import type { Difficulty, Mode } from "@/game/engine/types";

const MODES: Mode[] = ["super-over", "death-overs", "daily"];
const DIFFS: Difficulty[] = ["gully", "club", "international"];

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { mode } = await params;
  const sp = await searchParams;
  if (!MODES.includes(mode as Mode)) notFound();
  const d = typeof sp.d === "string" && DIFFS.includes(sp.d as Difficulty) ? (sp.d as Difficulty) : "club";
  const team = typeof sp.team === "string" ? sp.team : undefined;
  const lang = sp.lang === "en" ? "en" : "hi";
  return <GameShell mode={mode as Mode} difficulty={d} teamId={team} lang={lang} />;
}
