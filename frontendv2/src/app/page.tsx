import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Accent line */}
      <div className="h-[2px] w-full bg-primary" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-sm font-semibold tracking-tight">
              BharatAI
            </span>
          </span>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            Open Dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pt-20 sm:pt-28 pb-20">
          <div className="max-w-3xl">
            <p className="text-xs font-medium text-primary tracking-widest uppercase mb-8">
              Wound Monitoring System
            </p>
            <h1 className="text-[2rem] leading-[1.1] sm:text-5xl md:text-6xl font-semibold tracking-tight text-foreground">
              After discharge, wound complications go undetected.
            </h1>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-2xl">
              BharatAI monitors surgical wounds with computer vision, reaches
              patients through voice AI in their language, and alerts clinicians
              when it matters.
            </p>
            <div className="mt-10 flex items-center gap-6">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 h-11 px-6 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://github.com/ArshCypherZ/wound-monitoring"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-px bg-border" />
        </div>

        {/* ── Impact Numbers ───────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-16 sm:gap-8">
            <div>
              <p className="text-6xl md:text-7xl font-semibold tracking-tighter font-mono">
                74<span className="text-muted-foreground">%</span>
              </p>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                of doctors in India are concentrated in urban areas, leaving
                rural patients without post-operative monitoring.
              </p>
            </div>
            <div>
              <p className="text-6xl md:text-7xl font-semibold tracking-tighter font-mono">
                40<span className="text-muted-foreground">%</span>
              </p>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                reduction in hospital readmissions with remote post-discharge
                wound monitoring.
              </p>
            </div>
            <div>
              <p className="text-6xl md:text-7xl font-semibold tracking-tighter font-mono">
                92<span className="text-muted-foreground">%</span>
              </p>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                fewer emergency room visits with AI-powered remote patient
                monitoring systems.
              </p>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-px bg-border" />
        </div>

        {/* ── Capabilities (Bento Grid) ────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-10">
            Capabilities
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Wound Analysis — large card, spans 2 cols */}
            <div className="md:col-span-2 border border-border rounded-lg p-8 hover:border-foreground/20 transition-colors">
              <p className="text-xs font-mono text-muted-foreground mb-6">
                01
              </p>
              <h3 className="text-lg font-semibold mb-2">
                AI Wound Assessment
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-10 max-w-lg">
                Two-layer pipeline: YOLOv8 detects and crops the wound region,
                then Claude provides structured clinical analysis with
                photographic wound assessment scoring.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-2xl font-semibold font-mono">
                    /10
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Healing Score
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-semibold font-mono">
                    /32
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PWAT Score
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-semibold font-mono">
                    5
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tissue Types
                  </p>
                </div>
              </div>
            </div>

            {/* Voice Agent — standard card */}
            <div className="border border-border rounded-lg p-8 flex flex-col hover:border-foreground/20 transition-colors">
              <p className="text-xs font-mono text-muted-foreground mb-6">
                02
              </p>
              <h3 className="text-lg font-semibold mb-2">Voice Agent</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Proactive outbound calls to patients in Hindi, Tamil, Telugu, and
                10+ Indian languages after each assessment.
              </p>
              <p className="mt-auto pt-8 text-lg text-muted-foreground/40 select-none">
                &ldquo;&#2310;&#2346;&#2325;&#2366; &#2328;&#2366;&#2357;
                &#2336;&#2368;&#2325; &#2361;&#2379; &#2352;&#2361;&#2366;
                &#2361;&#2376;&rdquo;
              </p>
            </div>

            {/* Timeline — standard card */}
            <div className="border border-border rounded-lg p-8 hover:border-foreground/20 transition-colors">
              <p className="text-xs font-mono text-muted-foreground mb-6">
                03
              </p>
              <h3 className="text-lg font-semibold mb-2">Healing Timeline</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                Track recovery across days and weeks with trend-aware analysis
                and historical comparison.
              </p>
              {/* Mini bar chart — CSS only */}
              <div className="flex items-end gap-[5px] h-10">
                {[20, 28, 35, 45, 52, 64, 75, 88, 100].map((h, i) => (
                  <div
                    key={i}
                    className={`w-[6px] rounded-sm ${i === 8 ? "bg-primary" : "bg-foreground"} transition-all`}
                    style={{
                      height: `${h}%`,
                      opacity: i === 8 ? 1 : 0.08 + i * 0.08,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Smart Escalation — large card, spans 2 cols */}
            <div className="md:col-span-2 border border-border rounded-lg p-8 hover:border-foreground/20 transition-colors">
              <p className="text-xs font-mono text-muted-foreground mb-6">
                04
              </p>
              <h3 className="text-lg font-semibold mb-2">Smart Escalation</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-10 max-w-lg">
                High-urgency assessments trigger instant SNS alerts to the
                clinical team. Complications surface immediately, not at the next
                appointment.
              </p>
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
                <p className="text-sm font-mono text-muted-foreground">
                  Real-time alerts via Amazon SNS
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-px bg-border" />
        </div>

        {/* ── Pipeline ─────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-10">
            How It Works
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-10">
            {[
              {
                step: "01",
                title: "Upload",
                desc: "Patient photographs the wound with any smartphone camera.",
              },
              {
                step: "02",
                title: "Detect",
                desc: "YOLOv8 identifies the wound region and crops it for analysis.",
              },
              {
                step: "03",
                title: "Assess",
                desc: "Claude evaluates healing with structured PWAT clinical scoring.",
              },
              {
                step: "04",
                title: "Monitor",
                desc: "Healing trends are tracked over days and weeks with history.",
              },
              {
                step: "05",
                title: "Alert",
                desc: "High-risk cases trigger SNS alerts and automated voice calls.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step}>
                <p className="text-xs font-mono text-primary mb-3">
                  {step}
                </p>
                <p className="text-sm font-semibold mb-1.5">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-px bg-border" />
        </div>

        {/* ── Built With ───────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-10">
            Built With
          </p>

          <div className="space-y-8">
            <div>
              <p className="text-xs text-muted-foreground mb-3">
                AWS Services
              </p>
              <div className="flex flex-wrap gap-2">
                {["Amazon Bedrock", "Amazon S3", "DynamoDB", "Amazon SNS"].map(
                  (tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center h-8 px-4 text-xs font-medium border border-border rounded-full text-foreground"
                    >
                      {tech}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-3">
                AI &amp; Infrastructure
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Claude Sonnet",
                  "YOLOv8",
                  "ElevenLabs",
                  "Next.js",
                  "FastAPI",
                  "Python",
                ].map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center h-8 px-4 text-xs font-medium border border-border rounded-full text-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <p className="text-sm font-semibold">BharatAI</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Built for the AWS AI for Bharat Hackathon
              </p>
            </div>
            <div className="flex items-center gap-8">
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <a
                href="https://github.com/ArshCypherZ/wound-monitoring"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
