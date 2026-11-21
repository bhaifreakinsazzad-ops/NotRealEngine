import Image from "next/image";

export function Brand({ operations = false }: { operations?: boolean }) {
  return (
    <div className="brand" aria-label="NotRealEngine NRE OFFICE">
      <div className="brand-logo-wrap">
        <Image
          src="https://assets.cdn.filesafe.space/1iUkTwVsmyz7T0PnMiFY/media/6a05c84eab5d7da865927829.png"
          alt="NotRealEngine Official Logo"
          width={36}
          height={36}
          className="brand-logo-img"
          referrerPolicy="no-referrer"
          priority
        />
      </div>
      <span className="brand-name">NOTREAL ENGINE</span>
      <span className="brand-product">
        NRE OFFICE{operations ? " · ADMIN" : ""}
      </span>
    </div>
  );
}
