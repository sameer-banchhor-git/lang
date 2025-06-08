
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LagrangeFormSchema, type LagrangeFormValues, type DataPoint } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlusCircle, MinusCircle, Calculator, Sigma, Target, AlertTriangle, ListChecks, FunctionSquare, Spline } from "lucide-react";
import { calculateLagrangeInterpolation, type CalculationStep } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, Scatter, ReferenceDot, Label as RechartsLabel, ReferenceLine } from "recharts";


export function LagrangeSolver() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    interpolatedValue: number | null;
    polynomialTermsDisplay: string[];
    calculationSteps: CalculationStep[];
    plotData?: Array<{ x: number; original?: number; interpolated?: number; target?: number }>;
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
        setResult(response);
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
  
  const chartConfig = {
      original: { label: "Original Data", color: "hsl(var(--primary))" },
      interpolated: { label: "Lagrange Polynomial", color: "hsl(var(--accent))" },
      target: { label: `Interpolated L(${result?.interpolationPoint})`, color: "hsl(var(--destructive))" },
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
            <CardDescription>Enter the known data points. At least one point is required. X values must be unique.</CardDescription>
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
                {fields.length > 1 && ( // Allow removing if more than 1 point, as schema min is 1.
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
            {form.formState.errors.dataPoints?.root?.message && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.dataPoints.root.message}</p>
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
          <div className="text-center p-4 text-muted-foreground">
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
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline">
                  <FunctionSquare className="h-6 w-6 text-primary" />
                  Results Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">Interpolated Value:</h3>
                  <p className="text-2xl">
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
                          {index < result.polynomialTermsDisplay.length - 1 ? " + " : ""}
                        </React.Fragment>
                      ))}
                    </code></pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {result.calculationSteps && result.calculationSteps.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline">
                    <Sigma className="h-6 w-6 text-primary" />
                    Step-by-Step Calculation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {result.calculationSteps.map((step, index) => (
                      <AccordionItem value={`item-${index}`} key={index}>
                        <AccordionTrigger>
                          Term {index + 1}: Contribution of y<sub>{step.termIndex}</sub> = {step.yValue.toFixed(4)}
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 text-sm p-4 bg-background rounded-md border">
                          <div>
                            <p><strong>Basis Polynomial L<sub>{step.termIndex}</sub>(x):</strong></p>
                            <p className="font-code break-all text-muted-foreground">L<sub>{step.termIndex}</sub>(x) = Product<sub>k≠{step.termIndex}</sub> (x - x<sub>k</sub>) / (x<sub>{step.termIndex}</sub> - x<sub>k</sub>)</p>
                            <p className="font-code break-all">L<sub>{step.termIndex}</sub>(x) = {step.basisNumeratorSymbolic || "1"} / ({step.basisDenominatorSymbolic || "1"})</p>
                            <p className="font-code break-all">= ({step.basisNumeratorSymbolic || "1"}) / {step.basisDenominatorValue.toFixed(6)}</p>
                            <p className="font-code break-all mt-1">Simplified L<sub>{step.termIndex}</sub>(x): {step.basisPolynomialSymbolic}</p>
                          </div>
                          
                          <div>
                            <p className="mt-2"><strong>Evaluating L<sub>{step.termIndex}</sub>(x) at x = {result.interpolationPoint?.toString()}:</strong></p>
                            <p className="font-code break-all">L<sub>{step.termIndex}</sub>({result.interpolationPoint?.toString()}) = ({step.basisNumeratorAtXValues || "1"}) / {step.basisDenominatorValue.toFixed(6)}</p>
                            <p className="font-code break-all">= {step.basisNumeratorAtXProduct.toFixed(6)} / {step.basisDenominatorValue.toFixed(6)} = <span className="font-semibold">{step.basisPolynomialValueAtX.toFixed(6)}</span></p>
                          </div>
                          
                          <div>
                            <p className="mt-2"><strong>Term Contribution: y<sub>{step.termIndex}</sub> * L<sub>{step.termIndex}</sub>({result.interpolationPoint?.toString()}):</strong></p>
                            <p className="font-code break-all">= {step.yValue.toFixed(4)} * {step.basisPolynomialValueAtX.toFixed(6)}</p>
                            <p className="font-code break-all">= <span className="font-semibold text-primary">{step.termValueAtX.toFixed(6)}</span></p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <div className="mt-6 p-4 bg-muted rounded-md">
                      <h3 className="font-semibold text-md">Sum of Term Contributions (Final Interpolated Value):</h3>
                      <p className="font-code break-all text-sm mt-1">
                        L({result.interpolationPoint?.toString()}) = {result.calculationSteps.map(s => s.termValueAtX.toFixed(6)).join(" + ")} = <span className="font-bold text-accent text-lg">{result.interpolatedValue?.toFixed(6)}</span>
                      </p>
                    </div>
                </CardContent>
              </Card>
            )}

            {result.plotData && result.plotData.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline">
                    <Spline className="h-6 w-6 text-primary" />
                    Interpolation Plot
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[450px] w-full pt-6">
                  <ChartContainer
                    config={chartConfig}
                    className="h-full w-full"
                  >
                    <RechartsLineChart 
                        data={result.plotData} 
                        margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="X" 
                        allowDuplicatedCategory={false} 
                        domain={['dataMin - 1', 'dataMax + 1']} 
                        tickFormatter={(tick) => typeof tick === 'number' ? tick.toFixed(2) : tick}
                        stroke="hsl(var(--muted-foreground))"
                        />
                      <YAxis 
                        type="number" 
                        name="Y" 
                        domain={['auto', 'auto']} 
                        tickFormatter={(tick) => typeof tick === 'number' ? tick.toFixed(2) : tick}
                        stroke="hsl(var(--muted-foreground))"
                        />
                      <RechartsTooltip
                        content={<ChartTooltipContent 
                                    hideLabel 
                                    formatter={(value, name, props) => {
                                        if (props.payload?.target !== undefined && name === 'target') return [`L(${props.payload.x.toFixed(2)}) = ${props.payload.target.toFixed(4)}`, null];
                                        if (name === 'original') return [value.toFixed(4), 'Original Point'];
                                        if (name === 'interpolated') return [value.toFixed(4), 'Polynomial P(x)'];
                                        return [value, name];
                                    }}
                                 />}
                        cursor={{ stroke: "hsl(var(--accent))", strokeDasharray: '3 3' }}
                        wrapperStyle={{ outline: 'none', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)'}}
                      />
                      <RechartsLegend content={<ChartLegendContent />} wrapperStyle={{paddingTop: '20px'}} />
                      <Line
                        type="monotone"
                        dataKey="interpolated"
                        stroke="var(--color-interpolated)"
                        strokeWidth={2.5}
                        dot={false}
                        name={chartConfig.interpolated.label}
                        animationDuration={500}
                      />
                      <Scatter
                        dataKey="original"
                        fill="var(--color-original)"
                        name={chartConfig.original.label}
                        shape="circle"
                        r={5}
                      />
                      {result.interpolationPoint !== undefined && result.interpolatedValue !== null && (
                        <ReferenceDot
                          x={result.interpolationPoint}
                          y={result.interpolatedValue}
                          r={7}
                          fill="var(--color-target)"
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                          ifOverflow="extendDomain"
                          isFront={true}
                        >
                           <RechartsLabel 
                             value={`L(${result.interpolationPoint.toFixed(2)}) = ${result.interpolatedValue.toFixed(4)}`} 
                             position="top" 
                             offset={10} 
                             fill="var(--color-target)" 
                             fontSize="0.8rem"
                             fontWeight="bold"
                            />
                        </ReferenceDot>
                      )}
                       {result.interpolationPoint !== undefined && result.interpolatedValue !== null && (
                         <>
                            <ReferenceLine x={result.interpolationPoint} stroke="var(--color-target)" strokeDasharray="4 4" strokeOpacity={0.7}>
                                <RechartsLabel value={`x=${result.interpolationPoint.toFixed(2)}`} position="insideTopRight" fill="var(--color-target)" fontSize="0.75rem"/>
                            </ReferenceLine>
                            <ReferenceLine y={result.interpolatedValue} stroke="var(--color-target)" strokeDasharray="4 4" strokeOpacity={0.7}>
                                 <RechartsLabel value={`y=${result.interpolatedValue.toFixed(2)}`} position="insideTopRight" fill="var(--color-target)" fontSize="0.75rem"/>
                            </ReferenceLine>
                         </>
                       )}
                    </RechartsLineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </form>
    </Form>
  );
}

    