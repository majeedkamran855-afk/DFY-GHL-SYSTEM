function calculateMAO({ arv, repairEstimate, wholesaleFeeTarget, investorMarginFactor = 0.7 }) {
  const values = [arv, repairEstimate, wholesaleFeeTarget, investorMarginFactor];
  if (!values.every(Number.isFinite) || arv < 0 || repairEstimate < 0 ||
      wholesaleFeeTarget < 0 || investorMarginFactor <= 0 || investorMarginFactor > 1) {
    throw new Error('Provide valid non-negative amounts and a factor between 0 and 1');
  }
  return Math.max(0, Math.round(arv * investorMarginFactor - repairEstimate - wholesaleFeeTarget));
}
module.exports = { calculateMAO };
