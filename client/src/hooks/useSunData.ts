import { useQuery } from "@apollo/client";
import { GET_SUN_DATA } from "../utils/queries";

export const useSunData = (latitude: number, longitude: number) => {
  const { data, loading, error, refetch } = useQuery(GET_SUN_DATA, {
    variables: { latitude, longitude },
    pollInterval: 10 * 60 * 1000, // every 10 minutes
  });

  return { data, loading, error, refetch };
};