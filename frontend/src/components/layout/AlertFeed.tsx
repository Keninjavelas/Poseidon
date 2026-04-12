'use client';

import type { AnomalyAlert } from '@/types';

const MAX_ALERTS = 10;

interface AlertFeedProps {
  alerts: AnomalyAlert[];
}

export function AlertFeed({ alerts }: AlertFeedProps) {
  const displayed = alerts.slice(0, MAX_ALERTS);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 mb-3">Recent Alerts (last 10)</h3>
      {displayed.length === 0 ? (
        <p className="text-sm text-gray-400">No alerts yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {displayed.map((alert, i) => (
            <li
              key={`${alert.timestamp}-${i}`}
              className="flex flex-col gap-0.5 p-2 rounded-lg bg-red-50 border border-red-100 text-xs"
            >
              <div className="flex justify-between">
                <span className="font-semibold text-red-700">{alert.alert_type}</span>
                <span className="text-gray-400">{new Date(alert.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Node: {alert.node_id}</span>
                <span>Confidence: {(alert.confidence_score * 100).toFixed(1)}%</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
