import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'

export default function SecurityEmblem() {
  const reducedMotion = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const rotateX = useSpring(pointerY, { stiffness: 130, damping: 22 })
  const rotateY = useSpring(pointerX, { stiffness: 130, damping: 22 })

  function move(event) {
    if (reducedMotion || event.pointerType !== 'mouse' || event.currentTarget.closest('.motion-paused')) return
    const bounds = event.currentTarget.getBoundingClientRect()
    pointerX.set(((event.clientX - bounds.left) / bounds.width - .5) * 14)
    pointerY.set(((event.clientY - bounds.top) / bounds.height - .5) * -10)
  }

  function reset() { pointerX.set(0); pointerY.set(0) }

  return (
    <div className="emblem-stage packet-stage" aria-hidden="true" onPointerMove={move} onPointerLeave={reset}>
      <div className="packet-light" />
      <svg className="packet-blueprint" viewBox="0 0 390 330" fill="none">
        <path d="M39 244L178 317L352 214L214 141Z" />
        <path d="M54 268L178 333M31 230L31 250L48 260M335 204L354 214L354 236" />
        <path className="packet-connector" d="M58 88H96L126 118M318 78V122L291 144" />
        <rect x="53" y="83" width="7" height="7" /><rect x="314" y="69" width="7" height="7" />
      </svg>
      <motion.div className="packet-parallax" style={{ rotateX, rotateY }}>
        <div className="packet-float">
          <div className="packet-stack">
            <div className="packet-panel packet-base">
              <div className="packet-grid" />
              <span className="packet-corner packet-corner-one" /><span className="packet-corner packet-corner-two" />
            </div>
            <div className="packet-panel packet-data">
              <div className="packet-data-label">HTTP / HEADERS</div>
              <div className="packet-data-lines"><i /><i /><i /><i /><i /></div>
              <div className="packet-data-nodes"><i /><i /><i /><i /></div>
            </div>
            <div className="packet-panel packet-face">
              <div className="packet-face-top"><span>SH</span><span className="packet-face-notch" /></div>
              <img src="/brand/secheaders-monogram.svg" alt="" width="80" height="80" className="packet-mark" fetchPriority="high" draggable="false" />
              <div className="packet-signature"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
              <div className="packet-scan-window"><div className="packet-scan" /></div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
