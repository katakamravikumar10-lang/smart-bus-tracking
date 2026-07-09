import { createFileRoute } from "@tanstack/react-router";
import { BrandHeader } from "@/components/BrandHeader";
import { PageHeader } from "@/components/nav/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  APP_AUTHOR,
  APP_COPYRIGHT_YEAR,
  APP_DEPARTMENT,
  APP_GITHUB_URL,
  APP_INSTITUTION,
  APP_NAME,
  APP_VERSION,
} from "@/lib/version";
import { Bus, Github, Code2, Database, MapPin, Cpu } from "lucide-react";

export const Route = createFileRoute("/_authenticated/about")({
  head: () => ({
    meta: [
      { title: "About · Narayana Bus Tracker" },
      { name: "description", content: "About the Smart Bus Tracking System — a college transportation platform for Narayana Engineering College, Gudur." },
    ],
  }),
  component: AboutPage,
});

const tech = [
  { name: "React", icon: Code2, hint: "UI framework" },
  { name: "TypeScript", icon: Code2, hint: "Type-safe language" },
  { name: "Supabase", icon: Database, hint: "Auth · Database · Realtime" },
  { name: "Google Maps API", icon: MapPin, hint: "Live tracking" },
  { name: "TanStack Start", icon: Cpu, hint: "Full-stack routing" },
];

function AboutPage() {
  return (
    <div className="min-h-dvh bg-background">
      <BrandHeader subtitle="About" />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <PageHeader
          title="About the Application"
          description="A production-ready smart bus tracking platform for college transportation."
          breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "About" }]}
        />

        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Bus className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
                <CardDescription>Real-time bus tracking, arrival alerts, and route management.</CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">v{APP_VERSION}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            <p>
              The Smart Bus Tracking System helps students, faculty, drivers, and administrators
              coordinate campus transportation with live GPS tracking, arrival notifications,
              trip history, and route management — all in one professional dashboard.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Technologies Used</CardTitle>
              <CardDescription>Modern, reliable, production-grade stack.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {tech.map((t) => (
                <div key={t.name} className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                  <t.icon className="h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.hint}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Credits</CardTitle>
              <CardDescription>Developed as part of an academic project.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Developed By</div>
                <div className="font-medium text-foreground">{APP_AUTHOR}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Department</div>
                <div className="font-medium text-foreground">{APP_DEPARTMENT}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Institution</div>
                <div className="font-medium text-foreground">{APP_INSTITUTION}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Version</div>
                <div className="font-medium text-foreground">v{APP_VERSION}</div>
              </div>
              <div className="pt-2">
                <Button asChild variant="outline" size="sm">
                  <a href={APP_GITHUB_URL} target="_blank" rel="noreferrer">
                    <Github className="mr-2 h-4 w-4" /> GitHub Repository
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="py-4 text-center text-xs text-muted-foreground">
            © {APP_COPYRIGHT_YEAR} {APP_INSTITUTION}. All Rights Reserved.
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}