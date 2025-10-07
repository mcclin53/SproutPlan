import { useMutation, gql } from "@apollo/client";
import { ADD_PLANTS_TO_BED } from "../utils/mutations";

export default function useAddPlantsToBed() {
  const [addPlantsToBedMutation] = useMutation(ADD_PLANTS_TO_BED, {
    update(cache, { data: { addPlantsToBed } }) {
      cache.modify({
        fields: {
          beds(existingBeds = []) {
            return existingBeds.map((bedRef: any) =>
              bedRef.__ref === `Bed:${addPlantsToBed._id}`
                ? cache.writeFragment({
                    id: cache.identify(addPlantsToBed),
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
                    data: addPlantsToBed,
                  })
                : bedRef
            );
          },
        },
      });
    },
  });

  const addPlantsToBed = async (bedId: string, basePlantIds: string[]) => {
    try {
      await addPlantsToBedMutation({ variables: { bedId, basePlantIds } });
    } catch (err) {
      console.error("Error adding plant:", err);
    }
  };

  return addPlantsToBed;
}
