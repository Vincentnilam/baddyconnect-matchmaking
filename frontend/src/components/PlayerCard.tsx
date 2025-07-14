import React, { useRef } from "react";
import { useDrag } from "react-dnd";
import type { Player } from "../types/types";

const colorMap = {
  Green: "bg-green-500",
  Blue: "bg-blue-500",
  Orange: "bg-orange-400",
};

const PlayerCard: React.FC<{ player: Player }> = ({ player }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "PLAYER",
    item: { player },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  drag(ref); // attach drag to the div ref

  return (
  <div
    ref={ref}
    className={`flex flex-col items-start text-white px-4 py-2 rounded-lg shadow-sm mb-2 cursor-move transition-all duration-150 ${colorMap[player.color]} ${isDragging ? "opacity-50 scale-95" : ""}`}
  >
    <span className="font-semibold text-base">{player.name}</span>
    <span className="text-xs text-white/80 mt-1">
      Played: {player.games_played ?? 0}
    </span>
  </div>
);

};

export default PlayerCard;
