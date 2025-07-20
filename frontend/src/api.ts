import axios from "axios";
import type { Player, Court, Preset } from "./types/types";

const BASE_URL = import.meta.env.VITE_FASTAPI_URL || "http://localhost:5000";

export async function getAllPlayers(): Promise<Player[]> {
  const res = await axios.get(`${BASE_URL}/players`);
  return res.data;
}

export async function addNewPlayer(player: Player): Promise<void> {
  await axios.post(`${BASE_URL}/players`, player);
}

export async function saveWaitingList(waitingList: Player[]): Promise<void> {
  await axios.post(`${BASE_URL}/waiting-list`, waitingList);
}

export async function fetchWaitingList(): Promise<Player[]> {
  const res = await axios.get(`${BASE_URL}/waiting-list`);
  return res.data;
}

export async function removePlayerFromWaitingList(name: string): Promise<void> {
  await axios.delete(`${BASE_URL}/waiting-list/${name}`);
}

export async function updatePlayerColor(name: string, color: string): Promise<void> {
  await axios.patch(`${BASE_URL}/waiting-list/${name}`, { color });
}

export async function saveCourts(courts: Court[]): Promise<void> {
  await axios.post(`${BASE_URL}/courts`, courts);
}

export async function fetchCourts(): Promise<Court[]> {
  const res = await axios.get(`${BASE_URL}/courts`);
  return res.data;
}

export async function incrementGamesPlayed(playerNames: string[]): Promise<void> {
  await axios.post(`${BASE_URL}/increment-games-played`, playerNames);
}

export async function fetchPresets(): Promise<Preset[]> {
  const res = await axios.get(`${BASE_URL}/presets`);
  return res.data;
}

export async function savePresets(presets: Preset[]): Promise<void> {
  await axios.post(`${BASE_URL}/presets`, presets);
}
