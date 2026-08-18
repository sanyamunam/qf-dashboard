/**
 * Thin ECharts adapter — the one place the library is touched, so a licence
 * swap (e.g. to Highcharts) is a one-file change. Exposes the chart instance
 * for convertToPixel, which BOTaina's annotation walk depends on.
 */
import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

export function EChart({
  option,
  height = 240,
  onReady,
}: {
  option: echarts.EChartsOption
  /** a number of pixels, or '100%' to fill a parent with a definite height */
  height?: number | string
  onReady?: (chart: echarts.ECharts) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current)
    chartRef.current = chart
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    chart.setOption({ animationDuration: reduced ? 0 : 400, animationEasing: 'cubicOut', ...option })
    onReady?.(chart)
    const ro = new ResizeObserver(() => {
      chart.resize()
      onReady?.(chart)
    })
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(option)])

  return <div ref={ref} style={{ width: '100%', height }} />
}

/** Shared QF chart theme fragments */
export const AXIS = {
  axisLine: { lineStyle: { color: '#e5e7eb' } },
  axisTick: { show: false },
  axisLabel: { color: '#666', fontFamily: 'Space Grotesk', fontSize: 11 },
  splitLine: { lineStyle: { color: '#e5e7eb' } },
}

export const TOOLTIP = (interpret: string): echarts.TooltipComponentOption => ({
  trigger: 'axis',
  backgroundColor: '#1a4a3e',
  borderWidth: 0,
  textStyle: { color: '#fff', fontFamily: 'Space Grotesk', fontSize: 12 },
  formatter: (params: unknown) => {
    const list = (Array.isArray(params) ? params : [params]) as {
      axisValueLabel?: string
      marker?: string
      seriesName?: string
      value?: number | null
    }[]
    const rows = list
      .filter((p) => p.value !== null && p.value !== undefined)
      .map((p) => `${p.marker} ${p.seriesName}: <b>${new Intl.NumberFormat('en').format(p.value as number)}</b>`)
      .join('<br/>')
    return `<div style="font-family:'Instrument Sans'">${list[0]?.axisValueLabel ?? ''}</div>${rows}<div style="margin-top:4px;font-family:'Instrument Sans';font-style:italic;opacity:.8;max-width:220px;white-space:normal">${interpret}</div>`
  },
})

export const TARGET_LINE = (value: number) => ({
  silent: true,
  symbol: 'none',
  lineStyle: { type: 'dashed' as const, color: '#9ca3af', width: 1.2 },
  label: {
    formatter: 'target {c}',
    position: 'insideEndTop' as const,
    color: '#9ca3af',
    fontSize: 10,
    fontFamily: 'Instrument Sans',
  },
  data: [{ yAxis: value }],
})
