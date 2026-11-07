import { SiteNav } from "@/components/home/SiteNav";
import { Community, Experience, FinalCta, Hero, HowItWorks } from "@/components/home/Sections";
import { HomeMotion } from "@/components/home/HomeMotion";
import { StageHost } from "@/components/three/StageHost";

export default function Home() {
  return (
    <>
      <StageHost />
      <SiteNav />
      <main id="main" className="story">
        <Hero />
        <Experience />
        <Community />
        <HowItWorks />
        <FinalCta />
      </main>
      <HomeMotion />
    </>
  );
}
