import React , { useRef } from "react";
import { useDrop } from "react-dnd";
import PlayerCard from "./PlayerCard";
import type { Player } from "../types/types";

interface CourtCardProps {
  courtId: string;
  courtIndex: number;
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
      if (item.type === "PLAYER") return players.length < 4;
      if (item.type === "PRESET") return players.length + item.preset.players.length <= 4;
      return false;
    },
    drop: (item: any) => {
      if (item.type === "PLAYER") {
        movePlayer(item.player, courtId);
      } else if (item.type === "PRESET") {
        const playersToAdd = item.preset.players.filter(
          (p: Player) => !players.some((courtPlayer) => courtPlayer.id === p.id)
        );
        playersToAdd.forEach((player: Player) => movePlayer(player, courtId));
        removePreset(item.preset.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const ref = useRef<HTMLDivElement>(null);
  drop(ref);

  const borderColor = isOver ? (canDrop ? "border-green-400" : "border-red-400") : "border-gray-300";

  return (
    <div
      ref={ref}
      className={`bg-white text-black p-4 rounded shadow w-full min-w-[200px] max-w-sm min-h-[180px] border-2 ${borderColor} relative`}
    >
      <button
        onClick={() => removeCourt(courtId)}
        className="absolute top-1 right-2 text-red-500 font-bold text-sm"
      >
        ❌
      </button>
      <h2 className="font-bold text-lg mb-2">Court {courtIndex + 1}</h2>
      {players.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Empty</p>
      ) : (
        players.map((player) => <PlayerCard key={player.id} player={player} />)
      )}
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
