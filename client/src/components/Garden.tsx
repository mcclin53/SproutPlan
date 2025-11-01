import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { GET_BEDS, GET_PLANTS } from "../utils/queries";
import DigBed from "./DigBed";
import Bed from "./Bed";
import Plant from "./Plant";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import useAddPlantsToBed from "../hooks/useAddPlantsToBed";
import useRemoveBed from "../hooks/useRemoveBed";
import useClearBeds from "../hooks/useClearBeds";
import useDragBed from "../hooks/useDragBed";
import type { DragBed } from "../hooks/useDragBed";
import { MOVE_PLANT_IN_BED } from "../utils/mutations";
import useRemovePlantsFromBed from "../hooks/useRemovePlantsFromBed";
import { useShadow } from "../hooks/useShadow";
import { useSunData } from "../hooks/useSunData";
import { TimeController } from "./TimeController";
import SunSimulator from "./SunSimulator";
import Weather from "./Weather";
import { useWeather } from "../hooks/useWeather";
import { useWater } from "../hooks/useWater";
import PlantStats from "./PlantStats";
import { guessRootDepthM } from "../utils/waterBand";
import BedStats from "./BedStats";
// import { useTemperature } from "../hooks/useTemperature";

  // Traverse City, MI (example coords)
  const GARDEN_LAT = 44.7629;
  const GARDEN_LON = -85.6210;

export default function Garden() {
  const [localSimulatedDate, setLocalSimulatedDate] = useState(new Date());
  const handleDateChange = useCallback((date: Date) => {
    setLocalSimulatedDate(date);
  }, []);
  
  const [selected, setSelected] = useState<{ plant: any; bedId: string } | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);

  const { day: dayWeather, hourly } = useWeather(GARDEN_LAT, GARDEN_LON, localSimulatedDate);

  // Apollo
  const { loading: bedsLoading, error: bedsError, data: bedsData } = useQuery(GET_BEDS);
  const { loading: plantsLoading, error: plantsError, data: plantsData } = useQuery(GET_PLANTS);

  // Mutations / hooks
  const addPlantsToBed = useAddPlantsToBed();
  const clearBeds = useClearBeds();
  const removePlantsFromBed = useRemovePlantsFromBed();
  const [movePlantInBedMutation] = useMutation(MOVE_PLANT_IN_BED);

  // Local drag state for beds
  const [dragBeds, setDragBeds] = useState<DragBed[]>([]);
  const { beds, moveBed, setBeds } = useDragBed(dragBeds);

  const [liveByPlant, setLiveByPlant] = React.useState<Record<
  string,
  { height?: number; canopy?: number; sunHours?: number; tempOkHours?: number }
>>({}); // NEW

// stable callback to store live stats
  const handleLiveStats = React.useCallback((p: {
  plantId: string; height?: number; canopy?: number; sunHours?: number; tempOkHours?: number;
  }) => {
    setLiveByPlant(prev => ({ ...prev, [p.plantId]: { height: p.height, canopy: p.canopy, sunHours: p.sunHours, tempOkHours: p.tempOkHours } }));
  }, []);

  const { soil, waterEff, irrigate, waterMin, waterMax } = useWater({
    bedId: "garden-default",
    day: dayWeather,
    initialSoil: { capacityMm: 60, moistureMm: 36, percolationMmPerDay: 2 },
    waterUseFactor: 1.0,
    });

  // Keep drag state in sync with server beds
  useEffect(() => {
    if (!bedsData?.beds?.length) return;

    const GRID_SIZE = 50;
    const PADDING = 20;

    setDragBeds(prevDragBeds => {
      const prevMap = new Map(prevDragBeds.map(b => [b._id, b]));
      const placed: DragBed[] = [];

      for (const bed of bedsData.beds) {
        const localBed = prevMap.get(bed._id);

        // Merge local positions for plants that still exist
        const mergedPlantInstances = (bed.plantInstances || []).map(sp => {
          const localPlant = localBed?.plantInstances?.find(lp => lp._id === sp._id);
          return {
            ...sp,
            x: localPlant?.x ?? sp.x ?? 0,
            y: localPlant?.y ?? sp.y ?? 0,
          };
        });

        let x = typeof bed.x === "number" ? bed.x : localBed?.x ?? PADDING;
        let y = typeof bed.y === "number" ? bed.y : localBed?.y ?? PADDING;

        // Compute non-overlapping spot if coordinates not provided
        const overlaps = (ox: number, oy: number, w: number, l: number) =>
          [...prevDragBeds, ...placed].some(
            b =>
              ox < b.x + b.width * GRID_SIZE + PADDING &&
              ox + w * GRID_SIZE + PADDING > b.x &&
              oy < b.y + b.length * GRID_SIZE + PADDING &&
              oy + l * GRID_SIZE + PADDING > b.y
          );

        if (typeof bed.x !== "number" || typeof bed.y !== "number") {
          while (overlaps(x, y, bed.width, bed.length)) {
            x += GRID_SIZE * bed.width + PADDING;
            if (x + bed.width * GRID_SIZE > window.innerWidth - PADDING) {
              x = PADDING;
              y += GRID_SIZE * bed.length + PADDING;
            }
          }
        }

        placed.push({ ...bed, x, y, plantInstances: mergedPlantInstances });
      }

      return placed;
    });
  }, [bedsData]);

  // Push dragBeds into the drag system
  useEffect(() => {
    setBeds(dragBeds);
  }, [dragBeds, setBeds]);

  // Move/remove helpers
  const removeLocalBed = (bedId: string) => {
    setDragBeds(prev => prev.filter(b => b._id !== bedId));
  };
  const removeBed = useRemoveBed(removeLocalBed);

  const handleRemovePlant = async (bedId: string, plantInstanceId: string) => {
    // optimistic local remove
    setDragBeds(prev =>
      prev.map(bed => {
        if (bed._id !== bedId) return bed;
        return {
          ...bed,
          plantInstances: bed.plantInstances?.filter(p => p._id !== plantInstanceId) || [],
        };
      })
    );

    try {
      const updatedBed = await removePlantsFromBed(bedId, [plantInstanceId]);

      // merge remaining plant positions
      setDragBeds(prev =>
        prev.map(b => {
          if (b._id !== updatedBed._id) return b;
          const mergedPlantInstances = updatedBed.plantInstances.map(p => {
            const localPlant = b.plantInstances?.find(lp => lp._id === p._id);
            return localPlant ? { ...p, x: localPlant.x, y: localPlant.y } : p;
          });
          return { ...b, plantInstances: mergedPlantInstances };
        })
      );
    } catch (err) {
      console.error("Error removing plant from bed:", err);
    }
  };

  const movePlantInBed = (bedId: string, plantId: string, newX: number, newY: number) => {
    // optimistic local move
    setDragBeds(prev =>
      prev.map(bed =>
        bed._id === bedId
          ? {
              ...bed,
              plantInstances: (bed.plantInstances || []).map(p =>
                p._id === plantId ? { ...p, x: newX, y: newY } : p
              ),
            }
          : bed
      )
    );

    // fire-and-forget mutation
    movePlantInBedMutation({
      variables: { bedId, position: { plantInstanceId: plantId, x: newX, y: newY } },
    }).catch(err => console.error(err));
  };

  const getPlantCoordinates = useCallback(
    (bedId: string, plantId: string) => {
      const targetBed = dragBeds.find(b => b._id === bedId);
      const plant = targetBed?.plantInstances?.find(p => p._id === plantId);
      return plant ? { x: plant.x ?? 0, y: plant.y ?? 0 } : undefined;
    },
    [dragBeds]
  );

  // ---------- Sun + Shadows ----------
  const { data: sunData } = useSunData(GARDEN_LAT, GARDEN_LON, localSimulatedDate);

  // Build scene objects (screen coords)
  const sceneObjects = React.useMemo(
    () =>
      dragBeds.flatMap(bed =>
        (bed.plantInstances || []).map(p => ({
          _id: p._id,
          type: "plant" as const,
          x: bed.x + (p.x ?? 0),
          y: bed.y + (p.y ?? 0),
          height: p.height ?? 0,           // cm
          canopyRadius: p.canopyRadius ?? 0, // cm
        }))
      ),
    [dragBeds]
  );

  // feed screen-mapped azimuth/elevation into useShadow
  const shadowData = useShadow(
    sceneObjects,
    sunData ? { elevation: sunData.solarElevation, azimuth: sunData.screenAzimuth } : null, true
  );

  // also pass the same sunDirection to Bed (for any UI/overlay arrows)
  const sunDirection = sunData
    ? { elevation: sunData.solarElevation, azimuth: sunData.screenAzimuth }
    : null;

  // ---------- Render ----------
  if (bedsLoading || plantsLoading) return <p>Loading garden...</p>;
  if (bedsError) return <p>Error loading beds: {bedsError.message}</p>;
  if (plantsError) return <p>Error loading plants: {plantsError.message}</p>;

  const plantsToRender = plantsData.plants;

  const isNight = sunData ? sunData.solarElevation <= 0 : false;

  return (
    <div>
      <DigBed />

      <TimeController
        initialDate={new Date()}
        speed={200}
        onDateChange={handleDateChange}
      />

      <DndProvider backend={HTML5Backend}>
        <div className="plant-palette">
          <h3>Select Plants</h3>
          {plantsToRender.map((plant: any, index: number) => (
            <Plant key={plant._id ?? `fallback-${index}`} plant={plant} />
          ))}
        </div>

        <div style={{ position: "fixed", right: 16, top: 16, width: 300 }}>
        <Weather lat={GARDEN_LAT} lon={GARDEN_LON} onIrrigate={(mm) => irrigate(mm)} />
        </div>

        {/* Garden beds */}
        <div className={` garden ${isNight ? "night" : ""}`}>
          <div className="garden-canvas">
          {beds.map(bed => (
            <Bed
              key={bed._id + (bed.plantInstances?.length ?? 0)}
              bed={bed}
              sunDirection={sunDirection}
              simulatedDate={localSimulatedDate}
              shadedIds={shadowData.shadedPlants}
              dayWeather={dayWeather}
              soil={soil}
              hourlyTempsC={hourly?.tempC}
              onOpenStats={(id) => setSelectedBedId(id)}
              onAddBasePlantsToBed={(bedId, basePlantIds, positions) => {
                addPlantsToBed(bedId, basePlantIds, positions, (updatedBed) => {
                  setDragBeds(prev =>
                    prev.map(b => {
                      if (b._id !== updatedBed._id) return b;
                      const mergedPlantInstances = updatedBed.plantInstances.map(sp => {
                        const localPlant = b.plantInstances?.find(lp => lp._id === sp._id);
                        const posIndex = basePlantIds.indexOf(sp.basePlant._id);
                        const pos = positions[posIndex] || { x: sp.x, y: sp.y };
                        return localPlant
                          ? { ...sp, x: localPlant.x, y: localPlant.y }
                          : { ...sp, x: pos.x, y: pos.y };
                        });
                        return { ...b, plantInstances: mergedPlantInstances };
                      })
                    );
                    
                  });
                }}
                onRemoveBed={() => removeBed(bed._id)}
                moveBed={moveBed}
                movePlantInBed={movePlantInBed}
                getPlantCoordinates={getPlantCoordinates}
                handleRemovePlant={handleRemovePlant}
                onPlantClick={({ plantInstance, bedId }) => setSelected({ plant: plantInstance, bedId })}
                onLiveStats={handleLiveStats}
              />
              ))}
              {!isNight && (
                <svg
                className="garden-shadows"
                width="100%"
                height="100%"
                viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
              >
                {shadowData.shadowVectors.map(v => (
                  <line
                    key={v._id}
                    x1={(v.startX ?? v.x)}
                    y1={(v.startY ?? v.y)}
                    x2={v.shadowEndX}
                    y2={v.shadowEndY}
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth={2}
                  />
                ))}
              </svg>
              )}
            <SunSimulator sunData={sunData} fullScreen intensityMultiplier={1.1} vignetteStrength={1} zIndex={2147483000} />
          </div>
        </div>
      </DndProvider>

      {selected && ( 
      <PlantStats
        plant={selected.plant}
        bedId={selected.bedId}
        soil={{ moistureMm: soil.moistureMm, capacityMm: soil.capacityMm }} // from useWater
        simulatedDate={localSimulatedDate}
        todaySunHours={liveByPlant[selected.plant._id]?.sunHours}
        todayTempOkHours={liveByPlant[selected.plant._id]?.tempOkHours}
        liveHeight={liveByPlant[selected.plant._id]?.height}
        liveCanopy={liveByPlant[selected.plant._id]?.canopy}
        onClose={() => setSelected(null)}   
      />
      )}
      {selectedBedId && (
        <BedStats
          bedId={selectedBedId}
          bedLabel={`Bed ${selectedBedId.slice(-4)}`}
          soil={{ moistureMm: soil.moistureMm, capacityMm: soil.capacityMm }}
          waterEff={waterEff}
          waterMin={waterMin}
          waterMax={waterMax}
          onClose={() => setSelectedBedId(null)}
        />
      )}

      {/* Clear all beds button */}
      {beds.length > 0 && (
        <button
          className="button clear-beds"
          onClick={async () => {
            await clearBeds();
            setDragBeds([]);
          }}
        >
          Clear All Beds
        </button>
      )}
    </div>
  );
}
