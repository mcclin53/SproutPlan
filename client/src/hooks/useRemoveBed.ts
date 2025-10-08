import { useMutation } from "@apollo/client";
import { REMOVE_BED } from "../utils/mutations";
import { GET_BEDS } from "../utils/queries";

export default function useRemoveBed(removeLocalBed?: (bedId: string) => void) {
  const [removeBedMutation] = useMutation(REMOVE_BED, {
    update(cache, { data }) {
      if (!data?.removeBed) return;

      cache.modify({
        fields: {
          beds(existingBedsRefs = [], { readField }) {
            return existingBedsRefs.filter(
              (bedRef: any) => readField("_id", bedRef) !== data.removeBed._id
            );
          },
        },
      });
    },
  });

  const removeBed = async (bedId: string) => {
    try {
      if (removeLocalBed) removeLocalBed(bedId);

      await removeBedMutation({
        variables: { bedId },
      });
    } catch (error) {
      console.error("Error removing bed:", error);
      // Optionally still remove locally if server fails
      if (removeLocalBed) removeLocalBed(bedId);
    }
  };

  return removeBed;
}
