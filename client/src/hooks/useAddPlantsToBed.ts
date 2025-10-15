import { useMutation, gql } from "@apollo/client";
import { ADD_PLANTS_TO_BED } from "../utils/mutations";
import { GET_BEDS } from "../utils/queries";

export default function useAddPlantsToBed() {
  const [addPlantsToBedMutation] = useMutation(ADD_PLANTS_TO_BED, {
    update(cache, { data: { addPlantsToBed } }) {
      if (!addPlantsToBed?._id) return;

      cache.modify({
        fields: {
          beds(existingBeds = [], { readField }) {
            const updatedBedId = addPlantsToBed._id;

            const updatedBedRef = cache.writeFragment({
              data: addPlantsToBed,
              fragment: gql`
                fragment UpdatedBed on Bed {
                  _id
                  width
                  length
                  plantInstances {
                    _id
                    basePlant {
                      _id
                      name
                      image
                      waterReq
                      spacing
                    }
                  }
                }
              `,
            });

            return existingBeds.map((bedRef: any) =>
              readField("_id", bedRef) === updatedBedId
                ? updatedBedRef
                : bedRef
            );
          },
        },
      });
    },
    refetchQueries: [{ query: GET_BEDS }],
  });

  const addPlantsToBed = async (
    bedId: string,
    basePlantIds: string[],
    positions: { x: number; y: number }[],
    onUpdate?: (updatedBed: any) => void
  ) => {
      console.log("addPlantsToBed called:", bedId, basePlantIds);

  if (!basePlantIds || basePlantIds.some(id => !id)) {
    console.error("Invalid basePlantIds passed:", basePlantIds);
    return;
  }
  if (!positions || positions.length !== basePlantIds.length) {
    console.error("Positions array length must match basePlantIds length");
    return;
  }
    try {
      const { data } = await addPlantsToBedMutation({
        variables: { bedId, basePlantIds, positions },
      });

      if (data?.addPlantsToBed && onUpdate) onUpdate(data.addPlantsToBed);
    } catch (err) {
      console.error("Error adding plants to bed:", err);
    }
  };

  return addPlantsToBed;
}
