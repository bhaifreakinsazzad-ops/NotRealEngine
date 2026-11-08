import { MarketingShell } from "@/components/marketing-shell";
import { ProjectBuilder } from "@/components/project-builder";

export default async function BuildPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const params = await searchParams;
  return <MarketingShell><ProjectBuilder initialServiceId={params.service} /></MarketingShell>;
}
