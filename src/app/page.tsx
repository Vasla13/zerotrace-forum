import { ForumHome } from "@/components/forum-home";
import { SignalGate } from "@/components/signal-gate";

export default function Home() {
  return (
    <SignalGate>
      <ForumHome />
    </SignalGate>
  );
}
