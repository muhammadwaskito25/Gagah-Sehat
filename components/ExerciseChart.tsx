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
        <div className="grid gap-1 rounded-xl bg-chalk p-1" style={{ gridTemplateColumns: `repeat(${METRICS.length}, minmax(0, 1fr))` }}>
          {METRICS.map((x) => (
            <button
              key={x.key}
              onClick={() => setMetric(x.key)}
              className={`rounded-lg py-1.5 text-[13px] font-semibold transition ${metric === x.key ? 'bg-white text-ink shadow-[0_1px_0_#E1E3DE]' : 'text-steel'}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="num text-[40px] leading-none">{Math.round(last * 10) / 10}</span>
          <span className="text-steel">{m.unit}</span>
          {data.length > 1 && (
            <span className={`ml-auto text-sm font-semibold ${diff >= 0 ? 'text-plate-green' : 'text-plate-red'}`}>
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
                <stop offset="0%" stopColor="#1D4ED8" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E1E3DE" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#6B7078', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #E1E3DE', borderRadius: 12, fontSize: 13 }}
              formatter={(v) => [`${Math.round(Number(v) * 10) / 10} ${m.unit}`, m.label]}
            />
            <Area type="monotone" dataKey={metric} stroke="#1D4ED8" strokeWidth={2.5} fill="url(#fillBlue)" dot={{ r: 3, fill: '#1D4ED8', strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
