// Tampil seketika saat pindah halaman, sambil data dimuat
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Memuat">
      <div className="h-9 w-40 rounded-lg bg-line" />
      <div className="h-28 rounded-[18px] bg-white ring-1 ring-line" />
      <div className="space-y-px overflow-hidden rounded-[18px] ring-1 ring-line">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 bg-white" />)}
      </div>
    </div>
  )
}
