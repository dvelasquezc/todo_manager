'use client'

import { useState } from 'react'
import { FileText, Calendar, TrendingUp, AlertTriangle, Target, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateReport } from '@/actions/ai-assistant'
import type { ReportType, AIReport } from '@/types/ai'

const reportTypes: {
  type: ReportType
  label: string
  description: string
  icon: typeof FileText
}[] = [
  {
    type: 'daily_briefing',
    label: 'Daily Briefing',
    description: "Today's priorities and focus areas",
    icon: Calendar,
  },
  {
    type: 'weekly_review',
    label: 'Weekly Review',
    description: 'GTD-style weekly review',
    icon: FileText,
  },
  {
    type: 'long_term_trends',
    label: 'Long-term Trends',
    description: '4-8 week productivity analysis',
    icon: TrendingUp,
  },
  {
    type: 'friction_analysis',
    label: 'Friction Analysis',
    description: 'Identify stuck tasks and blockers',
    icon: AlertTriangle,
  },
  {
    type: 'estimate_calibration',
    label: 'Estimate Calibration',
    description: 'Time estimation accuracy analysis',
    icon: Target,
  },
]

export function QuickActions() {
  const [loadingReport, setLoadingReport] = useState<ReportType | null>(null)
  const [currentReport, setCurrentReport] = useState<AIReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateReport = async (reportType: ReportType) => {
    setLoadingReport(reportType)
    setError(null)
    setCurrentReport(null)

    const result = await generateReport({ report_type: reportType })

    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setCurrentReport(result.data)
    }

    setLoadingReport(null)
  }

  const handleBack = () => {
    setCurrentReport(null)
    setError(null)
  }

  if (currentReport) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            &larr; Back to Reports
          </Button>
          <h3 className="font-semibold mt-2">
            {reportTypes.find(r => r.type === currentReport.report_type)?.label}
          </h3>
          <p className="text-xs text-muted-foreground">
            Generated {new Date(currentReport.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReportContent content={currentReport.content} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold mb-1">On-Demand Reports</h3>
        <p className="text-sm text-muted-foreground">
          Generate productivity insights and analysis
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {reportTypes.map((report) => {
          const Icon = report.icon
          const isLoading = loadingReport === report.type

          return (
            <button
              key={report.type}
              onClick={() => handleGenerateReport(report.type)}
              disabled={loadingReport !== null}
              className="w-full p-3 border rounded-lg text-left hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-primary/10 text-primary">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{report.label}</p>
                  <p className="text-xs text-muted-foreground">{report.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Reports use Claude Opus for deep analysis. Daily reports cache for 1 hour, others for 6 hours.
        </p>
      </div>
    </div>
  )
}

function ReportContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []

  let inList = false
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-4 my-2 space-y-1">
          {listItems.map((item, i) => (
            <li key={i}>{formatText(item)}</li>
          ))}
        </ul>
      )
      listItems = []
      inList = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      flushList()
      elements.push(<h4 key={i} className="font-semibold mt-4 mb-2">{line.slice(4)}</h4>)
    } else if (line.startsWith('## ')) {
      flushList()
      elements.push(<h3 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(3)}</h3>)
    } else if (line.startsWith('# ')) {
      flushList()
      elements.push(<h2 key={i} className="font-bold text-xl mt-4 mb-2">{line.slice(2)}</h2>)
    } else if (line.match(/^[-*]\s/)) {
      inList = true
      listItems.push(line.slice(2))
    } else if (line.match(/^\d+\.\s/)) {
      inList = true
      listItems.push(line.replace(/^\d+\.\s/, ''))
    } else if (line.trim() === '') {
      flushList()
      elements.push(<div key={i} className="h-2" />)
    } else {
      flushList()
      elements.push(<p key={i} className="my-2">{formatText(line)}</p>)
    }
  }

  flushList()
  return <>{elements}</>
}

function formatText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}
