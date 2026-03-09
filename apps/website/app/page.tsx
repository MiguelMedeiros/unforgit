import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { SemanticSearch } from "@/components/semantic-search";
import { TeamMemory } from "@/components/team-memory";
import { ELI5 } from "@/components/eli5";
import { McpIntegrations } from "@/components/mcp-integrations";
import { HowItWorks } from "@/components/how-it-works";
import { DashboardShowcase } from "@/components/dashboard-showcase";
import { FAQ } from "@/components/faq";
import { CTASection } from "@/components/cta-section";
import { Footer } from "@/components/footer";
function Divider() {
  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="h-px bg-linear-to-r from-transparent via-dracula-comment/15 to-transparent" />
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Divider />
      <ELI5 />
      <Divider />
      <HowItWorks />
      <Divider />
      <SemanticSearch />
      <Divider />
      <TeamMemory />
      <Divider />
      <DashboardShowcase />
      <Divider />
      <McpIntegrations />
      <Divider />
      <FAQ />
      <CTASection />
      <Footer />
    </main>
  );
}
