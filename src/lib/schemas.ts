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
    .min(2, "At least two data points are required.")
    .refine(points => {
      const xValues = points.map(p => parseFloat(p.x));
      // Check if all parsed xValues are numbers before creating Set
      if (xValues.some(isNaN)) return false; // Should be caught by individual point validation, but good fallback
      return new Set(xValues).size === xValues.length;
    }, {
      message: "All X values in data points must be unique.",
      path: ["dataPoints"], 
    }),
  interpolationX: z.string().refine(val => val.trim() !== '' && !isNaN(parseFloat(val)), {
    message: "Interpolation X must be a number.",
  }),
});

export type LagrangeFormValues = z.infer<typeof LagrangeFormSchema>;
export type DataPoint = { x: number; y: number };
