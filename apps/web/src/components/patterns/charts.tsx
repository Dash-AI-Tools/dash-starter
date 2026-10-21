import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber, type Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * A point of a chart series.
 */
export type ChartDatum = {
  /** The label of the point, shown on the axis. */
  label: string
  /** The value of the point. */
  value: number
}

/**
 * The colors of the series, taken from the theme tokens so the charts follow
 * the light and dark themes.
 */
const SERIES_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

/**
 * The tooltip of the charts, formatted with the conventions of the locale.
 */
function ChartTooltip({
  active,
  payload,
  label,
  locale,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
  locale: Locale
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label ? <p className="font-medium">{label}</p> : null}
      {payload.map((entry, index) => (
        <p key={index} className="text-muted-foreground">
          {entry.name ? `${entry.name}: ` : ''}
          {formatNumber(locale, entry.value ?? 0)}
        </p>
      ))}
    </div>
  )
}

/**
 * The axes shared by every chart.
 */
function ChartAxes({
  locale,
  dataKey,
}: {
  locale: Locale
  dataKey: keyof ChartDatum
}) {
  return (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
      <XAxis dataKey={dataKey} tickLine={false} axisLine={false} fontSize={12} />
      <YAxis
        tickLine={false}
        axisLine={false}
        fontSize={12}
        tickFormatter={(value: number) => formatNumber(locale, value)}
      />
      <Tooltip
        content={<ChartTooltip locale={locale} />}
        cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
      />
    </>
  )
}

/**
 * A line chart.
 */
export function LineChartCard({
  data,
  locale = 'en',
  seriesName = 'Value',
  height = 240,
  className,
}: {
  data: ChartDatum[]
  locale?: Locale
  seriesName?: string
  height?: number
  className?: string
}) {
  return (
    <figure className={cn('w-full', className)} aria-label={seriesName}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <ChartAxes locale={locale} dataKey="label" />
          <Line
            type="monotone"
            dataKey="value"
            name={seriesName}
            stroke={SERIES_COLORS[0]}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}

/**
 * A bar chart.
 */
export function BarChartCard({
  data,
  locale = 'en',
  seriesName = 'Value',
  height = 240,
  className,
}: {
  data: ChartDatum[]
  locale?: Locale
  seriesName?: string
  height?: number
  className?: string
}) {
  return (
    <figure className={cn('w-full', className)} aria-label={seriesName}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <ChartAxes locale={locale} dataKey="label" />
          <Bar dataKey="value" name={seriesName} fill={SERIES_COLORS[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  )
}

/**
 * An area chart.
 */
export function AreaChartCard({
  data,
  locale = 'en',
  seriesName = 'Value',
  height = 240,
  className,
}: {
  data: ChartDatum[]
  locale?: Locale
  seriesName?: string
  height?: number
  className?: string
}) {
  return (
    <figure className={cn('w-full', className)} aria-label={seriesName}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <ChartAxes locale={locale} dataKey="label" />
          <Area
            type="monotone"
            dataKey="value"
            name={seriesName}
            stroke={SERIES_COLORS[0]}
            fill={SERIES_COLORS[0]}
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  )
}

/**
 * A pie chart.
 */
export function PieChartCard({
  data,
  locale = 'en',
  seriesName = 'Value',
  height = 240,
  className,
}: {
  data: ChartDatum[]
  locale?: Locale
  seriesName?: string
  height?: number
  className?: string
}) {
  return (
    <figure className={cn('w-full', className)} aria-label={seriesName}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="50%"
            outerRadius="80%"
          >
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip locale={locale} />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </figure>
  )
}
