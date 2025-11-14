import { useEffect, useState } from "react";
import { computeBaseGrowthRate } from "../../../shared/growth";

export function useBaseGrowthRate(
  maxHeight: number | null | undefined,
  maturitySpec: string | number | null | undefined
) {
  const [baseGrowthRate, setBaseGrowthRate] = useState<number | null>(null);

  useEffect(() => {
    const val = computeBaseGrowthRate(maxHeight, maturitySpec);
    setBaseGrowthRate(val);
  }, [maxHeight, maturitySpec]);

  return baseGrowthRate;
}
