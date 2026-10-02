/** Every team and player here is fictional. */
export interface Team {
  id: string;
  name: string;
  short: string;
  primary: string;
  secondary: string;
  batters: string[];
}

export const TEAMS: Team[] = [
  {
    id: "monsoon",
    name: "Monsoon Mavericks",
    short: "MON",
    primary: "#1e5eff",
    secondary: "#ffd23f",
    batters: ["Arjun Varma", "Kabir Sethi", "Rohan Pillai", "Ishaan Bhat", "Dev Malhotra", "Tanay Kulkarni"],
  },
  {
    id: "desert",
    name: "Desert Falcons",
    short: "DSF",
    primary: "#e8772e",
    secondary: "#3b1f0e",
    batters: ["Vikram Rathore", "Aman Shekhawat", "Neil Chauhan", "Yash Bhati", "Karan Solanki", "Mihir Joshi"],
  },
  {
    id: "spice",
    name: "Spice Coast Strikers",
    short: "SCS",
    primary: "#d7263d",
    secondary: "#f4f1de",
    batters: ["Nikhil Menon", "Aditya Nair", "Sanju Thomas", "Rahul Kurian", "Vivek Panicker", "Joel Mathew"],
  },
  {
    id: "hill",
    name: "Hill Station Hawks",
    short: "HSH",
    primary: "#2a9d8f",
    secondary: "#e9f5db",
    batters: ["Tenzin Rai", "Aarav Thapa", "Pranav Negi", "Siddharth Rawat", "Kunal Bisht", "Om Gurung"],
  },
  {
    id: "thunder",
    name: "Thunder Valley Titans",
    short: "TVT",
    primary: "#6a4c93",
    secondary: "#ffca3a",
    batters: ["Harsh Deshmukh", "Varun Patil", "Shaurya Gaikwad", "Rudra Jadhav", "Atharv Shinde", "Parth More"],
  },
  {
    id: "delta",
    name: "Delta Dynamos",
    short: "DDY",
    primary: "#06a77d",
    secondary: "#052f5f",
    batters: ["Sourav Das", "Ayan Mitra", "Ritam Bose", "Debojit Saha", "Anik Roy", "Pritam Ghosh"],
  },
];

export const BOWLERS = ["Zaheer Qadri", "Manav Saini", "Ravi Kiran", "Bilal Siddiqui", "Gautam Rao", "Sameer Lone"];
