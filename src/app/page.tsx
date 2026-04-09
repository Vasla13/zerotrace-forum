import { ForumHome } from "@/components/forum-home";
import { SignalGate } from "@/components/signal-gate";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <SignalGate>
      <ForumHome />
    </SignalGate>
  );
}
