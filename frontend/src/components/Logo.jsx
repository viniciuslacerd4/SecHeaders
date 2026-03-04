/**
 * Logo.jsx — Logo SVG inline do SecHeaders.
 *
 * Escudo gordinho 1:1 com colchetes angulares </>.
 * Aceita className para controle de tamanho externo.
 */
export default function Logo({ className = 'w-8 h-8', ...props }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="ig" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4338ca" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cg" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#c7d2fe" />
        </linearGradient>
      </defs>

      {/* Shield — wider/chubbier */}
      <path
        d="M256 32C296 52 356 72 432 72c10 0 18 8 18 18v170c0 112-80 180-188 220-4 2-8 2-12 0C142 440 62 372 62 260V90c0-10 8-18 18-18 76 0 136-20 176-40Z"
        fill="url(#sg)"
      />
      <path
        d="M256 56C292 74 346 90 420 90c6 0 10 4 10 10v156c0 102-74 166-172 204-2 1-4 1-4 0-98-38-172-102-172-204V100c0-6 4-10 10-10 74 0 128-16 164-34Z"
        fill="url(#ig)"
      />
      <path
        d="M256 32C296 52 356 72 432 72c10 0 18 8 18 18v170c0 112-80 180-188 220-4 2-8 2-12 0C142 440 62 372 62 260V90c0-10 8-18 18-18 76 0 136-20 176-40Z"
        fill="none"
        stroke="#a5b4fc"
        strokeWidth="2"
        strokeOpacity="0.3"
      />

      {/* < */}
      <path
        d="M194 200L128 260l66 60"
        fill="none"
        stroke="url(#cg)"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* / */}
      <path
        d="M280 180L232 340"
        fill="none"
        stroke="#e0e7ff"
        strokeWidth="20"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
      {/* > */}
      <path
        d="M318 200l66 60-66 60"
        fill="none"
        stroke="url(#cg)"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
