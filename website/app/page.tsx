import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { SemanticSearch } from "@/components/semantic-search";
import { TeamMemory } from "@/components/team-memory";
import { ELI5 } from "@/components/eli5";
import { HowItWorks } from "@/components/how-it-works";
import { DashboardShowcase } from "@/components/dashboard-showcase";
import { Installation } from "@/components/installation";
import { CTASection } from "@/components/cta-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <SemanticSearch />
      <TeamMemory />
      <ELI5 />
      <HowItWorks />
      <DashboardShowcase />
      <Installation />
      <CTASection />
      <Footer />
    </main>
  );
}
