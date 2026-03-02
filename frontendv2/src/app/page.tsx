import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="px-6 h-16 flex items-center border-b">
        <Link className="flex items-center gap-2 font-semibold" href="/">
          <Activity className="h-6 w-6 text-primary" />
          <span className="text-xl tracking-tight">BharatAI</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 bg-dot-black/[0.2] dark:bg-dot-white/[0.2]">
        <div className="max-w-3xl space-y-8">
          <Badge variant="secondary" className="px-3 py-1 text-sm rounded-full">
            Hackathon MVP
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            AI-Powered Post-Discharge{" "}
            <span className="text-primary">Wound Monitoring</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Track surgical wound healing with AI vision, detect complications
            early, and instantly connect with patients through our intelligent
            voice agent.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button size="lg" asChild className="h-12 px-8 text-base">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-12 px-8 text-base"
            >
              <a
                href="https://github.com/ArshCypherZ/wound-monitoring"
                target="_blank"
                rel="noreferrer"
              >
                View GitHub
              </a>
            </Button>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        <p>Built for the AWS AI for Bharat Hackathon.</p>
      </footer>
    </div>
  );
}

// Inline badge component for the hero section (to save importing if not used heavily)
function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary";
}) {
  return (
    <div
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
        variant === "default"
          ? "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80"
          : "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
      } ${className}`}
      {...props}
    />
  );
}
