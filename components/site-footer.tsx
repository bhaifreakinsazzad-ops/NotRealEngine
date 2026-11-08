import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <span>© {new Date().getFullYear()} NOTREAL ENGINE, LLC · ENGINE//OS</span>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/privacy">Privacy draft</Link><Link href="/terms">Terms draft</Link><Link href="/refund-policy">Refund policy draft</Link><Link href="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
