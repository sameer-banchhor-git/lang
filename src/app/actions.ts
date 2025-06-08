"use server";

import type { DataPoint } from "@/lib/schemas";

interface LagrangeResult {
  interpolatedValue: number | null;
  polynomialTermsDisplay: string[];
  error?: string;
}

export async function calculateLagrangeInterpolation(
  dataPoints: DataPoint[],
  interpolationX: number
): Promise<LagrangeResult> {
  if (dataPoints.length < 2) {
    return { interpolatedValue: null, polynomialTermsDisplay: [], error: "At least two data points are required." };
  }

  const xValues = dataPoints.map(p => p.x);
  if (new Set(xValues).size !== xValues.length) {
    return { interpolatedValue: null, polynomialTermsDisplay: [], error: "All X values in data points must be unique." };
  }

  let lagrangeSum = 0;
  const polynomialTermsDisplay: string[] = [];
  const n = dataPoints.length;

  for (let j = 0; j < n; j++) {
    let term = dataPoints[j].y;
    let basisPolynomialNumeratorString = "";
    let basisPolynomialDenominatorValue = 1;

    for (let k = 0; k < n; k++) {
      if (j === k) continue;
      term *= (interpolationX - dataPoints[k].x) / (dataPoints[j].x - dataPoints[k].x);
      
      basisPolynomialNumeratorString += `(x - ${dataPoints[k].x.toString()})`;
      basisPolynomialDenominatorValue *= (dataPoints[j].x - dataPoints[k].x);
    }
    
    const termCoefficient = dataPoints[j].y / basisPolynomialDenominatorValue;
    let termDisplay = `${termCoefficient.toFixed(4)}`;
    if (basisPolynomialNumeratorString) {
      termDisplay += ` * ${basisPolynomialNumeratorString}`;
    } else if (n === 1) { // Should not happen with min 2 points, but defensive
       termDisplay = `${dataPoints[j].y.toFixed(4)}`;
    }


    polynomialTermsDisplay.push(termDisplay);
    lagrangeSum += term;
  }
  
  if (isNaN(lagrangeSum)) {
     return { interpolatedValue: null, polynomialTermsDisplay: [], error: "Calculation resulted in NaN. Check input values." };
  }

  return { interpolatedValue: lagrangeSum, polynomialTermsDisplay };
}
