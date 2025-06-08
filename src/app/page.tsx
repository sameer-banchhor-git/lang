import { LagrangeSolver } from "@/components/lagrange-solver";

export default function Home() {
  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold font-headline text-primary">
            Lagrange Leap
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            A Simple Lagrange Interpolation Solver
          </p>
        </header>
        <LagrangeSolver />
         <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Lagrange Leap. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
