import Image from "next/image";

export function Brand({ operations = false }: { operations?: boolean }) {
  return (
    <div className="brand" aria-label="NOTREAL ENGINE ENGINE OS">
      <div className="brand-logo-wrap">
        <Image
          src="https://assets.cdn.filesafe.space/1iUkTwVsmyz7T0PnMiFY/media/6a05c84eab5d7da865927829.png"
          alt="NOTREAL ENGINE Logo"
          width={36}
          height={36}
          className="brand-logo-img"
          priority
        />
      </div>
      <span className="brand-name">NOTREAL ENGINE</span>
      <span className="brand-product">
        ENGINE<span className="cyan">{"//"}</span>OS{operations ? " · OPS" : ""}
      </span>
    </div>
  );
}
