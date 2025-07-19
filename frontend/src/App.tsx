import React, { useEffect, useState } from "react";
import CourtCard from "./components/CourtCard";
import WaitingList from "./components/WaitingList";
import Sidebar from "./components/Sidebar";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { Player, Court } from "./types/types";
import { fetchWaitingList, saveWaitingList, saveCourts, fetchCourts, incrementGamesPlayed } from "./api";
import { v4 as uuidv4} from "uuid";

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);

  const assignedNames = new Set(courts.flatMap((c) => c.players.map((p) => p.name)));
  const waitingList = players.filter((p) => !assignedNames.has(p.name));
  const [initialized, setInitialized] = useState(false);

  // First load fetch
  useEffect(() => {
    const load = async () => {
      const list = await fetchWaitingList();
      setPlayers(list);
      const loadedCourts = await fetchCourts();
      // Filter out any malformed courts (e.g., missing court_number or no players array)
      const validCourts = loadedCourts
        .filter(court => typeof court.court_number === "number" && Array.isArray(court.players))
        .map(court => ({
          id: court.id,
          court_number: court.court_number,
          players: court.players.filter(p => p.name), // remove players without names
        }));

      // If no valid courts found, add an empty one
      if (validCourts.length === 0) {
        setCourts([{ id: uuidv4(), court_number: 0, players: [] }]);
      } else {
        setCourts(validCourts);
      }
      setInitialized(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const assigned = new Set(courts.flatMap((court) => court.players.map((p) => p.name)));
    const unassigned = players.filter((p) => !assigned.has(p.name));

    const uniqueNames = new Set();
    const unique = unassigned.filter((p) => {
      if (uniqueNames.has(p.name)) return false;
      uniqueNames.add(p.name);
      return true;
    });
    saveWaitingList(unique);
    saveCourts(courts);
  }, [players, courts, initialized]);


  const addCourt = () => {
    setCourts((prev) => [
      ...prev,
      { id: uuidv4() ,court_number: prev.length, players: [] }
    ]);
  };


  const removeCourt = (courtId: string) => {
    setCourts((prev) => prev.filter(c => c.id !== courtId));
  };


  const onFinishCourt = (courtId: string) => {
    setCourts((prevCourts) => {
      const newCourts = prevCourts.map((court) => {
        if (court.id !== courtId) return court;

        const playersToMove = court.players;

        // Move players back to waiting list
        setPlayers((prev) => [
          ...prev.filter((p) => !playersToMove.find((cp) => cp.name === p.name)),
          ...playersToMove,
        ]);

        incrementGamesPlayed(playersToMove.map((p) => p.name));

        return { ...court, players: [] };
      });

      return newCourts;
    });
};


  const movePlayer = (player: Player, toCourtId?: string) => {
    setCourts((prevCourts) => {
      let updatedCourts = prevCourts.map((court) => ({
        ...court,
        players: court.players.filter((p) => p.name !== player.name),
      }));

      if (!toCourtId) return updatedCourts;

      const court = updatedCourts.find((c) => c.id === toCourtId);
      if (!court || court.players.length >= 4) return updatedCourts;

      court.players.push(player);
      return [...updatedCourts];
    });

    if (!toCourtId) {
      setPlayers((prevPlayers) => {
        const without = prevPlayers.filter((p) => p.name !== player.name);
        return [...without, player];
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
          onAddToWaitingList={(player) =>
            setPlayers((prev) =>
              prev.find((p) => p.name === player.name) ? prev : [...prev, player]
            )
          }
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
            {courts.map((court, i) => {
              const enrichedPlayers = court.players.map((p) =>
                players.find((gp) => gp.name === p.name) || p
              );

              return (
                <CourtCard
                  key={court.id}
                  courtId={court.id}
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
