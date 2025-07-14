import React, { useState } from "react";

type Player = {
  name: string;
  color: "Green" | "Orange" | "Blue";
};

interface Props {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setWaitingList: React.Dispatch<React.SetStateAction<Player[]>>;
}

const Sidebar: React.FC<Props> = ({ players, setPlayers, setWaitingList }) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState<Player["color"]>("Blue");

  const addPlayer = () => {
    const newPlayer: Player = { name, color };
    const updated = [...players, newPlayer];
    setPlayers(updated);
    setWaitingList((prev) => [...prev, newPlayer]);
    setName("");
  };

  return (
    <div className="w-64 bg-white text-black p-4 shadow-lg">
      <h2 className="font-bold text-lg mb-4">Add Player</h2>
      <input
        className="border w-full mb-2 p-1"
        placeholder="Player name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <select className="w-full mb-2 p-1" value={color} onChange={(e) => setColor(e.target.value as Player["color"])}>
        <option value="Green">Green</option>
        <option value="Orange">Orange</option>
        <option value="Blue">Blue</option>
      </select>
      <button onClick={addPlayer} className="w-full bg-blue-600 text-white py-1 rounded">
        + Add Player
      </button>
    </div>
  );
};

export default Sidebar;
