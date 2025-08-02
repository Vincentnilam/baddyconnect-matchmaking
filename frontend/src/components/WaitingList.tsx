import React, { useRef } from "react";
import type { Player } from "../types/types";
import PlayerCard from "./PlayerCard";
import { useDrop } from "react-dnd";
import { removePlayerFromWaitingList, updatePlayerColor } from "../api";

interface Props {
  players: Player[];
  movePlayer: (player: Player, toCourtId?: string) => void;
  removeFromWaitingList: (playerId: string) => void;
  onChangeColor: (playerId: string, newColor: Player["color"]) => void;
}

const WaitingList: React.FC<Props> = ({ players, movePlayer, removeFromWaitingList, onChangeColor }) => {
  const [, drop] = useDrop(() => ({
    accept: "PLAYER",
    drop: (item: { player: Player }) => movePlayer(item.player, undefined),
  }));
  const ref = useRef<HTMLDivElement>(null);
  drop(ref);

  const handleRemove = async (id: string) => {
    try {
      await removePlayerFromWaitingList(id);
      removeFromWaitingList(id);
    } catch (err) {
      alert("Failed to delete player.");
    }
  };

  const handleColorChange = async (id: string, name: string, newColor: Player["color"]) => {
    try {
      await updatePlayerColor(name, newColor);
      onChangeColor(id, newColor);
    } catch (err) {
      alert("Failed to update color.");
    }
  };

  return (
    <div ref={ref} className="bg-white text-black p-4 rounded shadow-lg max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-2">Waiting List</h2>
      {players.length === 0 ? (
        <p className="text-gray-500 italic">No players waiting</p>
      ) : (
        players.map((player, idx) => (
          <div key={player.id} className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-1">
              <div className="text-sm font-mono w-5">{idx + 1}.</div>
              <PlayerCard player={player} />
            </div>
            <select
              className="text-sm border rounded px-1 py-0.5"
              value={player.color}
              onChange={(e) => handleColorChange(player.id, player.name, e.target.value as Player["color"])}
            >
              <option value="Green">Green</option>
              <option value="Orange">Orange</option>
              <option value="Blue">Blue</option>
            </select>
            <button
              onClick={() => handleRemove(player.id)}
              className="text-red-500 hover:text-red-700 text-sm"
              title="Remove player"
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default WaitingList;
