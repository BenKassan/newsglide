import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@ui/dialog'
import { Button } from '@ui/button'
import { Label } from '@ui/label'
import { Switch } from '@ui/switch'
import { Separator } from '@ui/separator'
import { Sparkles } from 'lucide-react'

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  includePhdAnalysis: boolean
  onPhdAnalysisChange: (checked: boolean) => void
}

export const FilterModal = ({
  isOpen,
  onClose,
  includePhdAnalysis,
  onPhdAnalysisChange,
}: FilterModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glass-card border-slate-200/50 shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Search Settings
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-base">
            Customize your news search experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* PhD Analysis Setting */}
          <div className="glass-card rounded-xl p-5 hover:shadow-md transition-all duration-300 border border-slate-200/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="phd-analysis"
                  className="text-base font-semibold text-slate-900 flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-2xl">🔬</span>
                  PhD-level Analysis
                </Label>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Include comprehensive academic analysis with deeper insights and research-backed perspectives
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                  <span className="px-2 py-1 bg-slate-100 rounded-full">+10 seconds</span>
                  <span>• More detailed content</span>
                </div>
              </div>
              <Switch
                id="phd-analysis"
                checked={includePhdAnalysis}
                onCheckedChange={onPhdAnalysisChange}
                className="mt-1"
              />
            </div>
          </div>

          <Separator className="bg-slate-200/50" />

          {/* Placeholder for future filters */}
          <div className="glass-card rounded-xl p-6 text-center border border-dashed border-slate-300/50 bg-slate-50/50">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-500 font-medium">
              More powerful filters coming soon
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Source selection, time ranges, and more...
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            onClick={onClose}
            className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Apply Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
