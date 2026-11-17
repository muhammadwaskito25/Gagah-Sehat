'use client'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type ExPoint = { date: string; e1rm: number; maxWeight: number; volume: number; bestReps: number }

const METRICS = [
  { key: 'e1rm', label: 'Est. 1RM', unit: 'kg' },
  { key: 'maxWeight', label: 'Beban Terberat', unit: 'kg' },
  { key: 'volume', label: 'Volume', unit: 'kg' },
  { key: 'bestReps', label: 'Reps Terbanyak', unit: '' },
] as const

export default function ExerciseChart({ data }: { data: ExPoint[] }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]['key']>('e1rm')
  const m = METRICS.find((x) => x.key === metric)!
  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {METRICS.map((x) => (
          <button
            key={x.key}
            onClick={() => setMetric(x.key)}
            className={`rounded-full px-3 py-1 text-xs ${metric === x.key ? 'bg-blue-500 text-white' : 'bg-neutral-800 text-neutral-300'}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#262626" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 12 }}
              formatter={(v) => [`${Math.round(Number(v) * 10) / 10} ${m.unit}`, m.label]}
            />
            <Line type="monotone" dataKey={metric} stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
