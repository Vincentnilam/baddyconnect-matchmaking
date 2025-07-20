import React , { useRef } from "react";
import { useDrop } from "react-dnd";
import PlayerCard from "./PlayerCard";
import type { Player, Preset } from "../types/types";

interface CourtCardProps {
  courtId: string;
  courtIndex: number; // for label only
  players: Player[];
  movePlayer: (player: Player, toCourtId: string) => void;
  removeCourt: (id: string) => void;
  onFinishCourt: (courtId: string) => void;
  removePreset: (presetId: string) => void;
}

const CourtCard: React.FC<CourtCardProps> = ({
  courtId,
  courtIndex,
  players,
  movePlayer,
  removeCourt,
  onFinishCourt,
  removePreset,
}) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ["PLAYER", "PRESET"],
    canDrop: (item: any) => {
      if (item.player) return players.length < 4;
      if (item.preset) return players.length + item.preset.players.length <= 4;
      return false;
    },
    drop: (item: any) => {
      if (item.player) {
        movePlayer(item.player, courtId);
      } else if (item.preset) {
        // only add players that are not already on this court
        const playersToAdd = item.preset.players.filter(
          (p: Player) => !players.some((courtPlayer) => courtPlayer.name === p.name)
        );

        playersToAdd.forEach((player: Player) => {
          movePlayer(player, courtId);
        });

        // remove the preset after dropping
        removePreset(item.preset.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));


  const ref = useRef<HTMLDivElement>(null);
  drop(ref); // attach drag target

  const borderColor = isOver
    ? canDrop
      ? "border-green-400"
      : "border-red-400"
    : "border-gray-300";

  return (
    <div
      ref={ref}
      className={`bg-white text-black p-4 rounded shadow w-60 min-h-[180px] border-2 ${borderColor} relative`}
    >
      <button
        onClick={() => removeCourt(courtId)}
        className="absolute top-1 right-2 text-red-500 font-bold text-sm"
      >
        ❌
      </button>
      <h2 className="font-bold text-lg mb-2">Court {courtIndex + 1}</h2>

      {players.length === 0 && (
        <p className="text-sm text-gray-400 italic">Empty</p>
      )}
      {players.map((player) => (
        <PlayerCard key={player.name} player={player} />
      ))}

      <button
        onClick={() => onFinishCourt(courtId)}
        className="mt-2 bg-gray-200 text-sm px-2 py-1 rounded w-full hover:bg-gray-300"
      >
        Finish
      </button>
    </div>
  );
};

export default CourtCard;
