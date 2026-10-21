import BookingSection from "@/components/BookingSection";
import ChatBubble from "@/components/ChatLinks";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import { About, Policies, Prep } from "@/components/InfoSections";
import Nav from "@/components/Nav";
import { getSettings, getStyles } from "@/lib/db";
import { toPublicConfig, toPublicStyle } from "@/lib/publicConfig";

// Always show the latest styles, prices and hours from the app.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [settings, styles] = await Promise.all([getSettings(), getStyles()]);
  const config = toPublicConfig(settings);

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Prep config={config} />
        <Policies />
        <BookingSection styles={styles.map(toPublicStyle)} config={config} />
      </main>
      <Footer hours={settings.working_hours} />
      <ChatBubble />
    </>
  );
}
