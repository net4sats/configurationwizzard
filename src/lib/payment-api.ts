const GATEWAY_PORT = 2121;

function getGatewayBase(): string {
  const host = window.location.hostname || '192.168.1.1';
  return `http://${host}:${GATEWAY_PORT}`;
}

export interface PricingInfo {
  metric: 'milliseconds' | 'bytes';
  stepSize: number;
  pricePerStep: number;
  unit: string;
  mintUrl: string;
  minSteps: number;
}

export interface SessionEvent {
  allotment: number;
  metric: string;
  startTime: number;
  deviceMac: string;
}

export interface NoticeEvent {
  code: string;
  message: string;
}

export interface LnInvoiceRequest {
  amount: number;
  mint_url: string;
}

export interface LnInvoiceResponse {
  status: number;
  quote: string;
  invoice?: string;
  mint_url: string;
  amount: number;
  expiry?: number;
  state?: string;
  access_granted?: boolean;
  allotment?: number;
  metric?: string;
  error?: string;
}

export interface BalanceResponse {
  status: number;
  session_active: boolean;
  metric?: string;
  usage?: number;
  allotment?: number;
  remaining?: number;
  start_time?: number;
}

export type PaymentResult =
  | { ok: true; session: SessionEvent }
  | { ok: false; error: NoticeEvent };

export async function fetchPricing(): Promise<PricingInfo> {
  const res = await fetch(getGatewayBase() + '/');
  if (!res.ok) throw new Error(`Pricing fetch failed: ${res.status}`);
  const event = await res.json();
  return parseKind10021(event);
}

export async function fetchWhoami(): Promise<string> {
  const res = await fetch(getGatewayBase() + '/whoami');
  if (!res.ok) throw new Error('Whoami fetch failed');
  const text = await res.text();
  const match = text.match(/mac=([0-9a-fA-F:]+)/);
  if (!match) throw new Error('Could not parse MAC from whoami response');
  return match[1];
}

export async function payCashu(token: string): Promise<PaymentResult> {
  const res = await fetch(getGatewayBase() + '/', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: token,
  });
  const event = await res.json();

  if (event.kind === 1022) {
    return { ok: true, session: parseKind1022(event) };
  }
  if (event.kind === 21023) {
    return { ok: false, error: parseKind21023(event) };
  }

  if (!res.ok) {
    return { ok: false, error: { code: 'http-error', message: `Payment failed (${res.status})` } };
  }

  return { ok: false, error: { code: 'unexpected-response', message: 'Unexpected response from payment server' } };
}

export async function createLnInvoice(amount: number, mintUrl: string): Promise<LnInvoiceResponse> {
  const res = await fetch(getGatewayBase() + '/ln-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, mint_url: mintUrl }),
  });
  return res.json();
}

export async function pollLnInvoice(quoteId: string): Promise<LnInvoiceResponse> {
  const res = await fetch(getGatewayBase() + `/ln-invoice?quote=${encodeURIComponent(quoteId)}`);
  return res.json();
}

export async function fetchSessionBalance(): Promise<BalanceResponse> {
  const res = await fetch(getGatewayBase() + '/balance');
  return res.json();
}

function parseKind10021(event: any): PricingInfo {
  const tags = event.tags || [];
  let metric: PricingInfo['metric'] = 'milliseconds';
  let stepSize = 1;
  let pricePerStep = 1;
  let unit = 'sats';
  let mintUrl = '';
  let minSteps = 0;

  for (const tag of tags) {
    if (tag[0] === 'metric') {
      metric = tag[1] === 'bytes' ? 'bytes' : 'milliseconds';
    } else if (tag[0] === 'step_size') {
      stepSize = parseInt(tag[1], 10) || 1;
    } else if (tag[0] === 'price_per_step') {
      pricePerStep = parseInt(tag[2], 10) || 1;
      unit = tag[3] || 'sats';
      mintUrl = tag[4] || '';
      minSteps = parseInt(tag[5], 10) || 0;
    }
  }

  return { metric, stepSize, pricePerStep, unit, mintUrl, minSteps };
}

function parseKind1022(event: any): SessionEvent {
  const tags = event.tags || [];
  let allotment = 0;
  let metric = '';
  let startTime = 0;
  let deviceMac = '';

  for (const tag of tags) {
    if (tag[0] === 'allotment') allotment = parseInt(tag[1], 10) || 0;
    else if (tag[0] === 'metric') metric = tag[1] || '';
    else if (tag[0] === 'start-time') startTime = parseInt(tag[1], 10) || 0;
    else if (tag[0] === 'device-identifier' && tag[1] === 'mac') deviceMac = tag[2] || '';
  }

  return { allotment, metric, startTime, deviceMac };
}

function parseKind21023(event: any): NoticeEvent {
  const tags = event.tags || [];
  let code = 'unknown';
  for (const tag of tags) {
    if (tag[0] === 'code') code = tag[1] || 'unknown';
  }
  return { code, message: event.content || 'Unknown error' };
}

export function computeSizeOptions(pricing: PricingInfo): { label: string; sats: number; steps: number }[] {
  const { metric, stepSize, pricePerStep, minSteps } = pricing;

  const rawSteps = [
    { units: 15 * 60, label: '15 min' },
    { units: 60 * 60, label: '1 hour' },
    { units: 10 * 60 * 60, label: '10 hours' },
  ];

  if (metric === 'bytes') {
    rawSteps.length = 0;
    rawSteps.push(
      { units: 100 * 1048576, label: '100 MB' },
      { units: 1024 * 1048576, label: '1 GB' },
      { units: 10 * 1024 * 1048576, label: '10 GB' },
    );
  }

  const minUnits = minSteps * stepSize;
  const options = rawSteps
    .filter(r => r.units >= minUnits)
    .map(r => {
      const steps = Math.ceil(r.units / stepSize);
      const sats = steps * pricePerStep;
      return { label: r.label, sats, steps };
    });

  return options;
}
