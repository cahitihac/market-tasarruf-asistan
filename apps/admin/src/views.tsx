'use client';

import { useEffect, useState } from 'react';
import { adminGet, adminPost, adminPut } from './api';
import { Badge, ErrorBlock, Field, LoadingBlock, PageHeader } from './components';
import { dateTime, money, packageLabel, percent } from './format';

// Admin API rows are intentionally broad because each table includes different nested response shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function useAdminData<T>(path: string, refreshKey = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setError(null);
    adminGet<T>(path).then(result => { if (active) setData(result); })
      .catch((caught: Error) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, [path, refreshKey]);
  return { data, error };
}

function statusTone(value?: string): 'neutral' | 'good' | 'warn' | 'bad' {
  if (!value) return 'neutral';
  if (['APPROVED', 'MATCHED', 'SUCCEEDED', 'ACTIVE', 'VERIFIED', 'AUTHORIZED'].includes(value)) return 'good';
  if (['PENDING', 'NEEDS_REVIEW', 'PARTIAL', 'SUPPLIED_UNVERIFIED', 'MANUAL_UPLOAD', 'PUBLIC_DATA', 'UNVERIFIED'].includes(value)) return 'warn';
  if (['FAILED', 'REJECTED', 'RESTRICTED', 'EXPIRED'].includes(value)) return 'bad';
  return 'neutral';
}

function useOperationMessage() {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<unknown>, success = 'Saved') {
    setBusy(true);
    setMessage(null);
    try { await action(); setMessage(success); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : String(caught)); }
    finally { setBusy(false); }
  }
  return { busy, message, run };
}

function DataState<T>({ data, error, children }: { data: T | null; error: string | null; children: (data: T) => React.ReactNode }) {
  if (error) return <ErrorBlock message={error} />;
  if (!data) return <LoadingBlock />;
  return children(data);
}

export function DashboardView() {
  const { data, error } = useAdminData<{ counts: AnyRecord; recentBrochures: AnyRecord[]; recentAlerts: AnyRecord[] }>('/admin/dashboard');
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Operational health for ingestion, review, pricing and alerts." />
      <DataState data={data} error={error}>{state => (
        <>
          <section className="metric-grid">
            {Object.entries(state.counts).map(([key, value]) => (
              <div className="metric" key={key}><span>{key.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`)}</span><strong>{String(value)}</strong></div>
            ))}
          </section>
          <section className="split">
            <div><h2>Recent Brochures</h2><Rows rows={state.recentBrochures.map(item => ({
              Retailer: item.chain.name, Source: item.source, Status: item.status,
              Authorization: item.sourceAuthorizationStatus, Imported: dateTime(item.importedAt),
            }))} /></div>
            <div><h2>Recent Alerts</h2><Rows rows={state.recentAlerts.map(item => ({
              Deal: item.deal.productName, Retailer: item.deal.retailerName,
              Notification: item.notification ? 'created' : 'missing', Created: dateTime(item.createdAt),
            }))} /></div>
          </section>
        </>
      )}</DataState>
    </>
  );
}

function Rows({ rows }: { rows: Array<Record<string, React.ReactNode>> }) {
  const columns = Object.keys(rows[0] ?? {});
  if (!rows.length) return <div className="empty">No records</div>;
  return (
    <div className="table-wrap">
      <table><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{columns.map(column => <td key={column}>{row[column]}</td>)}</tr>)}</tbody></table>
    </div>
  );
}

function FilterInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />;
}

export function ReviewQueueView() {
  const [status, setStatus] = useState('PENDING');
  const [retailer, setRetailer] = useState('');
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [batchReason, setBatchReason] = useState('');
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (retailer) query.set('retailer', retailer);
  if (reason) query.set('reason', reason);
  const { data, error } = useAdminData<{ reviewItems: AnyRecord[] }>(`/admin/reviews?${query.toString()}`, refresh);
  async function batchReject() {
    setBatchBusy(true);
    setBatchMessage(null);
    try {
      const result = await adminPost<{ summary: Array<{ status: string }> }>('/admin/reviews/batch', {
        action: 'REJECT', reviewItemIds: selected, reason: batchReason, confirm: true,
      });
      setBatchMessage(`Rejected ${result.summary.filter(item => item.status === 'REJECTED').length} item(s)`);
      setSelected([]);
      setBatchReason('');
      setRefresh(value => value + 1);
    } catch (caught) {
      setBatchMessage(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBatchBusy(false);
    }
  }
  return (
    <>
      <PageHeader title="Review Queue" subtitle="Approve, manually match, or reject uncertain brochure extraction results." />
      <section className="filters">
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="PENDING">Pending</option><option value="MATCHED">Matched</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="">All</option>
        </select>
        <FilterInput value={retailer} onChange={setRetailer} placeholder="Retailer" />
        <FilterInput value={reason} onChange={setReason} placeholder="Reason" />
      </section>
      <DataState data={data} error={error}>{state => (
        <>
          <section className="batch-bar">
            <strong>{selected.length} selected</strong>
            <input value={batchReason} onChange={event => setBatchReason(event.target.value)} placeholder="Batch rejection reason" />
            <button className="danger" disabled={batchBusy || selected.length === 0 || batchReason.trim().length < 3} onClick={batchReject}>Reject selected</button>
            {batchMessage ? <span className="message">{batchMessage}</span> : null}
          </section>
          <div className="review-list">
            {state.reviewItems.map(item => <ReviewItemCard key={item.id} item={item}
              selected={selected.includes(item.id)}
              onSelect={checked => setSelected(values => checked ? [...new Set([...values, item.id])] : values.filter(id => id !== item.id))}
              onChanged={() => setRefresh(value => value + 1)} />)}
            {!state.reviewItems.length ? <div className="empty">No review items match these filters.</div> : null}
          </div>
        </>
      )}</DataState>
    </>
  );
}

export function IngestionReviewsView() {
  const [status, setStatus] = useState('PENDING');
  const [refresh, setRefresh] = useState(0);
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  const { data, error } = useAdminData<{ reviewItems: AnyRecord[] }>(`/admin/ingestion-reviews?${query.toString()}`, refresh);
  return (
    <>
      <PageHeader title="Ingestion Reviews" subtitle="Review anomalous CSV, JSON and API records before they become trusted observations." />
      <section className="filters">
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="PENDING">Pending</option><option value="MATCHED">Matched</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="">All</option>
        </select>
      </section>
      <DataState data={data} error={error}>{state => (
        <div className="review-list">
          {state.reviewItems.map(item => <IngestionReviewCard key={item.id} item={item}
            onChanged={() => setRefresh(value => value + 1)} />)}
          {!state.reviewItems.length ? <div className="empty">No ingestion review items match these filters.</div> : null}
        </div>
      )}</DataState>
    </>
  );
}

function IngestionReviewCard({ item, onChanged }: { item: AnyRecord; onChanged: () => void }) {
  const [variantId, setVariantId] = useState(item.selectedVariantId ?? '');
  const [corrected, setCorrected] = useState(JSON.stringify(item.proposedValues ?? item.rawValues ?? {}, null, 2));
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { data: products } = useAdminData<{ products: AnyRecord[] }>(search.length >= 2 ? `/admin/products?search=${encodeURIComponent(search)}` : '/admin/products');
  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(label);
    setMessage(null);
    try { await action(); setMessage(`${label} complete`); onChanged(); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : String(caught)); }
    finally { setBusy(null); }
  }
  return (
    <article className="review-item">
      <div className="review-main">
        <div className="review-title">
          <h2>{item.ingestionRow.run.source} row {item.ingestionRow.rowNumber}</h2>
          <Badge tone={statusTone(item.state)}>{item.state}</Badge>
          <Badge tone="warn">{item.reason}</Badge>
        </div>
        <div className="facts">
          <Field label="Source">{item.ingestionRow.run.dataSource?.name ?? item.ingestionRow.run.source}</Field>
          <Field label="Connector">{item.ingestionRow.run.sourceType}</Field>
          <Field label="Run">{item.ingestionRow.run.status}</Field>
          <Field label="Row status">{item.ingestionRow.status}</Field>
        </div>
        <div className="candidate-tools">
          <select value={variantId} onChange={event => setVariantId(event.target.value)}>
            <option value="">Auto match or select canonical product</option>
            {(products?.products ?? []).flatMap(product => product.variants.map((variant: AnyRecord) => (
              <option value={variant.id} key={variant.id}>{product.name} · {variant.quantity} {variant.unit}</option>
            )))}
          </select>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search canonical products" />
          <input value={reason} onChange={event => setReason(event.target.value)} placeholder="Rejection reason" />
        </div>
        <textarea className="json-editor" value={corrected} onChange={event => setCorrected(event.target.value)} rows={8} />
        <div className="actions">
          <button disabled={Boolean(busy)} onClick={() => run('Approve', () => adminPost(`/admin/ingestion-reviews/${item.id}/approve`, {
            variantId: variantId || undefined, correctedValues: JSON.parse(corrected),
          }))}>Approve corrected</button>
          <button className="danger" disabled={Boolean(busy) || reason.trim().length < 3}
            onClick={() => run('Reject', () => adminPost(`/admin/ingestion-reviews/${item.id}/reject`, { reason }))}>Reject</button>
          {message ? <span className="message">{message}</span> : null}
        </div>
        <div className="event-log">
          <h3>Review History</h3>
          {(item.events ?? []).map((event: AnyRecord) => (
            <div key={event.id} className="event-row">
              <strong>{event.action}</strong>
              <span>{event.actor?.displayName ?? event.actor?.email ?? 'system'} · {dateTime(event.createdAt)}</span>
              {event.note ? <p>{event.note}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function ReviewItemCard({ item, selected, onSelect, onChanged }: { item: AnyRecord; selected: boolean; onSelect: (checked: boolean) => void; onChanged: () => void }) {
  const [selectedVariant, setSelectedVariant] = useState(item.selectedVariantId ?? item.candidateMatches?.[0]?.variantId ?? '');
  const [rejectReason, setRejectReason] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { data: products } = useAdminData<{ products: AnyRecord[] }>(search.length >= 2 ? `/admin/products?search=${encodeURIComponent(search)}` : '/admin/products');
  const offer = item.brochureOffer;
  const brochure = offer.brochure;
  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(label);
    setMessage(null);
    try { await action(); setMessage(`${label} complete`); onChanged(); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : String(caught)); }
    finally { setBusy(null); }
  }
  return (
    <article className="review-item">
      <div className="review-main">
        <div className="review-title">
          <input className="row-check" type="checkbox" checked={selected} onChange={event => onSelect(event.target.checked)} />
          <h2>{offer.productName}</h2>
          <Badge tone={statusTone(item.state)}>{item.state}</Badge>
          <Badge tone="warn">{item.reason}</Badge>
        </div>
        <div className="facts">
          <Field label="Retailer">{brochure.chain.name}</Field>
          <Field label="Source">{brochure.source}</Field>
          <Field label="Authorization"><Badge tone={statusTone(brochure.sourceAuthorizationStatus)}>{brochure.sourceAuthorizationStatus}</Badge></Field>
          <Field label="Page">{offer.page?.pageNumber ?? '-'}</Field>
          <Field label="Brand">{offer.brand ?? '-'}</Field>
          <Field label="Package">{packageLabel(offer.packageQuantity, offer.packageUnit, offer.packageCount)}</Field>
          <Field label="Price">{money(offer.currentPriceMinor)}</Field>
          <Field label="Regular">{money(offer.regularPriceMinor)}</Field>
          <Field label="Confidence">{percent(item.confidence)}</Field>
        </div>
        <div className="promotion-text">{offer.promotionText ?? 'No promotion text captured'}{offer.multiBuyText ? ` · ${offer.multiBuyText}` : ''}</div>
        <div className="candidate-tools">
          <select value={selectedVariant} onChange={event => setSelectedVariant(event.target.value)}>
            <option value="">Select canonical product</option>
            {(item.candidateMatches ?? []).map((candidate: AnyRecord) => (
              <option value={candidate.variantId} key={candidate.variantId}>{candidate.productName} · {candidate.quantity} {candidate.unit}</option>
            ))}
            {(products?.products ?? []).flatMap(product => product.variants.map((variant: AnyRecord) => (
              <option value={variant.id} key={variant.id}>{product.name} · {variant.quantity} {variant.unit}</option>
            )))}
          </select>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search canonical products" />
          <input value={rejectReason} onChange={event => setRejectReason(event.target.value)} placeholder="Rejection reason" />
        </div>
        <div className="actions">
          <button disabled={Boolean(busy)} onClick={() => run('Approve', () => adminPost(`/admin/reviews/${item.id}/approve`))}>Approve</button>
          <button disabled={Boolean(busy) || !selectedVariant} onClick={() => run('Match', () => adminPost(`/admin/reviews/${item.id}/match`, { variantId: selectedVariant }))}>Match</button>
          <button className="danger" disabled={Boolean(busy) || rejectReason.trim().length < 3} onClick={() => run('Reject', () => adminPost(`/admin/reviews/${item.id}/reject`, { reason: rejectReason }))}>Reject</button>
          {message ? <span className="message">{message}</span> : null}
        </div>
        <div className="event-log">
          <h3>Review History</h3>
          {(item.events ?? []).map((event: AnyRecord) => (
            <div key={event.id} className="event-row">
              <strong>{event.action}</strong>
              <span>{event.actor?.displayName ?? event.actor?.email ?? 'system'} · {dateTime(event.createdAt)}</span>
              {event.note ? <p>{event.note}</p> : null}
            </div>
          ))}
        </div>
      </div>
      <aside className="preview">
        <h3>Source Preview</h3>
        <div className="preview-box">
          <strong>{brochure.originalFilename ?? brochure.sourceIdentifier}</strong>
          <span>Page {offer.page?.pageNumber ?? '-'}</span>
          <span>{offer.sourceLocation ?? 'No source location'}</span>
          {offer.page?.imageRef ? <img src={offer.page.imageRef} alt="Brochure page preview" /> : <p>Rendered page image not available. Use filename and page reference for manual verification.</p>}
        </div>
        <pre>{JSON.stringify(offer.rawExtraction, null, 2)}</pre>
      </aside>
    </article>
  );
}

export function IngestionRunsView() {
  const { data, error } = useAdminData<{ ingestionRuns: AnyRecord[]; extractionRuns: AnyRecord[] }>('/admin/ingestion-runs');
  return <SimplePage title="Ingestion Runs" data={data} error={error} rows={state => [
    ...state.ingestionRuns.map(run => ({ Type: 'Price', Source: run.source, Status: <Badge tone={statusTone(run.status)}>{run.status}</Badge>,
      Started: dateTime(run.startedAt), Completed: dateTime(run.finishedAt), Processed: run.processedCount, Accepted: run.successCount,
      Review: '-', Unmatched: run.unmatchedCount, Duplicates: run.duplicatesSkippedCount, Failures: run.failureCount,
      Promotions: run.promotionsCreatedCount })),
    ...state.extractionRuns.map(run => ({ Type: 'Brochure', Source: run.brochure.source, Status: <Badge tone={statusTone(run.status)}>{run.status}</Badge>,
      Started: dateTime(run.startedAt), Completed: dateTime(run.finishedAt), Processed: run.processedCount, Accepted: run.successCount,
      Review: run.reviewCount, Unmatched: '-', Duplicates: run.duplicateCount, Failures: run.failureCount, Promotions: '-' })),
  ]} />;
}

export function DataSourcesView() {
  const [refresh, setRefresh] = useState(0);
  const { data, error } = useAdminData<{ dataSources: AnyRecord[]; queue: AnyRecord }>('/admin/data-sources', refresh);
  const { busy, message, run } = useOperationMessage();
  async function action(source: AnyRecord, operation: 'run' | 'pause' | 'resume') {
    await run(async () => {
      await adminPost(`/admin/data-sources/${source.id}/${operation}`);
      setRefresh(value => value + 1);
    }, operation === 'run' ? 'Run queued' : 'Saved');
  }
  return (
    <>
      <PageHeader title="Data Sources" subtitle="Scheduled ingestion, freshness, job health and internal operational warnings." />
      <DataState data={data} error={error}>{state => (
        <>
          <section className="metric-grid">
            <div className="metric"><span>failed jobs</span><strong>{state.queue.counts.failed}</strong></div>
            <div className="metric"><span>delayed jobs</span><strong>{state.queue.counts.delayed}</strong></div>
            <div className="metric"><span>waiting jobs</span><strong>{state.queue.counts.waiting}</strong></div>
            <div className="metric"><span>active jobs</span><strong>{state.queue.counts.active}</strong></div>
          </section>
          <Rows rows={state.dataSources.map(source => ({
            Source: <div><strong>{source.name}</strong><br /><span>{source.slug}</span></div>,
            Owner: <div>{source.owner ?? '-'}<br /><span>{source.ownerContact ?? '-'}</span></div>,
            Connector: source.connectorType,
            Onboarding: <Badge tone={statusTone(source.onboardingStatus)}>{source.onboardingStatus}</Badge>,
            Authorization: <Badge tone={statusTone(source.authorizationStatus)}>{source.authorizationStatus}</Badge>,
            Commercial: source.fictional ? 'fixture' : source.permittedCommercialUse ? 'permitted' : 'not permitted',
            Retention: source.allowedDataRetentionDays ? `${source.allowedDataRetentionDays} days` : '-',
            Approval: source.approvalEvents?.[0] ? `${source.approvalEvents[0].toStatus} · ${source.approvalEvents[0].actor?.email ?? 'system'}` : '-',
            Status: <Badge tone={statusTone(source.operationalStatus)}>{source.operationalStatus}</Badge>,
            Schedule: source.enabled && source.scheduleEveryMs ? `${Math.round(source.scheduleEveryMs / 1000)}s` : 'off',
            Freshness: `${source.freshness.freshObservations} fresh / ${source.freshness.staleObservations} stale`,
            Backlog: source.freshness.unmatchedRows,
            LastSuccess: dateTime(source.lastSuccessfulRunAt),
            LastRun: source.lastRunStatus ? <Badge tone={statusTone(source.lastRunStatus)}>{source.lastRunStatus}</Badge> : '-',
            Failures: source.lastFailureMessage ?? source.operationalAlerts?.[0]?.message ?? '-',
            Actions: <div className="inline-editor">
              <button disabled={busy || source.authorizationStatus === 'UNVERIFIED' || source.authorizationStatus === 'RESTRICTED'}
                onClick={() => action(source, 'run')}>Run</button>
              <button disabled={busy || !source.enabled} onClick={() => action(source, 'pause')}>Pause</button>
              <button disabled={busy || source.enabled || (source.authorizationStatus !== 'AUTHORIZED' && source.authorizationStatus !== 'PUBLIC_DATA')}
                onClick={() => action(source, 'resume')}>Resume</button>
            </div>,
          }))} />
          {message ? <p className="message">{message}</p> : null}
          <section className="split">
            <div>
              <h2>Failed Jobs</h2>
              <Rows rows={(state.queue.failed ?? []).map((job: AnyRecord) => ({
                Job: job.id, Source: job.sourceId, Attempts: job.attemptsMade, Reason: job.failedReason ?? '-',
              }))} />
            </div>
            <div>
              <h2>Delayed Jobs</h2>
              <Rows rows={(state.queue.delayed ?? []).map((job: AnyRecord) => ({
                Job: job.id, Source: job.sourceId, Attempts: job.attemptsMade, Delay: job.delay,
              }))} />
            </div>
          </section>
        </>
      )}</DataState>
    </>
  );
}

function SimplePage<T>({ title, data, error, rows }: { title: string; data: T | null; error: string | null; rows: (data: T) => Array<Record<string, React.ReactNode>> }) {
  return <><PageHeader title={title} /><DataState data={data} error={error}>{state => <Rows rows={rows(state)} />}</DataState></>;
}

export function BrochuresView() {
  const [refresh, setRefresh] = useState(0);
  const { data, error } = useAdminData<{ brochures: AnyRecord[] }>('/admin/brochures', refresh);
  return <SimplePage title="Brochures" data={data} error={error} rows={state => state.brochures.map(item => ({
    Retailer: item.chain.name, Source: item.source, Authorization: <Badge tone={statusTone(item.sourceAuthorizationStatus)}>{item.sourceAuthorizationStatus}</Badge>,
    Usage: item.allowedUsage ?? '-', Owner: item.sourceOwner ?? '-',
    Status: <Badge tone={statusTone(item.status)}>{item.status}</Badge>, Filename: item.originalFilename, Valid: `${dateTime(item.validFrom)} - ${dateTime(item.validTo)}`,
    Imported: dateTime(item.importedAt), Offers: item._count.offers,
    Review: <SourceAuthorizationEditor brochure={item} onChanged={() => setRefresh(value => value + 1)} />,
  }))} />;
}

function SourceAuthorizationEditor({ brochure, onChanged }: { brochure: AnyRecord; onChanged: () => void }) {
  const [status, setStatus] = useState(brochure.sourceAuthorizationStatus);
  const [reason, setReason] = useState('');
  const [allowedUsage, setAllowedUsage] = useState(brochure.allowedUsage ?? '');
  const [sourceOwner, setSourceOwner] = useState(brochure.sourceOwner ?? '');
  const { busy, message, run } = useOperationMessage();
  return (
    <div className="inline-editor">
      <select value={status} onChange={event => setStatus(event.target.value)}>
        {['AUTHORIZED', 'PUBLIC_DATA', 'MANUAL_UPLOAD', 'UNVERIFIED', 'RESTRICTED'].map(value => <option key={value} value={value}>{value}</option>)}
      </select>
      <input value={sourceOwner} onChange={event => setSourceOwner(event.target.value)} placeholder="Owner" />
      <input value={allowedUsage} onChange={event => setAllowedUsage(event.target.value)} placeholder="Allowed usage" />
      <input value={reason} onChange={event => setReason(event.target.value)} placeholder="Change reason" />
      <button disabled={busy || reason.trim().length < 3} onClick={() => run(async () => {
        await adminPut(`/admin/brochures/${brochure.id}/source-authorization`, {
          status, sourceOwner: sourceOwner || undefined, allowedUsage: allowedUsage || undefined, reason,
        });
        onChanged();
      })}>Save</button>
      {message ? <span className="message">{message}</span> : null}
    </div>
  );
}

export function ProductsView() {
  const [search, setSearch] = useState('');
  const { data, error } = useAdminData<{ products: AnyRecord[] }>(`/admin/products${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  return <><PageHeader title="Products" /><section className="filters"><FilterInput value={search} onChange={setSearch} placeholder="Search product, EAN, brand or category" /></section>
    <SimplePage title="" data={data} error={error} rows={state => state.products.map(item => ({
      Product: item.name, EAN: item.ean ?? '-', Brand: item.brand?.name ?? '-', Category: item.category.name,
      Variants: item.variants.map((variant: AnyRecord) => `${variant.quantity} ${variant.unit}`).join(', '),
      Guardrail: <DestructiveDeleteProbe productId={item.id} />,
    }))} /></>;
}

function DestructiveDeleteProbe({ productId }: { productId: string }) {
  const [reason, setReason] = useState('');
  const { busy, message, run } = useOperationMessage();
  return (
    <div className="inline-editor">
      <input value={reason} onChange={event => setReason(event.target.value)} placeholder="Deletion attempt reason" />
      <button className="danger" disabled={busy || reason.trim().length < 3} onClick={() => run(() =>
        adminPost(`/admin/products/${productId}/destructive-delete`, { confirmation: 'delete requested from admin dashboard', reason }),
      'Blocked and audited')}>Test delete guard</button>
      {message ? <span className="message">{message}</span> : null}
    </div>
  );
}

export function RetailerProductsView() {
  const { data, error } = useAdminData<{ retailerProducts: AnyRecord[] }>('/admin/retailer-products');
  return <SimplePage title="Retailer Products" data={data} error={error} rows={state => state.retailerProducts.map(item => ({
    Retailer: item.chain.name, Raw: item.rawName, EAN: item.ean ?? '-', Canonical: item.variant?.product.name ?? '-',
    Confidence: percent(item.matchConfidence), Review: <Badge tone={statusTone(item.reviewState)}>{item.reviewState}</Badge>, Observations: item._count.observations,
  }))} />;
}

export function PricesView() {
  const { data, error } = useAdminData<{ prices: AnyRecord[] }>('/admin/prices');
  return <SimplePage title="Prices" data={data} error={error} rows={state => state.prices.map(item => ({
    Product: item.retailerProduct.variant?.product.name ?? item.retailerProduct.rawName, Retailer: item.retailerProduct.chain.name,
    Branch: item.branch?.name ?? 'online', Price: money(item.priceMinor, item.currency), Regular: money(item.regularPriceMinor, item.currency),
    Observed: dateTime(item.observedAt), Source: item.sourceType, Authorization: <Badge tone={statusTone(item.sourceAuthorizationStatus)}>{item.sourceAuthorizationStatus}</Badge>,
    Verification: <Badge tone={statusTone(item.verificationStatus)}>{item.verificationStatus}</Badge>, Brochure: item.brochureOffer?.brochure?.originalFilename ?? '-',
  }))} />;
}

export function PromotionsView() {
  const { data, error } = useAdminData<{ promotions: AnyRecord[] }>('/admin/promotions');
  return <SimplePage title="Promotions" data={data} error={error} rows={state => state.promotions.map(item => ({
    Title: item.title, Retailer: item.chain.name, Product: item.retailerProduct?.variant?.product.name ?? item.retailerProduct?.rawName ?? '-',
    Valid: `${dateTime(item.startsAt)} - ${dateTime(item.endsAt)}`, Loyalty: item.loyaltyRequired ? 'yes' : 'no',
    Conditions: item.conditions.map((condition: AnyRecord) => condition.kind).join(', ') || '-', Source: item.brochureOffer?.brochure?.source ?? '-',
  }))} />;
}

export function DealsView() {
  const { data, error } = useAdminData<{ deals: AnyRecord[] }>('/admin/deals');
  return <SimplePage title="Deals" data={data} error={error} rows={state => state.deals.map(item => ({
    Product: item.productName, Retailer: item.retailerName, Price: money(item.currentPriceMinor, item.currency),
    Score: item.score, Label: <Badge tone={statusTone(item.label)}>{item.label}</Badge>, Status: <Badge tone={statusTone(item.status)}>{item.status}</Badge>, Evaluated: dateTime(item.evaluatedAt),
  }))} />;
}

export function AlertsView() {
  const { data, error } = useAdminData<{ alerts: AnyRecord[] }>('/admin/alerts');
  return <SimplePage title="Alerts" data={data} error={error} rows={state => state.alerts.map(item => ({
    Need: item.need.title, Deal: item.deal.productName, Retailer: item.deal.retailerName,
    Notification: item.notification ? 'created' : 'missing', Created: dateTime(item.createdAt),
  }))} />;
}

export function NotificationsView() {
  const { data, error } = useAdminData<{ notifications: AnyRecord[] }>('/admin/notifications');
  return <SimplePage title="Notifications" data={data} error={error} rows={state => state.notifications.map(item => ({
    Title: item.title, Body: item.body, Deal: item.alert.deal.productName, Need: item.alert.need.title,
    Created: dateTime(item.createdAt), Read: dateTime(item.readAt),
  }))} />;
}

export function AuditLogsView() {
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const query = new URLSearchParams();
  if (entityType) query.set('entityType', entityType);
  if (entityId) query.set('entityId', entityId);
  const { data, error } = useAdminData<{ auditLogs: AnyRecord[] }>(`/admin/audit-logs?${query.toString()}`);
  return <><PageHeader title="Audit Logs" subtitle="Admin sign-ins, review decisions, source policy edits and blocked destructive actions." />
    <section className="filters">
      <FilterInput value={entityType} onChange={setEntityType} placeholder="Entity type" />
      <FilterInput value={entityId} onChange={setEntityId} placeholder="Entity id" />
    </section>
    <SimplePage title="" data={data} error={error} rows={state => state.auditLogs.map(item => ({
      Action: item.action, Actor: item.actor?.displayName ?? item.actor?.email ?? 'system',
      Entity: `${item.entityType}:${item.entityId}`, Reason: item.reason ?? '-', Created: dateTime(item.createdAt),
    }))} /></>;
}
