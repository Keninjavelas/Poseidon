// Feature: poseidon-smart-water-hub, Property 12: Alert feed bounded size
// Validates: Requirements 9.8

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertFeed } from '../components/layout/AlertFeed';
import type { AnomalyAlert } from '../types';

function makeAlert(i: number): AnomalyAlert {
  return {
    id: i,
    timestamp: new Date(Date.now() + i * 1000).toISOString(),
    node_id: `node-${i}`,
    alert_type: 'Contaminant Detected',
    confidence_score: 0.9,
    payload_json: {},
  };
}

describe('Property 12: Alert feed bounded size', () => {
  test('renders exactly 10 alerts when more than 10 are provided', () => {
    const alerts = Array.from({ length: 15 }, (_, i) => makeAlert(i));
    render(<AlertFeed alerts={alerts} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(10);
  });

  test('renders all alerts when fewer than 10 are provided', () => {
    const alerts = Array.from({ length: 5 }, (_, i) => makeAlert(i));
    render(<AlertFeed alerts={alerts} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
  });

  test('renders exactly 10 alerts when exactly 10 are provided', () => {
    const alerts = Array.from({ length: 10 }, (_, i) => makeAlert(i));
    render(<AlertFeed alerts={alerts} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(10);
  });
});
