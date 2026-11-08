import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { categories, services } from "@/lib/catalog";

export default function ServicesPage() {
  return <MarketingShell><section className="page-hero"><div className="shell"><h1>Digital services, organized around business outcomes.</h1><p>ENGINE//OS keeps twelve distinct offers inside a controlled ten-category registry. Automation and integrations remain project capabilities—not invented standalone services.</p></div></section><section className="section"><div className="shell service-groups">{categories.map((category, index) => <div className="service-group" key={category.id}><div className="service-category"><span>CATEGORY {String(index + 1).padStart(2, "0")}</span><h3>{category.name}</h3></div><div className="service-list">{services.filter((service) => service.categoryId === category.id).map((service) => <Link className="service-link" href={`/services/${service.slug}`} key={service.id}><span className="service-number">{service.id.slice(4,6)}</span><div><h4>{service.name}</h4><p>{service.summary}</p></div><ArrowRight size={18} /></Link>)}</div></div>)}</div></section></MarketingShell>;
}
