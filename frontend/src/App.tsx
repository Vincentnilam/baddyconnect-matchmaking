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
  const [initialized, setInitialized] = useState(false);

  const assignedIds = new Set([
    ...courts.flatMap((c) => c.players.map((p) => p.id)),
    ...presets.flatMap((p) => p.players.map((p) => p.id)),
  ]);
  const waitingList = players.filter((p) => !assignedIds.has(p.id));

  useEffect(() => {
    const load = async () => {
      const list = await fetchWaitingList();
      setPlayers(list);

      const loadedCourts = await fetchCourts();
      const validCourts = loadedCourts
        .filter(court => typeof court.court_number === "number" && Array.isArray(court.players))
        .map(court => ({
          id: court.id,
          court_number: court.court_number,
          players: court.players.filter(p => p.id),
        }));

      setCourts(validCourts.length > 0 ? validCourts : [{ id: uuidv4(), court_number: 0, players: [] }]);

      const presetList = await fetchPresets();
      setPresets(presetList);

      setInitialized(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const assigned = new Set(courts.flatMap((court) => court.players.map((p) => p.id)));
    const unassigned = players.filter((p) => !assigned.has(p.id));

    const uniqueIds = new Set();
    const unique = unassigned.filter((p) => {
      if (uniqueIds.has(p.id)) return false;
      uniqueIds.add(p.id);
      return true;
    });

    const waitingListwithOrder = unique.map((p, i) => ({ ...p, order: i }));
    saveWaitingList(waitingListwithOrder);
    saveCourts(courts);
    savePresets(presets.map((p, i) => ({ ...p, order: i })));
  }, [players, courts, presets, initialized]);

  const addCourt = () => {
    setCourts((prev) => [...prev, { id: uuidv4(), court_number: prev.length, players: [] }]);
  };

  const removeCourt = (courtId: string) => {
    setCourts((prev) => {
      const updated = prev.filter(c => c.id !== courtId);
      saveCourts(updated);
      return updated;
    });
  };

  const onFinishCourt = (courtId: string) => {
    const playersToMove = courts.find(c => c.id === courtId)?.players ?? [];
    const idsToMove = new Set(playersToMove.map(p => p.id));

    setPlayers((prev) => {
      const others = prev.filter((p) => !idsToMove.has(p.id));
      const updatedReturning = playersToMove.map((p) => {
        const current = prev.find(pp => pp.id === p.id);
        return {
          ...p,
          color: current?.color || p.color || "Green",
          games_played: (current?.games_played ?? 0) + 1,
        };
      });
      return [...others, ...updatedReturning];
    });

    incrementGamesPlayed(playersToMove.map(p => p.name));

    setCourts((prevCourts) =>
      prevCourts.map((court) =>
        court.id === courtId ? { ...court, players: [] } : court
      )
    );
  };

  const movePlayer = (player: Player, toCourtId?: string) => {
    setPlayers((prev) => {
      const without = prev.filter((p) => p.id !== player.id);
      return toCourtId ? without : [...without, player];
    });

    setCourts((prevCourts) => {
      let updated = prevCourts.map((court) => ({
        ...court,
        players: court.players.filter((p) => p.id !== player.id),
      }));

      if (!toCourtId) return updated;

      const court = updated.find((c) => c.id === toCourtId);
      if (!court || court.players.length >= 4 || court.players.some(p => p.id === player.id)) return updated;

      court.players.push(player);
      return [...updated];
    });
  };

  const removeFromWaitingList = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  };

  const onChangeColor = (playerId: string, newColor: Player["color"]) => {
    setPlayers((prev) => prev.map((p) => p.id === playerId ? { ...p, color: newColor } : p));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex min-h-screen bg-gradient-to-r from-purple-700 to-blue-500 text-white">
        <Sidebar
          onAddToWaitingList={(player) =>
            setPlayers((prev) =>
              prev.some((p) => p.id === player.id) ? prev : [...prev, player]
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

          <div className="grid gap-4 justify-center mb-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-2">
            {courts.map((court, i) => {
              const enrichedPlayers = court.players.map((p) => {
                const match = players.find((gp) => gp.id === p.id);
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

          <PresetList
            presets={presets}
            setPresets={setPresets}
            waitingList={waitingList}
            setPlayers={setPlayers}
          />
        </div>

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