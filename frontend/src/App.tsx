import React, { useEffect, useState } from "react";
import CourtCard from "./components/CourtCard";
import WaitingList from "./components/WaitingList";
import Sidebar from "./components/Sidebar";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { Player, Court, Preset } from "./types/types";
import { fetchWaitingList, saveWaitingList, saveCourts, fetchCourts, incrementGamesPlayed, fetchPresets, savePresets } from "./api";
import { v4 as uuidv4} from "uuid";
import PresetList from "./components/PresetList";

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  
  const assignedNames = new Set([
    ...courts.flatMap((c) => c.players.map((p) => p.name)),
    ...presets.flatMap((p) => p.players.map((p) => p.name)),
  ]);

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

      const presetList = await fetchPresets();
      setPresets(presetList);
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

    const waitingListwithOrder = unique.map((p, i) => ({ ...p, order: i }));
    saveWaitingList(waitingListwithOrder);

    saveCourts(courts);
    const withOrder = presets.map((p, i) => ({ ...p, order: i }));
    savePresets(withOrder);
  }, [players, courts, presets, initialized]);


  const addCourt = () => {
    setCourts((prev) => [
      ...prev,
      { id: uuidv4() ,court_number: prev.length, players: [] }
    ]);
  };


  const removeCourt = (courtId: string) => {
    setCourts((prev) => {
      const updated = prev.filter(c => c.id !== courtId);
      saveCourts(updated); // persist immediately
      return updated;
    });
  };


  const onFinishCourt = (courtId: string) => {
  const playersToMove = courts.find(c => c.id === courtId)?.players ?? [];
  const namesToMove = new Set(playersToMove.map(p => p.name));

  // Update local players with +1 games_played and put them at the end
  setPlayers((prev) => {
      const others = prev.filter((p) => !namesToMove.has(p.name));
      const updatedReturning = playersToMove.map((p) => {
        const current = prev.find(pp => pp.name === p.name);
        return {
          ...p,
          color: current?.color || p.color || "Green",
          games_played: (current?.games_played ?? 0) + 1,
        };
      });

      return [...others, ...updatedReturning]; //  ensures returning players are last
    });

    // Update DB
    incrementGamesPlayed(playersToMove.map(p => p.name));

    // Clear the court
    setCourts((prevCourts) =>
      prevCourts.map((court) =>
        court.id === courtId ? { ...court, players: [] } : court
      )
    );
  };



  const movePlayer = (player: Player, toCourtId?: string) => {
    // Ensure the player exists in global state
    setPlayers((prevPlayers) => {
      const alreadyIn = prevPlayers.some((p) => p.name === player.name);
      const without = prevPlayers.filter((p) => p.name !== player.name);
      if (!alreadyIn) {
        return [...without, player];
      }
      return toCourtId ? without : [...without, player];
    });

    setCourts((prevCourts) => {
      let updatedCourts = prevCourts.map((court) => ({
        ...court,
        players: court.players.filter((p) => p.name !== player.name),
      }));

      if (!toCourtId) return updatedCourts;

      const court = updatedCourts.find((c) => c.id === toCourtId);
      if (!court || court.players.length >= 4 || court.players.some(p => p.name === player.name)) return updatedCourts;

      court.players.push(player);
      return [...updatedCourts];
    });
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
        {/* Left Sidebar */}
        <Sidebar
          onAddToWaitingList={(player) =>
            setPlayers((prev) =>
              prev.find((p) => p.name === player.name) ? prev : [...prev, player]
            )
          }
        />

        {/* Main Court Area */}
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

          <div className="grid gap-4 justify-center mb-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3">
            {courts.map((court, i) => {
              const enrichedPlayers = court.players.map((p) => {
              const match = players.find((gp) => gp.name === p.name);
              return {
                ...p,
                color: match?.color || p.color || "Green",
                games_played: match?.games_played ?? p.games_played ?? 0,
              };
            });

              return (
                <CourtCard
                  key={court.id}
                  courtId={court.id}
                  courtIndex={i}
                  players={enrichedPlayers}
                  movePlayer={movePlayer}
                  removeCourt={removeCourt}
                  onFinishCourt={onFinishCourt}
                  removePreset={(presetId) =>
                    setPresets((prev) => prev.filter((p) => p.id !== presetId))
                  }
                />
              );
            })}
          </div>
          {/* preset lsit */}
          <PresetList
              presets={presets}
              setPresets={setPresets}
              waitingList={waitingList}
              setPlayers={setPlayers}
          />
        </div>

        {/* Right Waiting List */}
        <div className="w-80 p-4">
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
