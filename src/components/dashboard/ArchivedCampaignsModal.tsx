'use client';

import { notify, confirmAction } from '@/components/common/Feedback';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, RotateCcw, Trash2, X } from 'lucide-react';
import { endOfWeek, format, parseISO, startOfWeek } from 'date-fns';
import GridView from '@/components/calendar/GridView';
import { campaignColors } from '@/lib/colorUtils';
import { exportFileName, exportSchedule } from '@/lib/exportUtils';
import {
  deleteArchivedCampaign,
  getArchivedCampaign,
  listArchivedCampaigns,
  reinstateArchivedCampaign,
  type ArchivedCampaignPayload,
  type ArchivedCampaignSummary,
} from '@/lib/scheduleData';

interface ArchivedCampaignsModalProps {
  scheduleId: string;
  scheduleName: string;
  scheduleLogoUrl?: string;
  onClose: () => void;
}

interface SelectedArchive {
  summary: ArchivedCampaignSummary;
  payload: ArchivedCampaignPayload;
}

export default function ArchivedCampaignsModal({
  scheduleId,
  scheduleName,
  scheduleLogoUrl,
  onClose,
}: ArchivedCampaignsModalProps) {
  const [archives, setArchives] = useState<ArchivedCampaignSummary[] | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<SelectedArchive | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState<'jpeg' | 'pdf' | null>(null);
  const [isReinstating, setIsReinstating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reName, setReName] = useState('');
  const [reColor, setReColor] = useState('');
  const [reStart, setReStart] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const loadArchives = async () => {
    try {
      setArchives(await listArchivedCampaigns(scheduleId));
      setError('');
    } catch (err) {
      console.error('Could not load archived campaigns', err);
      setError('Archived campaigns couldn’t be loaded.');
      setArchives([]);
    }
  };

  useEffect(() => {
    loadArchives();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId]);

  const openArchive = async (summary: ArchivedCampaignSummary) => {
    setLoadingPreview(true);
    setError('');
    try {
      const payload = await getArchivedCampaign(summary.id);
      setSelected({ summary, payload });
    } catch (err) {
      console.error('Could not load archived campaign', err);
      setError('That archive couldn’t be loaded.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const events = selected?.payload.events ?? [];
  const earliest = events.length
    ? new Date(Math.min(...events.map(event => new Date(event.startDate).getTime())))
    : null;
  const latest = events.length
    ? new Date(Math.max(...events.map(event => new Date(event.endDate).getTime())))
    : null;
  const rangeStart = startOfWeek(earliest ?? new Date(), { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(latest ?? rangeStart, { weekStartsOn: 1 });
  const previewCampaigns = selected ? [{ ...selected.payload.campaign, locked: true }] : [];
  const previewPeople = selected?.payload.people ?? [];

  const handleExport = async (exportFormat: 'jpeg' | 'pdf') => {
    if (!exportRef.current || !selected || exporting) return;
    setExporting(exportFormat);
    try {
      await exportSchedule(exportRef.current, exportFormat, exportFileName([selected.summary.name]), {
        title: selected.summary.name,
        date: format(new Date(), 'd MMM yyyy'),
        scheduleLogoUrl,
        campaigns: [{ name: selected.summary.name, color: selected.summary.color, logoUrl: selected.payload.campaign.logoUrl }],
      });
    } catch (err) {
      console.error('Archive export failed', err);
      notify('Sorry, the export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const openReinstate = () => {
    if (!selected) return;
    setReName(selected.summary.name);
    setReColor(selected.summary.color);
    setReStart(format(earliest ?? new Date(), 'yyyy-MM-dd'));
    setIsReinstating(true);
  };

  const handleReinstate = async () => {
    if (!selected || !reName.trim() || !reColor || !reStart || isSaving) return;
    setIsSaving(true);
    try {
      await reinstateArchivedCampaign(scheduleId, selected.summary.id, {
        name: reName.trim(),
        color: reColor,
        startDate: parseISO(reStart),
      });
      setSelected(null);
      setIsReinstating(false);
      await loadArchives();
    } catch (err) {
      console.error('Could not reinstate campaign', err);
      notify('The campaign couldn’t be reinstated. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArchive = async () => {
    if (!selected || isDeleting) return;
    const confirmed = await confirmAction({
      title: 'Delete archive?',
      message: `“${selected.summary.name}” will be removed permanently and can’t be reinstated.`,
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await deleteArchivedCampaign(selected.summary.id);
      setSelected(null);
      await loadArchives();
    } catch (err) {
      console.error('Could not delete archive', err);
      notify('The archive couldn’t be deleted. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Archived campaigns</h2>
            <p className="text-xs text-gray-500">{scheduleName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {error && <p className="px-6 pt-4 text-sm text-red-600">{error}</p>}

        <div className="flex-1 min-h-0 overflow-hidden">
          {!selected ? (
            <div className="h-full overflow-y-auto p-6">
              {archives === null ? (
                <p className="text-sm text-gray-500">Loading archives…</p>
              ) : archives.length === 0 ? (
                <p className="text-sm text-gray-500">No archived campaigns yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {archives.map(archive => (
                    <button
                      key={archive.id}
                      onClick={() => openArchive(archive)}
                      className="text-left border border-gray-200 rounded-lg p-4 hover:border-gray-400 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: archive.color }} />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-800 truncate">{archive.name}</div>
                          <div className="text-xs text-gray-500">Archived {format(new Date(archive.createdAt), 'd MMM yyyy')}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {loadingPreview && <p className="text-sm text-gray-500 mt-4">Loading preview…</p>}
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft size={16} />
                  All archives
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport('jpeg')}
                    disabled={!!exporting}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Download size={14} />
                    {exporting === 'jpeg' ? 'Exporting…' : 'Export JPEG'}
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={!!exporting}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Download size={14} />
                    {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
                  </button>
                  <button
                    onClick={openReinstate}
                    className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center gap-2"
                  >
                    <RotateCcw size={14} />
                    Reinstate
                  </button>
                  <button
                    onClick={handleDeleteArchive}
                    disabled={isDeleting}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    {isDeleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
              <div ref={exportRef} className="flex-1 min-h-0">
                <GridView
                  events={events}
                  campaigns={previewCampaigns}
                  people={previewPeople}
                  currentDate={rangeStart}
                  onDateClick={() => {}}
                  showWeekends
                  showEventNotes={false}
                  showPeople
                  dateRange={{ start: rangeStart, end: rangeEnd }}
                  readOnly
                  exportMarkers={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {isReinstating && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Reinstate campaign</h3>
            <p className="text-sm text-gray-600 mb-5">
              This recreates the archived event blocks on the schedule.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign name</label>
                <input
                  type="text"
                  value={reName}
                  onChange={e => setReName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign colour</label>
                <div className="grid grid-cols-7 gap-2">
                  {campaignColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setReColor(color)}
                      className={`w-9 h-9 rounded-full border-2 transition-transform ${reColor === color ? 'border-gray-800 scale-110' : 'border-gray-200 hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start day</label>
                <input
                  type="date"
                  value={reStart}
                  onChange={e => setReStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">The earliest archived block will move to this day.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setIsReinstating(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReinstate}
                disabled={isSaving || !reName.trim() || !reColor || !reStart}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50"
              >
                {isSaving ? 'Reinstating…' : 'Reinstate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
