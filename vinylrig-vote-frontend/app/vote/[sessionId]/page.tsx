import { use } from "react";
import { VotePageClient } from "@/components/VotePageClient";

export default function VotePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = use(params);
  const sessionId = parseInt(resolvedParams.sessionId);
  
  return <VotePageClient sessionId={sessionId} />;
}

// Generate static params for common session IDs
export function generateStaticParams() {
  return Array.from({ length: 20 }, (_, i) => ({
    sessionId: i.toString(),
  }));
}

