export default function AmbientBackground() {
  return (
    <div className="ambient-background" aria-hidden="true">
      <div className="ambient-grid" />
      <div className="ambient-light ambient-light-one" />
      <div className="ambient-light ambient-light-two" />
      <svg className="ambient-circuit" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMidYMin slice">
        <g className="circuit-lines">
          <path d="M1440 126H1160L1020 266H885L748 403H0" />
          <path d="M1440 205H1246L1102 349V586L946 742H722" />
          <path d="M1440 647H1270L1143 520H925L806 639H0" />
          <circle cx="1020" cy="266" r="4" /><circle cx="1102" cy="586" r="4" /><circle cx="925" cy="520" r="4" />
          <path d="M137 120v12m-6-6h12M1248 768v12m-6-6h12M773 94v12m-6-6h12" />
        </g>
        <path className="circuit-signal circuit-signal-one" d="M1440 126H1160L1020 266H885L748 403H0" />
        <path className="circuit-signal circuit-signal-two" d="M1440 647H1270L1143 520H925L806 639H0" />
      </svg>
      <span className="ambient-point ambient-point-one" />
      <span className="ambient-point ambient-point-two" />
    </div>
  )
}
