// hooks/useRemovePlantsFromBed.ts
import { useMutation } from "@apollo/client";
import { REMOVE_PLANTS_FROM_BED } from "../utils/mutations";
import { GET_BEDS } from "../utils/queries";

export default function useRemovePlantsFromBed() {
  const [removePlantsFromBedMutation] = useMutation(REMOVE_PLANTS_FROM_BED, {
    refetchQueries: [{ query: GET_BEDS }],
    awaitRefetchQueries: true,
  });

  const removePlantsFromBed = async (bedId: string, plantInstanceIds: string[]) => {
    try {
      const result = await removePlantsFromBedMutation({
        variables: { bedId, plantInstanceIds },
      });
      // Return the updated bed from the mutation result
      return result.data?.removePlantsFromBed;
    } catch (err) {
      console.error("Error removing plants:", err);
      return null;
    }
  };

  return removePlantsFromBed;
}
