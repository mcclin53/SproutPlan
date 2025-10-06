import { useMutation } from "@apollo/client";
import { REMOVE_BED } from "../utils/mutations";

export default function useRemoveBed() {
  const [removeBedMutation] = useMutation(REMOVE_BED);

  const removeBed = async (bedId: string) => {
    try {
      await removeBedMutation({
        variables: { bedId },
        update(cache) {
          cache.modify({
            fields: {
              beds(existingBeds = [], { readField }) {
                return existingBeds.filter(
                  (bedRef: any) => readField("_id", bedRef) !== bedId
                );
              },
            },
          });
        },
      });
    } catch (err) {
      console.error("Error removing bed:", err);
    }
  };

  return removeBed;
}