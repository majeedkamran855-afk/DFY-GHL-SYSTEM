// mao-calculator.ts — Maximum Allowable Offer calculation.
//
// Implemented as a pure, versioned function so historical offers remain auditable
// even if the formula changes later. The version/factor used for a given Offer
// should be persisted on Offer.maoFormula (see prisma/schema.prisma) — never
// silently recalculate a formula change onto already-presented offers.

export interface MaoInput {
  arv: number; // After Repair Value, typically from the AVM/Comps engine
  repairEstimate: number;
  wholesaleFeeTarget: number;
  /** The "70% rule" by default; configurable per market/workspace/asset condition. */
  investorMarginFactor?: number;
}

/**
 * MAO = (ARV * factor) - Repairs - Wholesale Fee
 *
 * Example: ARV $250,000, Repairs $35,000, Fee $10,000, factor 0.70
 *   MAO = (250000 * 0.70) - 35000 - 10000 = 175000 - 45000 = $130,000
 */
export function calculateMAO({
  arv,
  repairEstimate,
  wholesaleFeeTarget,
  investorMarginFactor = 0.7,
}: MaoInput): number {
  const mao = arv * investorMarginFactor - repairEstimate - wholesaleFeeTarget;
  return Math.max(0, Math.round(mao));
}

// ---------------------------------------------------------------------------
// Comp similarity scoring — supports the AVM pipeline described in the
// architecture spec (Section 3.3). Produces a normalized similarity distance
// per candidate comp; lower = more similar to the subject property.
// ---------------------------------------------------------------------------

export interface CompFeatures {
  distanceMiles: number;
  sqftDeltaPct: number; // (comp.sqft - subject.sqft) / subject.sqft
  ageDeltaYears: number;
  daysSinceSold: number;
  bedDelta: number;
  bathDelta: number;
}

export interface CompWeightConfig {
  distance: number;
  sqft: number;
  age: number;
  recency: number;
  beds: number;
  baths: number;
}

const DEFAULT_WEIGHTS: CompWeightConfig = {
  distance: 0.3,
  sqft: 0.25,
  age: 0.1,
  recency: 0.2,
  beds: 0.075,
  baths: 0.075,
};

/** Lower score = more similar. Used to rank/filter comps and to weight the $/sqft average. */
export function scoreCompSimilarity(
  features: CompFeatures,
  weights: CompWeightConfig = DEFAULT_WEIGHTS
): number {
  const normalizedDistance = Math.min(features.distanceMiles / 3, 1); // cap at 3mi radius
  const normalizedSqft = Math.min(Math.abs(features.sqftDeltaPct), 1);
  const normalizedAge = Math.min(features.ageDeltaYears / 30, 1);
  const normalizedRecency = Math.min(features.daysSinceSold / 365, 1);
  const normalizedBeds = Math.min(Math.abs(features.bedDelta) / 3, 1);
  const normalizedBaths = Math.min(Math.abs(features.bathDelta) / 3, 1);

  return (
    normalizedDistance * weights.distance +
    normalizedSqft * weights.sqft +
    normalizedAge * weights.age +
    normalizedRecency * weights.recency +
    normalizedBeds * weights.beds +
    normalizedBaths * weights.baths
  );
}

export interface Comp {
  soldPrice: number;
  squareFootage: number;
  similarityDistance: number; // from scoreCompSimilarity
}

/**
 * Weighted-average $/sqft ARV estimate. Weight = 1 / (1 + similarityDistance),
 * so more-similar comps (lower distance) pull the estimate harder.
 */
export function estimateARV(subjectSqft: number, comps: Comp[]): { arv: number; confidence: number } {
  if (comps.length === 0) {
    return { arv: 0, confidence: 0 };
  }

  let weightedPricePerSqftSum = 0;
  let weightSum = 0;
  const pricesPerSqft: number[] = [];

  for (const comp of comps) {
    const pricePerSqft = comp.soldPrice / comp.squareFootage;
    const weight = 1 / (1 + comp.similarityDistance);
    weightedPricePerSqftSum += pricePerSqft * weight;
    weightSum += weight;
    pricesPerSqft.push(pricePerSqft);
  }

  const avgPricePerSqft = weightedPricePerSqftSum / weightSum;
  const arv = Math.round(avgPricePerSqft * subjectSqft);

  // Confidence heuristic: more comps + lower variance in $/sqft = higher confidence
  const mean = pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length;
  const variance =
    pricesPerSqft.reduce((sum, p) => sum + (p - mean) ** 2, 0) / pricesPerSqft.length;
  const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 1;

  const countScore = Math.min(comps.length / 6, 1); // saturates at 6+ comps
  const varianceScore = Math.max(0, 1 - coefficientOfVariation);
  const confidence = Math.round(((countScore + varianceScore) / 2) * 100);

  return { arv, confidence };
}
