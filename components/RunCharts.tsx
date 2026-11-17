'use client'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtClock } from '@/lib/format'

export type WeekPoint = { week: string; km: number }
export type PacePoint = { date: string; pace: number }

const tip = { background: '#171717', border: '1px solid #404040', borderRadius: 12 }
const tick = { fill: '#a3a3a3', fontSize: 11 }

export default function RunCharts({ weeks, paces }: { weeks: WeekPoint[]; paces: PacePoint[] }) {
  return (
    <div className="space-y-3">
      <div className="card">
        <h3 className="mb-2 text-sm font-semibold">Jarak per minggu (12 minggu)</h3>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 5, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="#262626" vertical={false} />
              <XAxis dataKey="week" tick={tick} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={tick} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tip} cursor={{ fill: '#262626' }} formatter={(v) => [`${Number(v).toFixed(1)} km`, "Jarak"]} />
              <Bar dataKey="km" fill="#fc4c02" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {paces.length > 1 && (
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold">Tren pace (makin rendah makin cepat)</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={paces} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#262626" vertical={false} />
                <XAxis dataKey="date" tick={tick} tickLine={false} axisLine={false} />
                <YAxis tick={tick} tickLine={false} axisLine={false} reversed domain={['auto', 'auto']} tickFormatter={(v) => fmtClock(Number(v))} />
                <Tooltip contentStyle={tip} formatter={(v) => [`${fmtClock(Number(v))} /km`, "Pace"]} />
                <Line type="monotone" dataKey="pace" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
