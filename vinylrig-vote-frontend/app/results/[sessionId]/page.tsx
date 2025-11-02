import { ResultsPageClient } from "@/components/ResultsPageClient";

// Generate static params for all possible sessionIds (0-19)
export async function generateStaticParams() {
  return Array.from({ length: 20 }, (_, i) => ({
    sessionId: i.toString(),
  }));
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId: sessionIdStr } = await params;
  const sessionId = parseInt(sessionIdStr, 10);

  if (isNaN(sessionId) || sessionId < 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-heading font-bold mb-4">Invalid Session ID</h2>
          <p className="text-muted-foreground">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  return <ResultsPageClient sessionId={sessionId} />;
}

