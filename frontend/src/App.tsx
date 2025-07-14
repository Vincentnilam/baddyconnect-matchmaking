import React, { useState } from "react";
import CourtCard from "./components/CourtCard";
import WaitingList from "./components/WaitingList";
import Sidebar from "./components/Sidebar";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { Player } from "./types/types";

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([
  ]);
  const [courts, setCourts] = useState<Player[][]>([[]]);

  const assignedNames = new Set(courts.flat().map((p) => p.name));
  const waitingList = players.filter((p) => !assignedNames.has(p.name));

  const addCourt = () => {
    setCourts((prev) => [...prev, []]);
  };

  const removeCourt = (index: number) => {
    setCourts((prev) => {
      const newCourts = [...prev];
      newCourts.splice(index, 1);
      return newCourts;
    });
  };

  const onFinishCourt = (courtIndex: number) => {
    setCourts((prevCourts) => {
      const newCourts = [...prevCourts];
      const playersToMove = newCourts[courtIndex];

      // Clear the court
      newCourts[courtIndex] = [];

      // Add players back to end of waiting list
      setPlayers((prev) => [
        ...prev.filter((p) => !playersToMove.find((cp) => cp.name === p.name)),
        ...playersToMove,
      ]);

      return newCourts;
    });
  };


  const movePlayer = (player: Player, toCourtIndex?: number) => {
    setCourts((prevCourts) => {
      // Remove player from all courts
      const newCourts = prevCourts.map((court) =>
        court.filter((p) => p.name !== player.name)
      );

      if (toCourtIndex === undefined) {
        // Move to waiting list — no need to touch courts
        return newCourts;
      }

      // Enforce max 4
      if (newCourts[toCourtIndex].length >= 4) return newCourts;

      // Add player to new court
      newCourts[toCourtIndex] = [...newCourts[toCourtIndex], player];

      return newCourts;
    });

    // Move dragged player to the end of the player list (affects waiting list ordering)
    if (toCourtIndex === undefined) {
      setPlayers((prevPlayers) => {
        const withoutPlayer = prevPlayers.filter((p) => p.name !== player.name);
        return [...withoutPlayer, player]; // add to end
      });
    }
  };

  const removeFromWaitingList = (playerName: string) => {
    setPlayers((prev) => prev.filter((p) => p.name !== playerName));
  };

  const onChangeColor = (playerName: string, newColor: Player["color"]) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.name === playerName ? { ...p, color: newColor } : p
      )
    );
  };


  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex min-h-screen bg-gradient-to-r from-purple-700 to-blue-500 text-white">
        <Sidebar
          players={players}
          setPlayers={setPlayers}
          setWaitingList={() => {}}
        />

        <div className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Unity Matchmaker</h1>
            <button
              onClick={addCourt}
              className="bg-white text-black px-4 py-2 rounded hover:bg-gray-200"
            >
              ➕ Add Court
            </button>
          </div>

          <div className="flex flex-wrap gap-4 justify-center mb-8">
            {courts.map((courtPlayers, i) => {
              const enrichedPlayers = courtPlayers.map((p) => players.find((gp) => gp.name === p.name)!);
              return (
                <CourtCard
                  key={i}
                  courtIndex={i}
                  players={enrichedPlayers}
                  movePlayer={movePlayer}
                  removeCourt={removeCourt}
                  onFinishCourt={onFinishCourt}
                />
              );
            })}
          </div>

          <WaitingList 
            players={waitingList} 
            movePlayer={movePlayer}
            removeFromWaitingList={removeFromWaitingList}
            onChangeColor={onChangeColor} 
          />
        </div>
      </div>
    </DndProvider>
  );
};

export default App;
