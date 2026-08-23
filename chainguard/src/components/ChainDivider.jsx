export default function ChainDivider() {
  return (
    <div className="chain-divider py-10" aria-hidden="true">
      <span className="chain-line" />
      <span className="chain-link" />
      <span className="chain-link" style={{ opacity: 0.6 }} />
      <span className="chain-link" style={{ opacity: 0.35 }} />
      <span className="chain-line" />
    </div>
  );
}
