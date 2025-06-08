"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LagrangeFormSchema, type LagrangeFormValues, type DataPoint } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlusCircle, MinusCircle, Calculator, Sigma, Target, AlertTriangle, ListChecks, CheckSquare, FunctionSquare } from "lucide-react";
import { calculateLagrangeInterpolation } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

export function LagrangeSolver() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    interpolatedValue: number | null;
    polynomialTermsDisplay: string[];
    interpolationPoint?: number;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<LagrangeFormValues>({
    resolver: zodResolver(LagrangeFormSchema),
    defaultValues: {
      dataPoints: [{ x: "", y: "" }, { x: "", y: "" }],
      interpolationX: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "dataPoints",
  });

  const onSubmit = async (values: LagrangeFormValues) => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    const numericDataPoints: DataPoint[] = values.dataPoints.map(dp => ({
      x: parseFloat(dp.x),
      y: parseFloat(dp.y),
    }));
    const numericInterpolationX = parseFloat(values.interpolationX);

    try {
      const response = await calculateLagrangeInterpolation(numericDataPoints, numericInterpolationX);
      if (response.error) {
        setError(response.error);
        toast({
          title: "Calculation Error",
          description: response.error,
          variant: "destructive",
        });
      } else {
        setResult({ ...response, interpolationPoint: numericInterpolationX });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(errorMessage);
      toast({
        title: "Unhandled Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <ListChecks className="h-6 w-6 text-primary" />
              Data Points (x, y)
            </CardTitle>
            <CardDescription>Enter the known data points for interpolation. At least two points are required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-4">
                <FormField
                  control={form.control}
                  name={`dataPoints.${index}.x`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>X<sub>{index}</sub></FormLabel>
                      <FormControl>
                        <Input type="text" placeholder={`X value for point ${index + 1}`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`dataPoints.${index}.y`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Y<sub>{index}</sub></FormLabel>
                      <FormControl>
                        <Input type="text" placeholder={`Y value for point ${index + 1}`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {fields.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="mt-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label="Remove point"
                  >
                    <MinusCircle className="h-5 w-5" />
                  </Button>
                )}
              </div>
            ))}
             {form.formState.errors.dataPoints && typeof form.formState.errors.dataPoints.message === 'string' && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.dataPoints.message}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ x: "", y: "" })}
              className="text-primary border-primary hover:bg-primary/10 hover:text-primary"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Point
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Target className="h-6 w-6 text-primary" />
              Interpolation Point (X)
            </CardTitle>
            <CardDescription>Specify the X value at which to estimate the function.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="interpolationX"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>X value for interpolation</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Enter X value" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isLoading}>
          <Calculator className="mr-2 h-4 w-4" />
          {isLoading ? "Calculating..." : "Calculate Interpolated Value"}
        </Button>

        {isLoading && (
          <div className="text-center p-4">
            <p>Calculating, please wait...</p>
          </div>
        )}

        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && !isLoading && !error && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <FunctionSquare className="h-6 w-6 text-primary" />
                Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">Interpolated Value:</h3>
                <p className="text-lg">
                  L({result.interpolationPoint?.toString()}) = <span className="font-bold text-accent">{result.interpolatedValue?.toFixed(6)}</span>
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Lagrange Polynomial L(x):</h3>
                <p className="text-sm text-muted-foreground">
                  The polynomial is formed by summing these terms:
                </p>
                <div className="mt-2 p-3 bg-muted rounded-md overflow-x-auto">
                  <pre className="text-sm"><code className="font-code">
                    {result.polynomialTermsDisplay.map((term, index) => (
                      <React.Fragment key={index}>
                        {term}
                        {index < result.polynomialTermsDisplay.length - 1 ? "\n+ " : ""}
                      </React.Fragment>
                    ))}
                  </code></pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </Form>
  );
}
