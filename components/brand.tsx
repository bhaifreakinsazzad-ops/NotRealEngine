export function Brand({ operations = false }: { operations?: boolean }) {
  return (
    <div className="brand" aria-label="NOTREAL ENGINE ENGINE OS">
      <span className="brand-mark" aria-hidden="true"><i /><i /></span>
      <span>NOTREAL ENGINE</span>
      <span className="brand-product">ENGINE<span className="cyan">{"//"}</span>OS{operations ? " · OPS" : ""}</span>
    </div>
  );
}
