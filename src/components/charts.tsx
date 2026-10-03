'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from 'recharts'

export function TrendChart({ data, dataKey = 'totalScore', color = '#16a34a' }: { data: Array<Record<string, unknown>>; dataKey?: string; color?: string }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategoryBar({ data }: { data: Array<Record<string, unknown>> }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="kwh" fill="#0284c7" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SubscoreRadar({ data }: { data: Array<{ metric: string; score: number }> }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
          <Radar dataKey="score" stroke="#16a34a" fill="#16a34a" fillOpacity={0.35} />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
