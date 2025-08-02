import React, { useState, useRef } from "react";
import type { Preset, Player } from "../types/types";
import { useDrag, useDrop } from "react-dnd";
import { v4 as uuidv4 } from "uuid";
import { saveWaitingList } from "../api";

interface PresetListProps {
  presets: Preset[];
  setPresets: React.Dispatch<React.SetStateAction<Preset[]>>;
  waitingList: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

const PresetList: React.FC<PresetListProps> = ({ presets, setPresets, waitingList, setPlayers }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [presetName, setPresetName] = useState("");

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  const createPreset = async () => {
    if (selectedIds.length !== 4) {
      alert("Select exactly 4 players");
      return;
    }

    const newPreset: Preset = {
      id: uuidv4(),
      name: presetName || `Preset ${presets.length + 1}`,
      players: waitingList.filter((p) => selectedIds.includes(p.id)),
    };

    setPresets((prev) => [...prev, newPreset]);

    const updatedWaitingList = waitingList.filter(
      (p) => !selectedIds.includes(p.id)
    );
    setPlayers(updatedWaitingList);
    await saveWaitingList(updatedWaitingList);

    setSelectedIds([]);
    setPresetName("");
  };

  return (
    <div className="bg-white text-black p-4 rounded shadow max-w-2xl mx-auto mt-8">
      <h2 className="text-lg font-bold mb-2">Presets</h2>
      {presets.length === 0 && <p className="text-sm text-gray-500 italic mb-4">No presets created</p>}

      <div className="space-y-2 mb-6">
        {presets.map((preset, index) => (
          <DraggablePreset
            key={preset.id}
            index={index}
            preset={preset}
            presets={presets}
            players={waitingList}
            setPresets={setPresets}
            setPlayers={setPlayers}
          />
        ))}
      </div>

      <h3 className="font-semibold mb-1">Create New Preset</h3>
      <input className="border p-1 w-full mb-2 text-sm" placeholder="Preset Name (optional)" value={presetName} onChange={(e) => setPresetName(e.target.value)} />

      <div className="flex flex-wrap gap-2 mb-2">
        {waitingList.map((player) => (
          <label key={player.id} className={`text-sm px-2 py-1 rounded cursor-pointer border ${selectedIds.includes(player.id) ? "bg-blue-500 text-white" : "bg-gray-100"}`}>
            <input type="checkbox" className="hidden" checked={selectedIds.includes(player.id)} onChange={() => toggleSelection(player.id)} />
            {player.name}
          </label>
        ))}
      </div>

      <button className="bg-green-600 text-white px-3 py-1 rounded text-sm" onClick={createPreset} disabled={selectedIds.length !== 4}>➕ Create Preset</button>
    </div>
  );
};

const DraggablePreset: React.FC<{
  index: number;
  preset: Preset;
  presets: Preset[];
  players: Player[];
  setPresets: React.Dispatch<React.SetStateAction<Preset[]>>;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}> = ({ index, preset, presets, players, setPresets, setPlayers }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging: isDraggingToCourt }, dragToCourt] = useDrag(() => ({
    type: "PRESET",
    item: { type: "PRESET", preset },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));
  const [{ isDragging: isDraggingOrder }, dragOrder] = useDrag(() => ({
    type: "PRESET_ORDER",
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));
  const [, drop] = useDrop({
    accept: "PRESET_ORDER",
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index === index) return;
      const updated = [...presets];
      const [moved] = updated.splice(draggedItem.index, 1);
      updated.splice(index, 0, moved);
      setPresets([...updated]);
      draggedItem.index = index;
    },
  });

  dragOrder(drop(ref));
  dragToCourt(ref);

  const addPlayerToPreset = async (player: Player) => {
    if (preset.players.length >= 4) return;
    setPresets((prev) =>
      prev.map((p) =>
        p.id === preset.id && !p.players.some((pl) => pl.id === player.id)
          ? { ...p, players: [...p.players, player] }
          : p
      )
    );
    const updated = players.filter((p) => p.id !== player.id);
    setPlayers(updated);
    await saveWaitingList(updated);
  };

  const removePlayerFromPreset = (playerId: string) => {
    setPresets((prev) =>
      prev.map((p) =>
        p.id === preset.id ? { ...p, players: p.players.filter((pl) => pl.id !== playerId) } : p
      )
    );
    const removed = preset.players.find((p) => p.id === playerId);
    if (removed) {
      setPlayers((prev) => (prev.some((p) => p.id === removed.id) ? prev : [...prev, removed]));
      saveWaitingList([...players, removed]);
    }
  };

  return (
    <div ref={ref} className={`border rounded p-2 bg-gray-50 shadow-sm transition-all ${(isDraggingToCourt || isDraggingOrder) ? "opacity-50 scale-95" : ""}`}>
      <div className="font-semibold text-sm mb-1">{preset.name}</div>
      <div className="flex flex-wrap gap-2">
        {preset.players.map((p) => (
          <div key={p.id} className="flex items-center gap-1 text-xs bg-gray-300 px-2 py-0.5 rounded-full">
            <span>{p.name}</span>
            <button className="text-red-600 font-bold hover:text-red-800" onClick={() => removePlayerFromPreset(p.id)} title="Remove from preset">✕</button>
          </div>
        ))}
      </div>
      {preset.players.length < 4 && (
        <div className="mt-2">
          <label className="text-xs block mb-1">Add player:</label>
          <select className="text-sm border px-2 py-1 rounded" onChange={(e) => {
            const selected = e.target.value;
            if (!selected) return;
            const player = players.find((p) => p.id === selected);
            if (player) addPlayerToPreset(player);
            e.target.value = "";
          }} defaultValue="">
            <option value="" disabled>Select player</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default PresetList;
