export default function Logo({ className = 'w-8 h-8', ...props }) {
  return (
    <img
      src="/SecHeaders.png"
      alt="SecHeaders"
      className={className}
      {...props}
    />
  )
}
