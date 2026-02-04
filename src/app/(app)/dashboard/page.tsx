'use client'

import { useState, useEffect, useRef } from 'react'
import { Clock, CheckCircle, ListTodo, Timer, Download, ChevronDown, Check } from 'lucide-react'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { LazySection } from '@/components/ui/lazy-section'
import { StatsCard } from '@/components/dashboard/stats-card'
import { HoursByProjectChart } from '@/components/dashboard/hours-by-project-chart'
import { DeepWorkChart } from '@/components/dashboard/deep-work-chart'
import { ContextSwitchingChart } from '@/components/dashboard/context-switching-chart'
import { PlannedVsActualChart } from '@/components/dashboard/planned-vs-actual-chart'
import { EstimateCalibrationChart } from '@/components/dashboard/estimate-calibration-chart'
import { TaskThroughputChart } from '@/components/dashboard/task-throughput-chart'
import { StatusFlowChart } from '@/components/dashboard/status-flow-chart'
import { WipAgingChart } from '@/components/dashboard/wip-aging-chart'
import { CycleTimeChart } from '@/components/dashboard/cycle-time-chart'
import { DailyCompletionChart } from '@/components/dashboard/daily-completion-chart'
import { DayOfWeekChart } from '@/components/dashboard/day-of-week-chart'
import { TotalHoursByProjectChart } from '@/components/dashboard/total-hours-by-project-chart'
import {
  getWeeklyStats,
  getHoursByProjectWeekly,
  getDeepWorkTrend,
  getContextSwitchingTrend,
  getPlannedVsActualTrend,
  getEstimateCalibration,
  getTaskThroughputTrend,
  getStatusFlowTrend,
  getWipAgingData,
  getCycleTimeByProject,
  getDailyTaskCompletion,
  getProductivityByDayOfWeek,
  getTotalHoursByProject,
  getProjectsForDashboard,
  type WeeklyStats,
  type HoursByProjectWeek,
  type DeepWorkWeek,
  type ContextSwitchingDay,
  type PlannedVsActualWeek,
  type EstimateCalibrationPoint,
  type TaskThroughputWeek,
  type StatusFlowWeek,
  type WipAgingData,
  type CycleTimeByProject,
  type DailyCompletion,
  type DayOfWeekStats,
  type TotalHoursByProject,
} from '@/actions/analytics'

type TimeFilter = '1w' | '2w' | '4w' | '8w' | '3m' | '1y' | 'all'

const TIME_OPTIONS: { value: TimeFilter; label: string; weeks: number }[] = [
  { value: '1w', label: 'This Week', weeks: 1 },
  { value: '2w', label: 'Last 2 Weeks', weeks: 2 },
  { value: '4w', label: 'Last 4 Weeks', weeks: 4 },
  { value: '8w', label: 'Last 8 Weeks', weeks: 8 },
  { value: '3m', label: 'Last 3 Months', weeks: 13 },
  { value: '1y', label: 'Last Year', weeks: 52 },
  { value: 'all', label: 'All Time', weeks: 0 },
]

interface DashboardProject {
  id: string
  name: string
  color: string
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('4w')

  // Project filter state
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const projectDropdownRef = useRef<HTMLDivElement>(null)

  // Get weeks value for API calls
  const selectedWeeks = TIME_OPTIONS.find(o => o.value === timeFilter)?.weeks ?? 4

  // Fetch projects on mount
  useEffect(() => {
    getProjectsForDashboard().then(result => {
      if (result.data) {
        setProjects(result.data)
        setSelectedProjectIds(result.data.map(p => p.id))  // All selected by default
      }
      setProjectsLoaded(true)
    })
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Data states
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null)
  const [hoursByProject, setHoursByProject] = useState<HoursByProjectWeek[]>([])
  const [deepWork, setDeepWork] = useState<DeepWorkWeek[]>([])
  const [contextSwitching, setContextSwitching] = useState<ContextSwitchingDay[]>([])
  const [plannedVsActual, setPlannedVsActual] = useState<PlannedVsActualWeek[]>([])
  const [estimateCalibration, setEstimateCalibration] = useState<EstimateCalibrationPoint[]>([])
  const [taskThroughput, setTaskThroughput] = useState<TaskThroughputWeek[]>([])
  const [statusFlow, setStatusFlow] = useState<StatusFlowWeek[]>([])
  const [wipAging, setWipAging] = useState<WipAgingData[]>([])
  const [cycleTime, setCycleTime] = useState<CycleTimeByProject[]>([])
  const [dailyCompletion, setDailyCompletion] = useState<DailyCompletion[]>([])
  const [dayOfWeekStats, setDayOfWeekStats] = useState<DayOfWeekStats[]>([])
  const [totalHoursByProject, setTotalHoursByProject] = useState<TotalHoursByProject[]>([])

  useEffect(() => {
    // Wait until projects are loaded before fetching data
    if (!projectsLoaded) return

    async function loadData() {
      setLoading(true)
      setError(null)

      // Pass projectIds to filter data (empty array means all projects)
      const projectIds = selectedProjectIds.length === projects.length ? undefined : selectedProjectIds

      try {
        // Load all data in parallel with selected time and project filters
        const [
          statsResult,
          hoursResult,
          deepWorkResult,
          contextResult,
          plannedResult,
          calibrationResult,
          throughputResult,
          statusResult,
          wipResult,
          cycleResult,
          dailyResult,
          dayOfWeekResult,
          totalHoursResult,
        ] = await Promise.all([
          getWeeklyStats(),
          getHoursByProjectWeekly(selectedWeeks, projectIds),
          getDeepWorkTrend(selectedWeeks, projectIds),
          getContextSwitchingTrend(selectedWeeks, projectIds),
          getPlannedVsActualTrend(selectedWeeks, projectIds),
          getEstimateCalibration(selectedWeeks, projectIds),
          getTaskThroughputTrend(selectedWeeks, projectIds),
          getStatusFlowTrend(selectedWeeks, projectIds),
          getWipAgingData(),  // Snapshot - not time/project filtered
          getCycleTimeByProject(selectedWeeks, projectIds),
          getDailyTaskCompletion(selectedWeeks, projectIds),
          getProductivityByDayOfWeek(selectedWeeks, projectIds),
          getTotalHoursByProject(selectedWeeks, projectIds),
        ])

        if (statsResult.data) setWeeklyStats(statsResult.data)
        if (hoursResult.data) setHoursByProject(hoursResult.data)
        if (deepWorkResult.data) setDeepWork(deepWorkResult.data)
        if (contextResult.data) setContextSwitching(contextResult.data)
        if (plannedResult.data) setPlannedVsActual(plannedResult.data)
        if (calibrationResult.data) setEstimateCalibration(calibrationResult.data)
        if (throughputResult.data) setTaskThroughput(throughputResult.data)
        if (statusResult.data) setStatusFlow(statusResult.data)
        if (wipResult.data) setWipAging(wipResult.data)
        if (cycleResult.data) setCycleTime(cycleResult.data)
        if (dailyResult.data) setDailyCompletion(dailyResult.data)
        if (dayOfWeekResult.data) setDayOfWeekStats(dayOfWeekResult.data)
        if (totalHoursResult.data) setTotalHoursByProject(totalHoursResult.data)
      } catch (err) {
        setError('Failed to load dashboard data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedWeeks, selectedProjectIds, projectsLoaded, projects.length])

  // Download all dashboard data as JSON
  const handleDownload = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      timeFilter: timeFilter,
      timeFilterWeeks: selectedWeeks,
      weeklyStats,
      hoursByProject,
      deepWork,
      contextSwitching,
      plannedVsActual,
      estimateCalibration,
      taskThroughput,
      statusFlow,
      wipAging,
      cycleTime,
      dailyCompletion,
      dayOfWeekStats,
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-export-${timeFilter}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          {/* Project Filter */}
          <div className="relative" ref={projectDropdownRef}>
            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2 hover:bg-muted transition-colors min-w-[140px]"
            >
              <span className="truncate">
                {selectedProjectIds.length === 0
                  ? 'No projects'
                  : selectedProjectIds.length === projects.length
                  ? 'All projects'
                  : `${selectedProjectIds.length} project${selectedProjectIds.length !== 1 ? 's' : ''}`}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </button>
            {projectDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-popover border rounded-md shadow-md z-50 max-h-80 overflow-y-auto">
                <div className="p-2 border-b">
                  <button
                    onClick={() => {
                      if (selectedProjectIds.length === projects.length) {
                        setSelectedProjectIds([])
                      } else {
                        setSelectedProjectIds(projects.map(p => p.id))
                      }
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted flex items-center gap-2"
                  >
                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedProjectIds.length === projects.length ? 'bg-primary border-primary' : 'border-input'}`}>
                      {selectedProjectIds.length === projects.length && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="font-medium">Select All</span>
                  </button>
                </div>
                <div className="p-2 space-y-1">
                  {projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProjectIds(prev =>
                          prev.includes(project.id)
                            ? prev.filter(id => id !== project.id)
                            : [...prev, project.id]
                        )
                      }}
                      className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted flex items-center gap-2"
                    >
                      <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedProjectIds.includes(project.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                        {selectedProjectIds.includes(project.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Time Filter */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            {TIME_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={handleDownload}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-1 hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Hours This Week"
          value={weeklyStats?.totalHours ?? 0}
          subtitle="From focus sessions"
          icon={Clock}
        />
        <StatsCard
          title="Tasks Completed"
          value={weeklyStats?.tasksCompleted ?? 0}
          subtitle="This week"
          icon={CheckCircle}
        />
        <StatsCard
          title="Work In Progress"
          value={weeklyStats?.wipCount ?? 0}
          subtitle="Active tasks"
          icon={ListTodo}
        />
        <StatsCard
          title="Avg Cycle Time"
          value={weeklyStats?.avgCycleTimeDays != null ? `${weeklyStats.avgCycleTimeDays}d` : '-'}
          subtitle="Creation to completion"
          icon={Timer}
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row 1: Daily Productivity Charts */}
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-1">
            Daily Productivity
            <HelpTooltip content="Green line: tasks completed. Blue line: total hours worked (all focus sessions, including unfinished tasks)." />
          </h3>
          <DailyCompletionChart data={dailyCompletion} />
        </div>

        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-1">
            Productivity by Day of Week
            <HelpTooltip content="Average hours worked and tasks completed on each weekday, calculated only from days with recorded activity." />
          </h3>
          <DayOfWeekChart data={dayOfWeekStats} />
        </div>

        {/* Row 2: Hours by Project + Deep Work */}
        <LazySection>
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-1">
              Hours by Project
              <HelpTooltip content="Distribution of your focus time across projects by week." />
            </h3>
            <HoursByProjectChart data={hoursByProject} />
          </div>
        </LazySection>

        {/* Row 3: Deep Work */}
        <LazySection>
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-1">
              Deep Work Share
              <HelpTooltip content="Percentage of focus time spent on high-energy tasks. Mark tasks as 'High Energy' to track deep work vs shallow work." />
            </h3>
            <DeepWorkChart data={deepWork} />
          </div>
        </LazySection>

        {/* Row 3: Context Switching + Planned vs Actual */}
        <LazySection>
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-1">
              Context Switching Index
              <HelpTooltip content="Number of different projects worked on per day. High switching may reduce deep work effectiveness." />
            </h3>
            <ContextSwitchingChart data={contextSwitching} />
          </div>
        </LazySection>

        <LazySection>
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-1">
              Planned vs Actual Time
              <HelpTooltip content="Compares your time estimates to actual time spent on completed tasks. Only includes tasks with both estimate and actual hours logged." />
            </h3>
            <PlannedVsActualChart data={plannedVsActual} />
          </div>
        </LazySection>

        {/* Row 4: Estimate Calibration + Throughput */}
        <LazySection>
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-1">
              Estimate Calibration
              <HelpTooltip content="Scatter plot of estimates vs actuals. Points on the diagonal line = perfect estimates. Above = underestimated, below = overestimated." />
            </h3>
            <EstimateCalibrationChart data={estimateCalibration} />
          </div>
        </LazySection>

        <LazySection>
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-1">
              Task Throughput
              <HelpTooltip content="Number of tasks completed per week. Track your productivity trends over time." />
            </h3>
            <TaskThroughputChart data={taskThroughput} />
          </div>
        </LazySection>

        {/* Row 5: Status Flow + WIP Aging */}
        <LazySection>
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-1">
              Status Flow Over Time
              <HelpTooltip content="Shows where tasks created each week currently are in your workflow. Helps identify if new work is piling up in inbox." />
            </h3>
            <StatusFlowChart data={statusFlow} />
          </div>
        </LazySection>

        <LazySection>
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-1">
              WIP Aging
              <HelpTooltip content="Active tasks colored by staleness (time since last update). Red = not touched in 30+ days. This is a current snapshot - not affected by time filter." />
            </h3>
            <WipAgingChart data={wipAging} />
          </div>
        </LazySection>

        {/* Row 6: Cycle Time (full width) */}
        <LazySection>
          <div className="bg-card border rounded-lg p-4 lg:col-span-2">
            <h3 className="font-semibold mb-4 flex items-center gap-1">
              Cycle Time by Project
              <HelpTooltip content="Average days from task creation to completion per project. Lower cycle time means faster delivery." />
            </h3>
            <CycleTimeChart data={cycleTime} />
          </div>
        </LazySection>

        {/* Row 7: Total Hours by Project (full width) */}
        <LazySection>
          <div className="bg-card border rounded-lg p-4 lg:col-span-2">
            <h3 className="font-semibold mb-4 flex items-center gap-1">
              Total Hours by Project
              <HelpTooltip content="Total focus time per project for the selected time period." />
            </h3>
            <TotalHoursByProjectChart data={totalHoursByProject} />
          </div>
        </LazySection>
      </div>
    </div>
  )
}
