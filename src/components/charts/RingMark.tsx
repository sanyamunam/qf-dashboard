/**
 * Part-of-whole ring — an ECharts gauge from the shared adapter, used where a
 * card needs "N of M" to read at a glance. Replaces the 86-dot grid: the shape
 * carries the proportion instantly, and both real counts stay on the card
 * (centre label + legend) rather than collapsing into a percentage.
 */
import { EChart } from './EChart'

export function RingMark({
  value,
  total,
  hue,
  valueLabel,
  totalLabel,
}: {
  value: number
  total: number
  hue: string
  valueLabel: string
  totalLabel: string
}) {
  return (
    <div>
      <EChart
        height={98}
        option={{
          series: [
            {
              type: 'gauge',
              startAngle: 90,
              endAngle: -270,
              min: 0,
              max: total,
              radius: '96%',
              center: ['50%', '50%'],
              progress: { show: true, width: 10, roundCap: true, itemStyle: { color: hue } },
              axisLine: { lineStyle: { width: 10, color: [[1, 'rgba(200,201,199,0.40)']] } },
              pointer: { show: false },
              axisTick: { show: false },
              splitLine: { show: false },
              axisLabel: { show: false },
              anchor: { show: false },
              title: { show: false },
              detail: {
                offsetCenter: [0, 0],
                formatter: `{v|${value}}{s| of ${total}}`,
                rich: {
                  v: { fontSize: 23, fontWeight: 700, fontFamily: 'Space Grotesk', color: hue },
                  s: { fontSize: 12, fontFamily: 'Space Grotesk', color: '#7e938d' },
                },
              },
              data: [{ value }],
            },
          ],
        }}
      />
      <div className="mt-1.5 flex justify-center gap-4 text-[10.5px] text-ink-mute">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: hue }} />
          <span className="num font-semibold text-ink-soft">{value}</span> {valueLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'rgba(200,201,199,0.7)' }} />
          <span className="num font-semibold text-ink-soft">{total}</span> {totalLabel}
        </span>
      </div>
    </div>
  )
}
