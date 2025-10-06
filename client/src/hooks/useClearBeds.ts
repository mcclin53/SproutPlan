import { useMutation } from "@apollo/client";
import { CLEAR_BEDS } from "../utils/mutations";

export default function useClearBeds() {
  const [clearBedsMutation] = useMutation(CLEAR_BEDS);

  const clearBeds = async () => {
    try {
      await clearBedsMutation({
        update(cache) {
          cache.modify({
            fields: {
              beds() {
                return [];
              },
            },
          });
        },
      });
    } catch (err) {
      console.error("Error clearing beds:", err);
    }
  };

  return clearBeds;
}