import React, { useState } from 'react';
import { Bell, ShieldAlert, CheckCircle, XCircle, Send, MessageSquare, AlertTriangle, UserCheck } from 'lucide-react';
import { Alert, CitizenReport } from '../types';
import { approveAlert, submitCitizenReport } from '../services/api';

interface AlertsHubProps {
  alerts: Alert[];
  reports: CitizenReport[];
  userRole: string;
  onAlertsUpdated: () => void;
  onReportsUpdated: () => void;
}

export const AlertsHub: React.FC<AlertsHubProps> = ({
  alerts,
  reports,
  userRole,
  onAlertsUpdated,
  onReportsUpdated
}) => {
  const [reportForm, setReportForm] = useState({
    user_name: '',
    user_phone: '',
    village_name: 'Nirjuli Riverside',
    report_type: 'Waterlogging',
    severity: 'High',
    description: ''
  });
  const [submittingReport, setSubmittingReport] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleApprove = async (alertId: string, status: string) => {
    try {
      await approveAlert(alertId, status, 'Authorized by SDMA Incident Commander');
      setActionMessage(`Alert order status updated to ${status}. Multi-channel dispatch triggered.`);
      onAlertsUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportForm.user_name || !reportForm.description) return;
    setSubmittingReport(true);
    try {
      await submitCitizenReport({
        catchment_id: 'CATCH-DIKRONG-01',
        latitude: 27.132,
        longitude: 93.742,
        ...reportForm
      });
      setReportForm({
        user_name: '',
        user_phone: '',
        village_name: 'Nirjuli Riverside',
        report_type: 'Waterlogging',
        severity: 'High',
        description: ''
      });
      setActionMessage('Citizen observation submitted successfully. Emergency response cell notified.');
      onReportsUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReport(false);
    }
  };

  const isOfficial = userRole === 'OFFICIAL' || userRole === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
          <Bell className="w-5 h-5 text-red-400" />
          <span>Emergency Warning Orders & Citizen Field Reports</span>
        </h1>
        <p className="text-xs text-slate-400">
          Targeted location-based emergency advisories, Incident Commander approval workflow, and crowdsourced hazard reporting
        </p>
      </div>

      {actionMessage && (
        <div className="bg-blue-950/40 border border-[#806C79]/40 text-blue-300 px-4 py-2 rounded-lg text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">×</button>
        </div>
      )}

      {/* Main Grid: Official Alerts vs Citizen Reporting */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Alerts Broadcast Feed & Incident Commander Workflow */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wide">
              Official Warning Orders ({alerts.length})
            </span>
            {isOfficial ? (
              <span className="text-xs text-[#C1A0AC] bg-[#F0D9E4]/10 px-2.5 py-1 rounded-full font-semibold border border-[#806C79]/30 flex items-center space-x-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Officer Command Mode Active</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400">Public Advisory View</span>
            )}
          </div>

          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((alt) => {
                const isApproved = alt.status === 'APPROVED';
                const isCritical = alt.risk_level.toLowerCase() === 'critical';

                return (
                  <div
                    key={alt.id}
                    className={`p-4 rounded-xl border space-y-3 transition ${
                      isCritical
                        ? 'bg-red-950/20 border-red-500/40'
                        : 'bg-[#4A3F4B]    border-[#806C79]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isCritical ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                          }`}>
                            {alt.severity}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{alt.alert_id_code}</span>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1">{alt.headline}</h3>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isApproved ? 'bg-emerald-500/20 text-[#20C7A2] border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {alt.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-[#16131F]/60 p-3 rounded-lg border border-[#806C79]/80">
                      {alt.message}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                      <div>Issued By: <strong className="text-slate-200">{alt.issued_by}</strong></div>
                      <div>Target Shelter: <strong className="text-[#C1A0AC]">{alt.nearest_shelter || 'NERIST Campus'}</strong></div>
                    </div>

                    {/* Official Authorization Actions */}
                    {isOfficial && !isApproved && (
                      <div className="pt-2 border-t border-[#806C79] flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleApprove(alt.id, 'CANCELLED')}
                          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                          <span>Reject / Cancel</span>
                        </button>
                        <button
                          onClick={() => handleApprove(alt.id, 'APPROVED')}
                          className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1 shadow cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve & Broadcast SMS</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-8 text-center text-xs text-slate-500">
                No active flood warning orders. Catchment is within safe operational thresholds.
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Citizen Field Report Form & Feed */}
        <div className="space-y-5">
          {/* Submit Observation Form */}
          <form onSubmit={handleReportSubmit} className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-4 space-y-3 shadow-sm">
            <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center space-x-1.5">
              <MessageSquare className="w-4 h-4 text-[#C1A0AC]" />
              <span>Report Local Flooding / Road Block</span>
            </span>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-400 text-[11px]">Your Name / Volunteer ID:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. T. Nabam"
                  value={reportForm.user_name}
                  onChange={(e) => setReportForm({ ...reportForm, user_name: e.target.value })}
                  className="w-full bg-[#16131F] border border-[#806C79] rounded-lg p-2 text-white text-xs mt-0.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px]">Location / Village:</label>
                <input
                  type="text"
                  required
                  value={reportForm.village_name}
                  onChange={(e) => setReportForm({ ...reportForm, village_name: e.target.value })}
                  className="w-full bg-[#16131F] border border-[#806C79] rounded-lg p-2 text-white text-xs mt-0.5 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 text-[11px]">Hazard Type:</label>
                  <select
                    value={reportForm.report_type}
                    onChange={(e) => setReportForm({ ...reportForm, report_type: e.target.value })}
                    className="w-full bg-[#16131F] border border-[#806C79] rounded-lg p-2 text-white text-xs mt-0.5 focus:outline-none cursor-pointer"
                  >
                    <option value="Waterlogging">Waterlogging</option>
                    <option value="Road Blocked">Road Blocked</option>
                    <option value="Bridge Overtopped">Bridge Overtopped</option>
                    <option value="Embankment Breach">Embankment Breach</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-[11px]">Severity:</label>
                  <select
                    value={reportForm.severity}
                    onChange={(e) => setReportForm({ ...reportForm, severity: e.target.value })}
                    className="w-full bg-[#16131F] border border-[#806C79] rounded-lg p-2 text-white text-xs mt-0.5 focus:outline-none cursor-pointer"
                  >
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-[11px]">Field Observation Details:</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Water rising near culvert, cars unable to cross..."
                  value={reportForm.description}
                  onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                  className="w-full bg-[#16131F] border border-[#806C79] rounded-lg p-2 text-white text-xs mt-0.5 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReport}
                className="w-full py-2 rounded-lg bg-[#F0D9E4] hover:bg-[#C1A0AC] text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingReport ? 'Submitting...' : 'Submit Field Report'}</span>
              </button>
            </div>
          </form>

          {/* Recent Field Reports Feed */}
          <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-4 space-y-3 shadow-sm">
            <span className="text-xs font-bold text-white uppercase tracking-wide">
              Recent Field Observations ({reports.length})
            </span>

            <div className="space-y-2 text-xs divide-y divide-slate-800/80">
              {reports.map((rp) => (
                <div key={rp.id} className="pt-2 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{rp.village_name}</span>
                    <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.5 bg-amber-500/10 rounded">
                      {rp.report_type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{rp.description}</p>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>By {rp.user_name}</span>
                    <span>Status: {rp.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
