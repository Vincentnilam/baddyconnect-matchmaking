export type Player = {
  name: string;
  color: "Green" | "Orange" | "Blue";
  games_played?: number;
};

export type Court = {
  court_number: number;
  players: Player[];
};