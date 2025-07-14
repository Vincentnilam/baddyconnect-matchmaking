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
      className={`text-white px-3 py-1 rounded mb-1 cursor-move ${colorMap[player.color]} ${isDragging ? "opacity-50" : ""}`}
    >
      {player.name}
    </div>
  );
};

export default PlayerCard;
