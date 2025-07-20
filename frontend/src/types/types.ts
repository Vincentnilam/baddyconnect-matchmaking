export type Player = {
  name: string;
  color: "Green" | "Orange" | "Blue";
  games_played?: number;
};

export type Court = {
  id: string;
  court_number: number;
  players: Player[];
};

export interface Preset {
  id: string;
  name: string;
  players: Player[];
}
