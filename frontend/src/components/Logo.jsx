export default function Logo({ className = 'w-8 h-8', ...props }) {
  return (
    <img src="/brand/secheaders-monogram.svg" alt="SecHeaders" width="80" height="84" className={`brand-symbol ${className}`} draggable="false" {...props} />
  )
}
