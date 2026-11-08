import { Phone } from "lucide-react";

export const SOCIAL_LINKS = {
  facebook: "https://web.facebook.com/profile.php?id=61589377666659",
  instagram: "https://www.instagram.com/notrealengine_/",
  threads: "https://www.threads.com/@notrealengine_",
  linkedin: "https://www.linkedin.com/company/notrealengine/",
  whatsappUS: "https://wa.me/17543202216",
  whatsappBD: "https://wa.me/8801778307704",
  clientPortal: "https://clientportal.notrealengine.online",
  metaPortfolioId: "1133774685612149",
  metaQrAccess: "https://link.sendlink.co/qr/vRU3J3CYTp2l",
  metaProfile: "https://www.facebook.com/mericanbhaisazzad",
};

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`social-links-row ${className}`}>
      <a
        href={SOCIAL_LINKS.facebook}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="NOTREAL ENGINE on Facebook"
        className="social-icon-btn"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>

      <a
        href={SOCIAL_LINKS.instagram}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="NOTREAL ENGINE on Instagram"
        className="social-icon-btn"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </a>

      <a
        href={SOCIAL_LINKS.threads}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="NOTREAL ENGINE on Threads"
        className="social-icon-btn"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.186 24h-.007C5.46 23.978 0 18.57 0 11.968 0 5.38 5.446 0 12.158 0c6.49 0 11.666 4.957 11.835 11.365.176 6.673-4.665 11.332-11.458 11.332-1.393 0-2.766-.196-4.085-.584.237-.626.551-1.456.786-2.078 1.05.309 2.148.465 3.255.465 5.253 0 8.971-3.447 8.84-8.583-.122-4.78-4.02-8.498-9.178-8.498-5.32 0-9.658 4.23-9.658 9.55 0 5.303 4.28 9.537 9.546 9.556 1.402.006 2.754-.256 4.02-.78l.685 1.94c-1.498.627-3.11.944-4.756.935zm3.76-8.73c.48-1.52.73-3.17.73-4.87 0-2.45-.69-4.38-2.06-5.74-1.37-1.36-3.27-2.06-5.65-2.06-2.58 0-4.67.83-6.22 2.47C1.19 6.71.4 8.88.4 11.53c0 2.65.79 4.82 2.34 6.46 1.55 1.64 3.64 2.47 6.22 2.47 1.48 0 2.87-.29 4.12-.86l-.68-1.95c-.99.44-2.14.67-3.44.67-2.04 0-3.66-.63-4.83-1.89-1.16-1.26-1.75-2.95-1.75-5.02 0-2.07.59-3.76 1.75-5.02 1.17-1.26 2.79-1.89 4.83-1.89 1.84 0 3.28.52 4.29 1.55 1.01 1.03 1.52 2.5 1.52 4.37 0 1.34-.2 2.64-.6 3.86l1.64.65z" />
        </svg>
      </a>

      <a
        href={SOCIAL_LINKS.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="NOTREAL ENGINE on LinkedIn"
        className="social-icon-btn"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      </a>

      <a
        href={SOCIAL_LINKS.whatsappBD}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp NOTREAL ENGINE Direct"
        className="social-icon-btn whatsapp-highlight"
        title="WhatsApp Direct (+880 1778-307704)"
      >
        <Phone size={17} />
      </a>
    </div>
  );
}
