import { MarketingShell } from "@/components/marketing-shell";
import { ProjectBuilder } from "@/components/project-builder";

export default async function BuildPage({
  searchParams
}: {
  searchParams: Promise<{ service?: string; draft?: string; step?: string }>;
}) {
  const params = await searchParams;
  const parsedStep = params.step ? Number(params.step) : 1;

  return (
    <MarketingShell>
      <ProjectBuilder
        initialServiceId={params.service}
        initialDraftToken={params.draft}
        initialStep={Number.isFinite(parsedStep) ? parsedStep : 1}
      />
    </MarketingShell>
  );
}
