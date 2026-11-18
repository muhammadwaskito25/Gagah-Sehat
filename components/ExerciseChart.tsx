'use client'
import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type ExPoint = { date: string } & Record<string, number | string>
export type Metric = { key: string; label: string; unit: string }

const STRENGTH: Metric[] = [
  { key: 'e1rm', label: 'Est. 1RM', unit: 'kg' },
  { key: 'maxWeight', label: 'Beban', unit: 'kg' },
  { key: 'volume', label: 'Volume', unit: 'kg' },
  { key: 'bestReps', label: 'Reps', unit: '' },
]

export default function ExerciseChart({ data, metrics = STRENGTH }: { data: ExPoint[]; metrics?: Metric[] }) {
  const METRICS = metrics
  const [metric, setMetric] = useState(metrics[0].key)
  const m = METRICS.find((x) => x.key === metric) ?? METRICS[0]
  const last = Number(data[data.length - 1]?.[metric] ?? 0)
  const first = Number(data[0]?.[metric] ?? 0)
  const diff = first ? ((last - first) / first) * 100 : 0

  return (
    <section className="card px-0 pb-2">
      <div className="px-4">
        <div className="grid gap-1 rounded-xl border border-[#202637] bg-[#0A0C11] p-1" style={{ gridTemplateColumns: `repeat(${METRICS.length}, minmax(0, 1fr))` }}>
          {METRICS.map((x) => (
            <button
              key={x.key}
              onClick={() => setMetric(x.key)}
              className={`rounded-lg py-1.5 text-[12px] font-bold tracking-wide transition ${
                metric === x.key ? 'bg-[#FF5500] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="num text-[40px] font-black leading-none text-white">{Math.round(last * 10) / 10}</span>
          <span className="text-sm font-bold text-slate-400">{m.unit}</span>
          {data.length > 1 && (
            <span className={`ml-auto text-sm font-bold ${diff >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 16, left: 16, bottom: 0 }}>
            <defs>
              <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF5500" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#FF5500" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1F2537" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#11141B', border: '1px solid #202637', borderRadius: 12, fontSize: 13, color: '#fff' }}
              formatter={(v) => [`${Math.round(Number(v) * 10) / 10} ${m.unit}`, m.label]}
            />
            <Area type="monotone" dataKey={metric} stroke="#FF5500" strokeWidth={2.5} fill="url(#fillBlue)" dot={{ r: 3, fill: '#FF5500', strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
