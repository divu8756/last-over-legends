export interface Achievement {
  id: string;
  name: string;
  desc: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-six", name: "Passport Issued", desc: "Hit your first six." },
  { id: "first-win", name: "Legend Begins", desc: "Win any chase." },
  { id: "last-ball", name: "Do Not Blink", desc: "Win off the very last ball." },
  { id: "three-sixes", name: "Air Traffic Control", desc: "Hit three sixes in one match." },
  { id: "international", name: "Big Stage", desc: "Win a chase on International." },
  { id: "death-overs", name: "Death Wish", desc: "Win a Death Overs chase." },
  { id: "daily", name: "Daily Grind", desc: "Win a Daily Challenge." },
  { id: "hot-streak", name: "Seeing a Football", desc: "Go on a hot streak." },
  { id: "survivor", name: "Second Life", desc: "Get dropped and still win." },
  { id: "tie", name: "Honours Even", desc: "Tie a match." },
];

/** Jersey colourways unlock as you collect achievements. */
export const JERSEYS = [
  { id: "team", name: "Team Kit", need: 0 },
  { id: "gold", name: "Golden Hour", need: 2, primary: "#d4a017", secondary: "#1b1b1b" },
  { id: "retro", name: "Retro Teal", need: 4, primary: "#00a6a6", secondary: "#f6ae2d" },
  { id: "night", name: "Floodlight Black", need: 6, primary: "#111827", secondary: "#f72585" },
  { id: "legend", name: "Legend Whites", need: 9, primary: "#f8f8f2", secondary: "#c1121f" },
] as const;
