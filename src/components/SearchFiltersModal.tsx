import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Button } from '@ui/button'
import { RadioGroup, RadioGroupItem } from '@ui/radio-group'
import { Label } from '@ui/label'
import { SearchFilters, DEFAULT_FILTERS, getTimeRangeLabel, getArticleLengthLabel } from '@/types/searchFilters.types'
import { Filter, Clock, FileText, Sparkles, Save, Zap } from 'lucide-react'

interface SearchFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyOnce: (filters: SearchFilters) => void
  onSaveAsDefault: (filters: SearchFilters) => void
  initialFilters?: SearchFilters
  hasSavedPreferences?: boolean
}

export function SearchFiltersModal({
  isOpen,
  onClose,
  onApplyOnce,
  onSaveAsDefault,
  initialFilters = DEFAULT_FILTERS,
  hasSavedPreferences = false,
}: SearchFiltersModalProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)

  // Update local state when initialFilters change
  useEffect(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  const handleApplyOnce = () => {
    onApplyOnce(filters)
    onClose()
  }

  const handleSaveAsDefault = () => {
    onSaveAsDefault(filters)
    onClose()
  }

  const handleCancel = () => {
    setFilters(initialFilters) // Reset to initial values
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Filter className="h-5 w-5 text-slate-700" />
            Search Filters
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Customize your news search experience. {hasSavedPreferences && (
              <span className="text-blue-600 font-medium">You have saved preferences.</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Analysis Depth Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Analysis Depth</h3>
            </div>
            <div className="glass-card p-4 rounded-lg space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.includePhdAnalysis}
                  onChange={(e) =>
                    setFilters({ ...filters, includePhdAnalysis: e.target.checked })
                  }
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                    PhD-level analysis
                  </div>
                  <div className="text-sm text-slate-600">
                    Include advanced academic analysis (adds ~10 seconds to search time)
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Time Range Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Time Range</h3>
            </div>
            <RadioGroup
              value={filters.freshnessHorizonHours.toString()}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  freshnessHorizonHours: parseInt(value) as 24 | 48 | 168,
                })
              }
              className="space-y-2"
            >
              {[24, 48, 168].map((hours) => (
                <div key={hours} className="glass-card p-3 rounded-lg hover:bg-white/60 transition-colors">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={hours.toString()} id={`time-${hours}`} />
                    <Label
                      htmlFor={`time-${hours}`}
                      className="flex-1 cursor-pointer font-medium text-slate-900"
                    >
                      {getTimeRangeLabel(hours as 24 | 48 | 168)}
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Article Length Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Article Length</h3>
            </div>
            <RadioGroup
              value={filters.targetWordCount.toString()}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  targetWordCount: parseInt(value) as 300 | 500 | 1000,
                })
              }
              className="space-y-2"
            >
              {[300, 500, 1000].map((wordCount) => (
                <div key={wordCount} className="glass-card p-3 rounded-lg hover:bg-white/60 transition-colors">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem
                      value={wordCount.toString()}
                      id={`length-${wordCount}`}
                    />
                    <Label
                      htmlFor={`length-${wordCount}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium text-slate-900">
                        {getArticleLengthLabel(wordCount as 300 | 500 | 1000)}
                      </div>
                      <div className="text-xs text-slate-600">
                        {wordCount === 300 && 'Quick read, essential info'}
                        {wordCount === 500 && 'Balanced coverage'}
                        {wordCount === 1000 && 'Comprehensive analysis'}
                      </div>
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="glass-card glass-card-hover"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleApplyOnce}
            className="glass-card glass-card-hover flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Apply Once
          </Button>
          <Button
            onClick={handleSaveAsDefault}
            className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save as Default
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
