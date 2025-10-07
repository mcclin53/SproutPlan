import { useMutation } from "@apollo/client";
import { REMOVE_PLANTS_FROM_BED } from "../utils/mutations";
import { GET_BEDS } from "../utils/queries"; // make sure you have this query

export default function useRemovePlantsFromBed() {
  const [removePlantsFromBedMutation] = useMutation(REMOVE_PLANTS_FROM_BED, {
    refetchQueries: [{ query: GET_BEDS }], // refetch beds after removal
    awaitRefetchQueries: true, // ensures UI updates after refetch
  });

  const removePlantsFromBed = async (bedId: string, plantInstanceIds: string[]) => {
    try {
      await removePlantsFromBedMutation({ variables: { bedId, plantInstanceIds } });
    } catch (err) {
      console.error("Error removing plants:", err);
    }
  };

  return removePlantsFromBed;
}
