import { MarketingShell } from "@/components/marketing-shell";
import { ProjectBuilder } from "@/components/project-builder";

export default async function BuildPage({
  searchParams,
}: {
  searchParams: Promise<{
    service?: string;
    draft?: string;
    step?: string;
    goal?: string;
    problem?: string;
  }>;
}) {
  const params = await searchParams;
  const parsedStep = params.step ? Number(params.step) : 1;

  return (
    <MarketingShell>
      <ProjectBuilder
        initialServiceId={params.service}
        initialDraftToken={params.draft}
        initialStep={Number.isFinite(parsedStep) ? Math.min(6, Math.max(1, parsedStep)) : 1}
        initialGoal={params.goal}
        initialProblem={params.problem}
      />
    </MarketingShell>
  );
}
