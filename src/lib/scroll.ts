export function scrollToId(id: string) {
  const target = document.getElementById(id)
  if (!target) return
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
}
