// Tampil seketika saat pindah halaman, sambil data dimuat
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Memuat">
      <div className="h-9 w-40 rounded-xl bg-[#171B26]" />
      <div className="h-32 rounded-[20px] bg-[#11141B] border border-[#202637]" />
      <div className="space-y-px overflow-hidden rounded-[20px] border border-[#202637] bg-[#11141B]">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 bg-[#171B26]/60 border-b border-[#202637]/50" />)}
      </div>
    </div>
  )
}
