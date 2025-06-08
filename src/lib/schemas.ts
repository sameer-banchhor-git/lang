
import { z } from "zod";

const DataPointSchema = z.object({
  x: z.string().refine(val => val.trim() !== '' && !isNaN(parseFloat(val)), {
    message: "X must be a number.",
  }),
  y: z.string().refine(val => val.trim() !== '' && !isNaN(parseFloat(val)), {
    message: "Y must be a number.",
  }),
});

export const LagrangeFormSchema = z.object({
  dataPoints: z.array(DataPointSchema)
    .min(1, "At least one data point is required.") // Changed from 2 to 1 to allow single point (constant polynomial)
    .refine(points => {
      if (points.length <= 1) return true; // No need to check for uniqueness if 0 or 1 point
      const xValues = points.map(p => {
        const numX = parseFloat(p.x);
        return isNaN(numX) ? NaN : numX; // Ensure parsing before Set
      });
      if (xValues.some(isNaN)) return false; 
      return new Set(xValues).size === xValues.length;
    }, {
      message: "All X values in data points must be unique.",
      path: ["root"], // Apply error to the root of dataPoints array for better display
    }),
  interpolationX: z.string().refine(val => val.trim() !== '' && !isNaN(parseFloat(val)), {
    message: "Interpolation X must be a number.",
  }),
});

export type LagrangeFormValues = z.infer<typeof LagrangeFormSchema>;
export type DataPoint = { x: number; y: number };

    