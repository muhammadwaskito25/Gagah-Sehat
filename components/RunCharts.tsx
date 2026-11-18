'use client'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtClock } from '@/lib/format'

export type WeekPoint = { week: string; km: number }
export type PacePoint = { date: string; pace: number }

const tip = { background: '#11141B', border: '1px solid #202637', borderRadius: 12, fontSize: 13, color: '#fff' }
const tick = { fill: '#64748B', fontSize: 11 }

export default function RunCharts({ weeks, paces }: { weeks: WeekPoint[]; paces: PacePoint[] }) {
  return (
    <div className="space-y-3">
      <section className="card px-0 pb-2">
        <h3 className="px-4 font-display text-lg font-bold uppercase tracking-wide text-white">Jarak per minggu</h3>
        <p className="px-4 text-xs font-medium text-slate-400">12 minggu terakhir</p>
        <div className="mt-3 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 4, right: 16, left: 16, bottom: 0 }}>
              <CartesianGrid stroke="#1F2537" vertical={false} />
              <XAxis dataKey="week" tick={tick} tickLine={false} axisLine={false} interval={2} />
              <YAxis hide />
              <Tooltip contentStyle={tip} cursor={{ fill: '#171B26' }} formatter={(v) => [`${Number(v).toFixed(1)} km`, 'Jarak']} />
              <Bar dataKey="km" fill="#00B4D8" radius={[5, 5, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      {paces.length > 1 && (
        <section className="card px-0 pb-2">
          <h3 className="px-4 font-display text-lg font-bold uppercase tracking-wide text-white">Tren pace</h3>
          <p className="px-4 text-xs font-medium text-slate-400">Garis naik berarti makin cepat</p>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={paces} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1F2537" vertical={false} />
                <XAxis dataKey="date" tick={tick} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis tick={tick} tickLine={false} axisLine={false} reversed domain={['auto', 'auto']} width={44} tickFormatter={(v) => fmtClock(Number(v))} />
                <Tooltip contentStyle={tip} formatter={(v) => [`${fmtClock(Number(v))} /km`, 'Pace']} />
                <Line type="monotone" dataKey="pace" stroke="#FF5500" strokeWidth={2.5} dot={{ r: 3, fill: '#FF5500', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  )
}
