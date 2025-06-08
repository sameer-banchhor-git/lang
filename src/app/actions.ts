
"use server";

import type { DataPoint } from "@/lib/schemas";

export interface CalculationStep {
  termIndex: number;
  yValue: number;
  basisNumeratorSymbolic: string;
  basisDenominatorSymbolic: string;
  basisDenominatorValue: number;
  basisPolynomialSymbolic: string;
  basisNumeratorAtXValues: string;
  basisNumeratorAtXProduct: number;
  basisPolynomialValueAtX: number;
  termSymbolic: string;
  termValueAtX: number;
}

interface LagrangeResult {
  interpolatedValue: number | null;
  polynomialTermsDisplay: string[];
  calculationSteps: CalculationStep[];
  plotData?: Array<{ x: number; original?: number; interpolated?: number; target?: number }>;
  error?: string;
  interpolationPoint?: number;
}

function evaluateLagrangePolynomialAtPoint(xEval: number, dataPoints: DataPoint[]): number {
  let sum = 0;
  const n = dataPoints.length;
  if (n === 0) return NaN; // Should not happen with validation

  for (let j = 0; j < n; j++) {
    let basisProduct = 1;
    if (n === 1) { // If only one point, L_0(x) = 1, P(x) = y_0
        basisProduct = 1;
    } else {
        for (let k = 0; k < n; k++) {
          if (j === k) continue;
          if (dataPoints[j].x - dataPoints[k].x === 0) return NaN; // Avoid division by zero, though schema should prevent duplicate x
          basisProduct *= (xEval - dataPoints[k].x) / (dataPoints[j].x - dataPoints[k].x);
        }
    }
    sum += dataPoints[j].y * basisProduct;
  }
  return sum;
}

export async function calculateLagrangeInterpolation(
  dataPoints: DataPoint[],
  interpolationX: number
): Promise<LagrangeResult> {
  if (dataPoints.length < 1) { // Allow 1 point for P(x)=y0
    return { interpolatedValue: null, polynomialTermsDisplay: [], calculationSteps:[], error: "At least one data point is required." };
  }

  const xValues = dataPoints.map(p => p.x);
  if (new Set(xValues).size !== xValues.length) {
    return { interpolatedValue: null, polynomialTermsDisplay: [], calculationSteps: [], error: "All X values in data points must be unique." };
  }

  let lagrangeSum = 0;
  const polynomialTermsDisplay: string[] = [];
  const calculationSteps: CalculationStep[] = [];
  const n = dataPoints.length;

  for (let j = 0; j < n; j++) {
    const currentStep: Partial<CalculationStep> = { termIndex: j, yValue: dataPoints[j].y };
    
    let basisNumeratorSym = "";
    let basisDenominatorSym = "";
    let basisDenominatorNum = 1;
    
    let basisNumeratorAtXEvalStrings: string[] = [];
    let basisNumeratorAtXProd = 1;

    if (n === 1) { // P(x) = y_0, so L_0(x) = 1
        basisNumeratorSym = "1";
        basisDenominatorSym = "1";
        basisDenominatorNum = 1;
        basisNumeratorAtXProd = 1;
        basisNumeratorAtXEvalStrings.push("1");
    } else {
        for (let k = 0; k < n; k++) {
          if (j === k) continue;
          basisNumeratorSym += `(x - ${dataPoints[k].x.toString()})`;
          basisDenominatorSym += `(${dataPoints[j].x.toString()} - ${dataPoints[k].x.toString()})`;
          basisDenominatorNum *= (dataPoints[j].x - dataPoints[k].x);
          
          basisNumeratorAtXEvalStrings.push(`(${interpolationX.toString()} - ${dataPoints[k].x.toString()})`);
          basisNumeratorAtXProd *= (interpolationX - dataPoints[k].x);
        }
    }
    
    currentStep.basisNumeratorSymbolic = basisNumeratorSym || "1";
    currentStep.basisDenominatorSymbolic = basisDenominatorSym || "1"; // Denominator isn't really symbolic in L_j(x) display typically
    
    if (basisDenominatorNum === 0) {
        return { interpolatedValue: null, polynomialTermsDisplay: [], calculationSteps: [], error: "Division by zero in basis polynomial. X values might be too close or identical." };
    }
    currentStep.basisDenominatorValue = basisDenominatorNum;
    
    currentStep.basisPolynomialSymbolic = `(${currentStep.basisNumeratorSymbolic}) / ${currentStep.basisDenominatorValue.toFixed(6)}`;
    
    currentStep.basisNumeratorAtXValues = basisNumeratorAtXEvalStrings.join('*') || "1";
    currentStep.basisNumeratorAtXProduct = basisNumeratorAtXProd;
    currentStep.basisPolynomialValueAtX = basisNumeratorAtXProd / basisDenominatorNum;

    const termCoefficientForDisplay = dataPoints[j].y / (n === 1 ? 1 : basisDenominatorNum);
    let singleTermDisplay = `${dataPoints[j].y.toFixed(4)}`;
    if (n > 1) { // Only add multiplier if more than one point
        if (basisDenominatorNum !== 1 || basisNumeratorSym !== "1") { // avoid " * 1 / 1"
             singleTermDisplay = `${termCoefficientForDisplay.toFixed(4)}`;
             if (basisNumeratorSym && basisNumeratorSym !== "1") {
                singleTermDisplay += ` * ${basisNumeratorSym}`;
             }
        }
    }
    polynomialTermsDisplay.push(singleTermDisplay);
    
    currentStep.termSymbolic = `${dataPoints[j].y.toFixed(4)} * ${currentStep.basisPolynomialSymbolic}`;
    if (n === 1) currentStep.termSymbolic = `${dataPoints[j].y.toFixed(4)}`; // For y_0

    currentStep.termValueAtX = dataPoints[j].y * currentStep.basisPolynomialValueAtX;
    
    calculationSteps.push(currentStep as CalculationStep);
    lagrangeSum += currentStep.termValueAtX;
  }
  
  if (isNaN(lagrangeSum)) {
     return { interpolatedValue: null, polynomialTermsDisplay: [], calculationSteps, error: "Calculation resulted in NaN. Check input values." };
  }

  const plotData: Array<{ x: number; original?: number; interpolated?: number; target?: number }> = [];
  if (dataPoints.length > 0) {
    const xS = dataPoints.map(p => p.x);
    const minX = Math.min(...xS);
    const maxX = Math.max(...xS);
    const range = maxX - minX;
    
    const plotPadding = range === 0 ? 1 : range * 0.2; // Ensure some padding for single point or narrow range
    const plotStart = minX - plotPadding;
    const plotEnd = maxX + plotPadding;
    const numPlotPoints = 100;

    for (let i = 0; i <= numPlotPoints; i++) {
      const currentX = plotStart + (i * (plotEnd - plotStart)) / numPlotPoints;
      const interpolatedVal = evaluateLagrangePolynomialAtPoint(currentX, dataPoints);
      if (!isNaN(interpolatedVal)) {
        plotData.push({ x: currentX, interpolated: interpolatedVal });
      }
    }

    dataPoints.forEach(dp => {
      const existingPoint = plotData.find(p => Math.abs(p.x - dp.x) < 1e-9); // Check for float equality
      if (existingPoint) {
        existingPoint.original = dp.y;
      } else {
        plotData.push({ x: dp.x, original: dp.y, interpolated: evaluateLagrangePolynomialAtPoint(dp.x, dataPoints) });
      }
    });
    
    // Ensure the specific interpolationX point is included for the curve and target highlighting
    const specificInterpolatedValue = evaluateLagrangePolynomialAtPoint(interpolationX, dataPoints);
    if(!isNaN(specificInterpolatedValue)) {
        const targetPointEntry = plotData.find(p => Math.abs(p.x - interpolationX) < 1e-9);
        if (targetPointEntry) {
            targetPointEntry.interpolated = specificInterpolatedValue; // Ensure curve passes through it
            targetPointEntry.target = lagrangeSum; // lagrangeSum is P(interpolationX)
        } else {
            plotData.push({ x: interpolationX, interpolated: specificInterpolatedValue, target: lagrangeSum });
        }
    }


    plotData.sort((a, b) => a.x - b.x);
  }

  return { interpolatedValue: lagrangeSum, polynomialTermsDisplay, calculationSteps, plotData, interpolationPoint: interpolationX };
}

    