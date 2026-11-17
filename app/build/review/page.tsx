import { redirect } from "next/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { ProjectBuilder } from "@/components/project-builder";

export default async function BuildReviewPage({
  searchParams
}: {
  searchParams: Promise<{ service?: string; draft?: string }>;
}) {
  const params = await searchParams;
  if (!params.draft && !params.service) {
    redirect("/build");
  }

  return (
    <MarketingShell>
      <ProjectBuilder
        initialServiceId={params.service}
        initialDraftToken={params.draft}
        initialStep={params.draft ? 6 : 1}
      />
    </MarketingShell>
  );
}
