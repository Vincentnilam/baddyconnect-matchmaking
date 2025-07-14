import React, { useEffect, useState } from "react";
import { getAllPlayers, addNewPlayer } from "../api";
import type { Player } from "../types/types";

interface Props {
  onAddToWaitingList: (player: Player) => void;
}

const Sidebar: React.FC<Props> = ({ onAddToWaitingList }) => {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState<Player["color"]>("Green");

  useEffect(() => {
    getAllPlayers().then(setAllPlayers);
  }, []);

  const handleAdd = async () => {
    const newPlayer = { name, color };
    try {
      await addNewPlayer(newPlayer);
      setAllPlayers((prev) => [...prev, newPlayer]);
      onAddToWaitingList(newPlayer);
      setName("");
    } catch (err) {
      alert("Name already exists or error occurred.");
    }
  };

  return (
    <div className="w-64 bg-white text-black p-4 shadow-lg">
      <h2 className="text-lg font-bold mb-4">All Players</h2>
      <div className="space-y-2 mb-4">
        {allPlayers.map((player) => (
            <div key={player.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                <div
                    className={`w-3 h-3 rounded-full ${
                    player.color === "Green"
                        ? "bg-green-500"
                        : player.color === "Blue"
                        ? "bg-blue-500"
                        : "bg-orange-400"
                    }`}
                ></div>
                <span>{player.name}</span>
                </div>
                <button
                className="text-blue-500 text-xs"
                onClick={() => onAddToWaitingList(player)}
                >
                ➕ Add
                </button>
            </div>
        ))}
      </div>

      <h3 className="text-md font-semibold mt-4">Add New Player</h3>
      <input
        className="border p-1 w-full mb-1 text-sm"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <select
        className="border p-1 w-full mb-2 text-sm"
        value={color}
        onChange={(e) => setColor(e.target.value as Player["color"])}
      >
        <option value="Green">Green</option>
        <option value="Orange">Orange</option>
        <option value="Blue">Blue</option>
      </select>
      <button
        onClick={handleAdd}
        className="bg-blue-500 text-white px-2 py-1 text-sm rounded w-full"
        disabled={name.length < 1}
      >
        ➕ Create & Add
      </button>
    </div>
  );
};

export default Sidebar;
