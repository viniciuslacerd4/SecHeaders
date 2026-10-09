import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'

export default function SecurityEmblem() {
  const reducedMotion = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const rotateX = useSpring(pointerY, { stiffness: 130, damping: 22 })
  const rotateY = useSpring(pointerX, { stiffness: 130, damping: 22 })

  function move(event) {
    if (reducedMotion || event.pointerType !== 'mouse') return
    const bounds = event.currentTarget.getBoundingClientRect()
    pointerX.set(((event.clientX - bounds.left) / bounds.width - .5) * 8)
    pointerY.set(((event.clientY - bounds.top) / bounds.height - .5) * -6)
  }

  function reset() { pointerX.set(0); pointerY.set(0) }

  return (
    <div className="emblem-stage" aria-hidden="true" onPointerMove={move} onPointerLeave={reset}>
      <div className="emblem-halo" />
      <div className="emblem-orbit emblem-orbit-outer"><span /></div>
      <div className="emblem-orbit emblem-orbit-inner"><span /></div>
      <span className="emblem-coordinate emblem-coordinate-one">+</span>
      <span className="emblem-coordinate emblem-coordinate-two">+</span>
      <motion.div className="emblem-tilt" style={{ rotateX, rotateY }}>
        <div className="emblem-float">
          <img src="/brand/secheaders-monogram.svg" alt="" width="80" height="84" className="emblem-image" fetchPriority="high" draggable="false" />
        </div>
      </motion.div>
      <div className="emblem-ground" />
    </div>
  )
}
