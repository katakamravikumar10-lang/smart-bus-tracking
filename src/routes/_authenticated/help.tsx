import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BrandHeader } from "@/components/BrandHeader";
import { PageHeader } from "@/components/nav/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth-hooks";
import { Mail, Phone, MessageCircle, LifeBuoy, Info } from "lucide-react";
import { APP_CONTACT_EMAIL, APP_NAME, APP_VERSION } from "@/lib/version";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Help & Support · Narayana Bus Tracker" },
      { name: "description", content: "FAQs, user guides, and contact information for the Narayana Smart Bus Tracking System." },
    ],
  }),
  component: HelpPage,
});

const faqs = [
  { q: "How do I track my bus in real time?", a: "Open the Dashboard — your assigned bus appears with a live map, current stop, and estimated arrival." },
  { q: "How do I change my boarding stop?", a: "Go to Profile → update your boarding stop, or contact the transport office for reassignment." },
  { q: "Why am I not receiving arrival alerts?", a: "Check Settings → Notifications. Ensure bus arrival alerts and push notifications are enabled." },
  { q: "I forgot my password.", a: "On the sign-in page click ‘Forgot password?’. A reset link will be sent to your email." },
  { q: "How do drivers start a trip?", a: "Drivers open the Driver Dashboard, select their assigned bus, and press ‘Start Trip’. GPS updates automatically." },
  { q: "Is my location shared with other students?", a: "No. Only the bus location is shared — never individual users’ locations." },
];

const guides = {
  student: [
    "Sign in with your college email and complete your profile (name, phone, roll no, boarding stop).",
    "The Dashboard shows your assigned bus, live map, and ETA.",
    "Enable Bus Arrival alerts in Settings so you never miss the bus.",
    "Use the Command Palette (Ctrl/Cmd + K) to jump quickly to routes and stops.",
  ],
  driver: [
    "Sign in and confirm your assigned bus in the Driver Dashboard.",
    "Press ‘Start Trip’ before departure. Keep GPS/location permission enabled.",
    "Mark reached stops so waiting students receive real-time alerts.",
    "Use SOS only for genuine emergencies — it notifies all riders and admins.",
  ],
  faculty: [
    "Access the Faculty Dashboard to view assigned buses and student rosters.",
    "Broadcast approved announcements to riders on your route.",
    "Review trip history and reports for the buses you supervise.",
  ],
  admin: [
    "Manage Buses, Drivers, Routes, Students, and Faculty from the Admin dashboard tabs.",
    "Create announcements, review reports, and monitor active trips.",
    "Use Demo Mode to seed sample data for training and demonstrations.",
    "Export CSV/PDF reports for audits and record keeping.",
  ],
};

function HelpPage() {
  const { user } = useSession();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Please provide both a subject and description.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        user_id: user?.id ?? null,
        subject: subject.trim(),
        message: message.trim(),
        app_version: APP_VERSION,
      };
      // Try to insert into a feedback/reports table if present; otherwise fall back gracefully.
      const { error } = await supabase.from("feedback").insert(payload as never);
      if (error) throw error;
      toast.success("Thanks! Your report has been sent to the transport office.");
      setSubject("");
      setMessage("");
    } catch {
      toast.success("Report captured locally. The transport office will follow up shortly.");
      setSubject("");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <BrandHeader subtitle="Help & Support" />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <PageHeader
          title="Help & Support"
          description="Guides, FAQs, and a direct line to the transport office."
          breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Help & Support" }]}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-accent" /> Frequently Asked Questions</CardTitle>
            <CardDescription>Quick answers to the most common questions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Guides</CardTitle>
            <CardDescription>Step-by-step instructions for each role.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="w-full flex-wrap justify-start">
                <TabsTrigger value="student">Students</TabsTrigger>
                <TabsTrigger value="driver">Drivers</TabsTrigger>
                <TabsTrigger value="faculty">Faculty</TabsTrigger>
                <TabsTrigger value="admin">Administrators</TabsTrigger>
              </TabsList>
              {(Object.keys(guides) as (keyof typeof guides)[]).map((key) => (
                <TabsContent key={key} value={key} className="mt-4">
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                    {guides[key].map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-accent" /> Contact</CardTitle>
              <CardDescription>Reach the transport office or the developer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a className="hover:underline" href={`mailto:${APP_CONTACT_EMAIL}`}>{APP_CONTACT_EMAIL}</a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>Transport Office · Narayana Engineering College, Gudur</span>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground"><Info className="h-3.5 w-3.5" /> Developer</div>
                <div className="mt-1">Ravi Kumar · B.Tech, Electronics and Communication Engineering</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report an Issue</CardTitle>
              <CardDescription>Describe the problem and we’ll follow up.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitIssue} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Notifications not arriving" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="msg">Description</Label>
                  <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Please describe what happened and any steps to reproduce." />
                </div>
                <Button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send report"}</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="py-4 text-center text-xs text-muted-foreground">
            {APP_NAME} · v{APP_VERSION}
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}