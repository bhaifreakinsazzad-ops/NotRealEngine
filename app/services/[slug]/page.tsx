import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { serviceBySlug, services } from "@/lib/catalog";

export function generateStaticParams() { return services.map((service) => ({ slug: service.slug })); }

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const service = serviceBySlug(slug); if (!service) notFound();
  return <MarketingShell><section className="page-hero"><div className="shell"><span className="mono cyan">{service.id}</span><h1>{service.name}</h1><p>{service.summary}</p></div></section><section className="section"><div className="shell detail-grid"><div><div className="section-code">INCLUDED FOUNDATION</div><h2>What this service establishes</h2><div className="list-rail">{service.included.map((item) => <div className="list-row" key={item}><CheckCircle2 size={18} /><span>{item}</span></div>)}</div><div className="section-code" style={{ marginTop: "3rem" }}>OPTIONAL CAPABILITIES</div><h2>Scoped after requirements review</h2><div className="list-rail">{service.addons.map((item) => <div className="list-row" key={item.id}><CheckCircle2 size={18} /><span>{item.label}</span></div>)}</div></div><aside className="aside-panel"><h2>Configure this project</h2><p>Shape a structured brief before registration. Pricing remains quote-only until a package and price version pass commercial approval.</p><Link className="btn btn-primary" href={`/build?service=${service.id}`}>Start configuration</Link><p className="mono" style={{ fontSize: ".7rem", marginTop: "1.2rem" }}>SALES MODE · QUOTE REQUIRED</p></aside></div></section></MarketingShell>;
}
