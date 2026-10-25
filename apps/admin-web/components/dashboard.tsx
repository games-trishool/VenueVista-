'use client';

import { useCallback, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileCheck2,
  ImageIcon,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { adminRequest, formatDate, formatDateTime, formatMoney, humanize } from '@/lib/client';
import type { Audit, Organization, Overview, Page, User, Venue } from '@/lib/types';

type Section = 'overview' | 'venues' | 'owners' | 'users' | 'audit';
const navigation = [
  { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
  { id: 'venues' as const, label: 'Venue review', icon: Building2 },
  { id: 'owners' as const, label: 'Partner verification', icon: FileCheck2 },
  { id: 'users' as const, label: 'People', icon: Users },
  { id: 'audit' as const, label: 'Audit trail', icon: Activity },
];
const titles: Record<Section, [string, string]> = {
  overview: [
    'A place for every celebration.',
    'Your platform at a glance. A little care here goes a long way.',
  ],
  venues: [
    'Good spaces. Great standards.',
    'Review every detail before a venue joins the collection.',
  ],
  owners: [
    'Meet the people behind the places.',
    'Verify partner businesses before their venues go live.',
  ],
  users: ['A growing community.', 'A secure, read-only view of the people using VenueVista.'],
  audit: ['Every decision, accounted for.', 'A permanent record of important platform actions.'],
};

function useResource<T>(path: string, revision = 0) {
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: string }>({
    loading: true,
  });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    adminRequest<T>(path, { signal: controller.signal })
      .then((data) => setState({ data, loading: false }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ loading: false, error: error.message || 'Unable to load data.' });
      });
    return () => controller.abort();
  }, [path, revision, retry]);
  return { ...state, retry: () => setRetry((value) => value + 1) };
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="empty-state error-state" role="alert">
      <span className="empty-icon">
        <CircleAlert size={27} />
      </span>
      <h3>We couldn’t load this view</h3>
      <p>{message}</p>
      <button className="button button-secondary" onClick={retry}>
        <RefreshCw size={15} />
        Try again
      </button>
    </div>
  );
}
function EmptyState({
  title,
  description,
  icon: Icon = Building2,
}: {
  title: string;
  description: string;
  icon?: typeof Building2;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={28} strokeWidth={1.5} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-list" role="status" aria-label="Loading data">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton-row">
          <span className="skeleton skeleton-square" />
          <div>
            <span className="skeleton skeleton-line" />
            <span className="skeleton skeleton-line short" />
          </div>
          <span className="skeleton skeleton-pill" />
        </div>
      ))}
    </div>
  );
}
function Badge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'badge',
        status === 'APPROVED' || status === 'ACTIVE' || status === 'VERIFIED'
          ? 'badge-green'
          : status === 'PENDING' || status === 'DRAFT'
            ? 'badge-gold'
            : status === 'REJECTED' || status === 'SUSPENDED'
              ? 'badge-red'
              : 'badge-muted',
      )}
    >
      <span />
      {humanize(status)}
    </span>
  );
}
function Pagination({
  page,
  total,
  limit,
  change,
}: {
  page: number;
  total: number;
  limit: number;
  change: (page: number) => void;
}) {
  if (!total) return null;
  return (
    <div className="pagination">
      <span>
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString('en-IN')}
      </span>
      <div>
        <button
          aria-label="Previous page"
          className="icon-button"
          disabled={page <= 1}
          onClick={() => change(page - 1)}
        >
          <ChevronLeft size={17} />
        </button>
        <span>Page {page}</span>
        <button
          aria-label="Next page"
          className="icon-button"
          disabled={page * limit >= total}
          onClick={() => change(page + 1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

export default function Dashboard({ user }: { user: { displayName: string; role: string } }) {
  const [section, setSection] = useState<Section>('overview');
  const [revision, setRevision] = useState(0);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const overview = useResource<Overview>('overview', revision);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const navigate = (next: Section) => {
    setSection(next);
    setMobileMenu(false);
    setNotice('');
  };

  async function logout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Unable to sign out.');
      window.location.assign('/login');
    } catch {
      setNotice('Sign-out could not reach the server. Please retry.');
    }
  }

  return (
    <div className="console-shell">
      {mobileMenu && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className={clsx('sidebar', mobileMenu && 'sidebar-open')}>
        <a className="brand" href="/" aria-label="VenueVista console home">
          <span className="brand-mark">
            <Building2 size={23} />
          </span>
          <span>
            venue<span className="brand-light">vista</span>
            <small>PLATFORM CONSOLE</small>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-symbol">VV</span>
          <div>
            <strong>VenueVista India</strong>
            <small>Platform operations</small>
          </div>
          <ShieldCheck size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Console navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={clsx('nav-item', section === id && 'nav-item-active')}
              onClick={() => navigate(id)}
              aria-current={section === id ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={1.65} />
              <span>{label}</span>
              {id === 'venues' && !!overview.data?.pendingApprovals && (
                <span className="nav-count">{overview.data.pendingApprovals}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="standards-card">
            <ShieldCheck size={23} />
            <strong>Trust is in the details.</strong>
            <p>Every approved listing makes the next celebration a little more certain.</p>
          </div>
          <div className="region-label">
            <span className="status-dot" />
            India · AP & Telangana
          </div>
          <button className="nav-item signout" onClick={logout}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="console-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{navigation.find((item) => item.id === section)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="secure-indicator">
              <ShieldCheck size={14} />
              Secure console
            </span>
            <span className="topbar-divider" />
            <div className="admin-identity">
              <span className="avatar">{user.displayName.charAt(0).toUpperCase()}</span>
              <div>
                <strong>{user.displayName}</strong>
                <small>Super administrator</small>
              </div>
            </div>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">VENUEVISTA OPERATIONS</div>
              <h1>{titles[section][0]}</h1>
              <p>{titles[section][1]}</p>
            </div>
            <button
              className="button button-secondary refresh-button"
              onClick={refresh}
              title="Refresh current data"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
          {notice && (
            <div className="alert alert-error" role="alert">
              {notice}
            </div>
          )}
          {section === 'overview' && (
            <OverviewSection
              resource={overview}
              revision={revision}
              navigate={navigate}
              selectVenue={setSelectedVenue}
            />
          )}
          {section === 'venues' && (
            <VenuesSection revision={revision} selectVenue={setSelectedVenue} />
          )}
          {section === 'owners' && <OwnersSection revision={revision} refresh={refresh} />}
          {section === 'users' && <UsersSection revision={revision} />}
          {section === 'audit' && <AuditSection revision={revision} />}
          <footer className="console-footer">
            <span>© VenueVista · Thoughtfully curated.</span>
            <span>
              <span className="status-dot" />
              Data from the platform API
            </span>
          </footer>
        </div>
      </main>
      <VenueReview
        id={selectedVenue}
        close={() => setSelectedVenue(null)}
        changed={() => {
          refresh();
          setSelectedVenue(null);
        }}
      />
    </div>
  );
}

function OverviewSection({
  resource,
  revision,
  navigate,
  selectVenue,
}: {
  resource: ReturnType<typeof useResource<Overview>>;
  revision: number;
  navigate: (section: Section) => void;
  selectVenue: (id: string) => void;
}) {
  const pending = useResource<Page<Venue>>('venues?status=PENDING&page=1&limit=4', revision);
  const audit = useResource<Page<Audit>>('audit?page=1&limit=5', revision);
  const data = resource.data;
  const metrics = [
    {
      label: 'TOTAL VENUES',
      value: data?.totalVenues,
      detail: `${data?.activeListings ?? '—'} approved listings`,
      icon: Building2,
      color: 'purple',
    },
    {
      label: 'AWAITING REVIEW',
      value: data?.pendingApprovals,
      detail: 'Your attention makes a difference',
      icon: Clock3,
      color: 'gold',
    },
    {
      label: 'CUSTOMER ENQUIRIES',
      value: data?.totalEnquiries,
      detail: `${data?.confirmedBookings ?? '—'} confirmed bookings`,
      icon: MessageSquare,
      color: 'green',
    },
    {
      label: 'VENUE PARTNERS',
      value: data?.totalOwners,
      detail: `${data?.totalCustomers ?? '—'} registered customers`,
      icon: Users,
      color: 'blue',
    },
  ];
  return (
    <>
      {resource.error ? (
        <ErrorState message={resource.error} retry={resource.retry} />
      ) : (
        <div className="metric-grid">
          {metrics.map(({ label, value, detail, icon: Icon, color }) => (
            <article className="metric-card" key={label}>
              <div className="metric-top">
                <span>{label}</span>
                <span className={`metric-icon ${color}`}>
                  <Icon size={19} strokeWidth={1.7} />
                </span>
              </div>
              <strong>
                {value === undefined ? (
                  <span className="skeleton metric-skeleton" />
                ) : (
                  value.toLocaleString('en-IN')
                )}
              </strong>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      )}
      <div className="overview-grid">
        <section className="panel review-panel">
          <div className="panel-header">
            <div>
              <div className="section-kicker">
                <span className="gold-dot" />
                THE REVIEW QUEUE
              </div>
              <h2>Places waiting to be discovered</h2>
            </div>
            <button className="text-button" onClick={() => navigate('venues')}>
              View all
              <ArrowRight size={16} />
            </button>
          </div>
          {pending.loading ? (
            <Loading />
          ) : pending.error ? (
            <ErrorState message={pending.error} retry={pending.retry} />
          ) : pending.data?.items.length ? (
            <div className="queue-list">
              {pending.data.items.map((venue) => (
                <button className="queue-item" key={venue.id} onClick={() => selectVenue(venue.id)}>
                  <VenueThumbnail venue={venue} />
                  <div className="queue-info">
                    <h3>{venue.name}</h3>
                    <p>
                      <MapPin size={12} />
                      {venue.locality ? `${venue.locality}, ` : ''}
                      {venue.city}
                    </p>
                    <div>
                      <span>{humanize(venue.category)}</span>
                      <span>·</span>
                      <span>{venue.seatingCapacity.toLocaleString('en-IN')} seats</span>
                    </div>
                  </div>
                  <div className="queue-end">
                    <Badge status={venue.status} />
                    <span>
                      Review venue <ArrowUpRight size={14} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="You’re all caught up"
              description="New venue submissions will appear here for a thoughtful review before they go live."
              icon={CheckCheck}
            />
          )}
        </section>
        <section className="panel activity-panel">
          <div className="panel-header">
            <div>
              <div className="section-kicker">PLATFORM ACTIVITY</div>
              <h2>The latest decisions</h2>
            </div>
            <Activity size={19} className="muted" />
          </div>
          {audit.loading ? (
            <Loading rows={3} />
          ) : audit.error ? (
            <ErrorState message={audit.error} retry={audit.retry} />
          ) : audit.data?.items.length ? (
            <div className="activity-list">
              {audit.data.items.map((item) => (
                <div className="activity-item" key={item.id}>
                  <span className="activity-dot">
                    <ClipboardCheck size={14} />
                  </span>
                  <div>
                    <strong>{humanize(item.action)}</strong>
                    <p>
                      {item.entityType || item.targetType || 'Platform'}
                      {item.entityId || item.targetId
                        ? ` · ${(item.entityId || item.targetId)!.slice(0, 8)}`
                        : ''}
                    </p>
                    <time>{formatDateTime(item.createdAt)} IST</time>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="A fresh start"
              description="Review decisions and other important actions are recorded here automatically."
              icon={Activity}
            />
          )}
          <button className="panel-bottom-link" onClick={() => navigate('audit')}>
            Open audit trail
            <ArrowRight size={15} />
          </button>
        </section>
      </div>
      <section className="mission-banner">
        <div className="mission-icon">
          <Sparkles size={28} strokeWidth={1.3} />
        </div>
        <div>
          <span className="section-kicker">CURATION OVER COMPROMISE</span>
          <h2>Beautiful celebrations begin with trusted places.</h2>
          <p>Check the photos. Verify the details. Make every approval count.</p>
        </div>
        <span className="mission-line" aria-hidden="true" />
        <ShieldCheck size={50} strokeWidth={1} />
      </section>
    </>
  );
}

function VenueThumbnail({ venue }: { venue: Venue }) {
  const media = venue.media?.find((item) => item.isCover) || venue.media?.[0];
  return (
    <span className="venue-thumbnail">
      {media ? (
        <img src={`/api/media/${media.id}`} alt="" loading="lazy" />
      ) : (
        <Building2 size={25} strokeWidth={1.3} />
      )}
    </span>
  );
}

function VenuesSection({
  revision,
  selectVenue,
}: {
  revision: number;
  selectVenue: (id: string) => void;
}) {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [committedQuery, setCommittedQuery] = useState('');
  const resource = useResource<Page<Venue>>(
    `venues?page=${page}&limit=10${status ? `&status=${status}` : ''}${committedQuery ? `&q=${encodeURIComponent(committedQuery)}` : ''}`,
    revision,
  );
  return (
    <section className="panel">
      <div className="listing-toolbar">
        <div className="segmented" aria-label="Venue status filter">
          {[
            ['PENDING', 'Pending review'],
            ['APPROVED', 'Approved'],
            ['REJECTED', 'Rejected'],
            ['', 'All venues'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              className={status === value ? 'selected' : ''}
              aria-pressed={status === value}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          className="search-field"
          onSubmit={(event) => {
            event.preventDefault();
            setCommittedQuery(query.trim());
            setPage(1);
          }}
        >
          <Search size={16} />
          <input
            aria-label="Search venue name or city"
            placeholder="Search venue or city…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="icon-button" type="submit" aria-label="Search">
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
      {resource.loading ? (
        <Loading rows={5} />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.retry} />
      ) : resource.data?.items.length ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>VENUE</th>
                  <th>LOCATION</th>
                  <th>CAPACITY</th>
                  <th>STARTING RENTAL</th>
                  <th>STATUS</th>
                  <th>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((venue) => (
                  <tr key={venue.id}>
                    <td>
                      <button className="table-venue" onClick={() => selectVenue(venue.id)}>
                        <VenueThumbnail venue={venue} />
                        <span>
                          <strong>
                            {venue.name}
                            {venue.featured && (
                              <Star size={12} className="featured-star" fill="currentColor" />
                            )}
                          </strong>
                          <small>{humanize(venue.category)}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <strong className="cell-title">{venue.city}</strong>
                      <small className="cell-subtitle">{venue.locality || venue.state}</small>
                    </td>
                    <td>
                      <strong className="cell-title">
                        {venue.seatingCapacity.toLocaleString('en-IN')}
                      </strong>
                      <small className="cell-subtitle">seated guests</small>
                    </td>
                    <td>
                      <strong className="cell-title">{formatMoney(venue.rentalPricePaise)}</strong>
                      <small className="cell-subtitle">starting price</small>
                    </td>
                    <td>
                      <Badge status={venue.status} />
                    </td>
                    <td>
                      <button className="table-action" onClick={() => selectVenue(venue.id)}>
                        Review
                        <ArrowUpRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={resource.data.total} limit={10} change={setPage} />
        </>
      ) : (
        <EmptyState
          title={
            committedQuery
              ? 'No matching places'
              : status === 'PENDING'
                ? 'The review queue is clear'
                : 'No venues in this collection yet'
          }
          description={
            committedQuery
              ? 'Try another venue name or city.'
              : 'Listings will appear here when partners submit them and their status matches this view.'
          }
          icon={status === 'PENDING' ? CheckCheck : Building2}
        />
      )}
    </section>
  );
}

function OwnersSection({ revision, refresh }: { revision: number; refresh: () => void }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('PENDING');
  const resource = useResource<Page<Organization>>(
    `organizations?page=${page}&limit=10${status ? `&status=${status}` : ''}`,
    revision,
  );
  const [selected, setSelected] = useState<{
    organization: Organization;
    decision: 'APPROVED' | 'REJECTED';
  } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function review(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await adminRequest(`organizations/${selected.organization.id}/review`, {
        method: 'POST',
        body: { decision: selected.decision, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      });
      setSelected(null);
      setReason('');
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this decision.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="panel">
        <div className="listing-toolbar">
          <h2>Partner businesses</h2>
          <select
            aria-label="Filter verification status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="PENDING">Pending verification</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All partners</option>
          </select>
        </div>
        {resource.loading ? (
          <Loading rows={4} />
        ) : resource.error ? (
          <ErrorState message={resource.error} retry={resource.retry} />
        ) : resource.data?.items.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>BUSINESS</th>
                    <th>CONTACT</th>
                    <th>APPLICATION</th>
                    <th>STATUS</th>
                    <th>DECISION</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.items.map((organization) => (
                    <tr key={organization.id}>
                      <td>
                        <strong className="cell-title">{organization.name}</strong>
                        <small className="cell-subtitle">
                          {organization.legalName ||
                            organization.registrationNumber ||
                            'Business profile'}
                        </small>
                        {organization.address && (
                          <small className="cell-subtitle">{organization.address}</small>
                        )}
                      </td>
                      <td>
                        <strong className="cell-title">
                          {organization.owner?.displayName || 'Partner'}
                        </strong>
                        <small className="cell-subtitle">
                          {organization.phone || organization.owner?.phone || 'Not provided'}
                        </small>
                      </td>
                      <td>{formatDate(organization.createdAt)}</td>
                      <td>
                        <Badge status={organization.status} />
                      </td>
                      <td>
                        {organization.status === 'PENDING' ? (
                          <div className="inline-actions">
                            <button
                              className="button button-small button-secondary"
                              onClick={() => {
                                setSelected({ organization, decision: 'APPROVED' });
                                setReason('');
                                setError('');
                              }}
                            >
                              <Check size={14} />
                              Approve
                            </button>
                            <button
                              className="button button-small button-ghost danger-text"
                              onClick={() => {
                                setSelected({ organization, decision: 'REJECTED' });
                                setReason('');
                                setError('');
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="muted">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={resource.data.total} limit={10} change={setPage} />
          </>
        ) : (
          <EmptyState
            title="No partner applications here"
            description="Business profiles matching this verification status will appear here."
            icon={FileCheck2}
          />
        )}
      </section>
      <Dialog.Root
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="confirmation-dialog">
            <Dialog.Title>
              {selected?.decision === 'APPROVED'
                ? 'Approve this partner?'
                : 'Reject this application?'}
            </Dialog.Title>
            <Dialog.Description>
              Record a verification decision for {selected?.organization.name}. This action is
              recorded in the audit trail.
            </Dialog.Description>
            <form className="form-stack" onSubmit={review}>
              <label>
                {selected?.decision === 'REJECTED' ? 'Rejection reason' : 'Review note (optional)'}
                <textarea
                  required={selected?.decision === 'REJECTED'}
                  minLength={selected?.decision === 'REJECTED' ? 5 : undefined}
                  maxLength={2000}
                  rows={4}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explain your decision clearly to the partner."
                />
              </label>
              {error && (
                <div className="alert alert-error" role="alert">
                  {error}
                </div>
              )}
              <div className="dialog-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setSelected(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button className="button button-primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Confirm decision'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function UsersSection({ revision }: { revision: number }) {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('CUSTOMER');
  const resource = useResource<Page<User>>(`users?role=${role}&page=${page}&limit=10`, revision);
  return (
    <section className="panel">
      <div className="listing-toolbar">
        <h2>Platform accounts</h2>
        <div className="segmented">
          {['CUSTOMER', 'OWNER', 'ADMIN'].map((value) => (
            <button
              className={role === value ? 'selected' : ''}
              key={value}
              onClick={() => {
                setRole(value);
                setPage(1);
              }}
              aria-pressed={role === value}
            >
              {humanize(value)}s
            </button>
          ))}
        </div>
      </div>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.retry} />
      ) : resource.data?.items.length ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ACCOUNT</th>
                  <th>PHONE</th>
                  <th>ROLE</th>
                  <th>JOINED</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <div className="person-cell">
                        <span className="avatar avatar-muted">
                          {(person.displayName || 'U').charAt(0).toUpperCase()}
                        </span>
                        <span>
                          <strong className="cell-title">
                            {person.displayName || 'Unnamed account'}
                          </strong>
                          <small className="cell-subtitle">{person.id.slice(0, 8)}</small>
                        </span>
                      </div>
                    </td>
                    <td>{person.phone || 'Not provided'}</td>
                    <td>{humanize(person.role)}</td>
                    <td>{formatDate(person.createdAt)}</td>
                    <td>
                      <Badge status={person.status || 'ACTIVE'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={resource.data.total} limit={10} change={setPage} />
        </>
      ) : (
        <EmptyState
          title="No accounts in this group"
          description="Registered accounts will appear here. Account data is restricted to authorised administrators."
          icon={Users}
        />
      )}
    </section>
  );
}

function AuditSection({ revision }: { revision: number }) {
  const [page, setPage] = useState(1);
  const resource = useResource<Page<Audit>>(`audit?page=${page}&limit=15`, revision);
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Platform audit trail</h2>
          <p className="muted">Timestamps shown in India Standard Time.</p>
        </div>
        <span className="badge badge-muted">
          <ShieldCheck size={13} />
          READ ONLY
        </span>
      </div>
      {resource.loading ? (
        <Loading rows={5} />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.retry} />
      ) : resource.data?.items.length ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ACTION</th>
                  <th>RESOURCE</th>
                  <th>ACTOR</th>
                  <th>REASON</th>
                  <th>WHEN · IST</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong className="cell-title">{humanize(entry.action)}</strong>
                    </td>
                    <td>
                      <strong className="cell-title">
                        {entry.entityType || entry.targetType || 'Platform'}
                      </strong>
                      <small className="cell-subtitle monospace">
                        {entry.entityId || entry.targetId || '—'}
                      </small>
                    </td>
                    <td className="monospace">{entry.actorId?.slice(0, 8) || 'System'}</td>
                    <td className="audit-reason">
                      {entry.reason ||
                        (typeof entry.metadata?.reason === 'string' ? entry.metadata.reason : '—')}
                    </td>
                    <td className="no-wrap">{formatDateTime(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={resource.data.total} limit={15} change={setPage} />
        </>
      ) : (
        <EmptyState
          title="The trail starts here"
          description="Moderation and verification decisions will be saved automatically. Audit records cannot be edited here."
          icon={Activity}
        />
      )}
    </section>
  );
}

function VenueReview({
  id,
  close,
  changed,
}: {
  id: string | null;
  close: () => void;
  changed: () => void;
}) {
  return (
    <Dialog.Root
      open={!!id}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="review-dialog">
          <Dialog.Title className="sr-only">Venue review</Dialog.Title>
          <Dialog.Description className="sr-only">
            Inspect the listing details and record a moderation decision.
          </Dialog.Description>
          <Dialog.Close className="icon-button dialog-close" aria-label="Close review">
            <X size={20} />
          </Dialog.Close>
          {id && <VenueReviewContents id={id} changed={changed} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function VenueReviewContents({ id, changed }: { id: string; changed: () => void }) {
  const resource = useResource<Venue>(`venues/${id}`);
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<'APPROVED' | 'REJECTED' | 'SUSPENDED' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(0);

  async function perform(decision: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'FEATURE') {
    if (!resource.data) return;
    if (decision !== 'FEATURE' && decision !== 'APPROVED' && reason.trim().length < 5) {
      setError('Please provide a clear reason of at least 5 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const target =
        decision === 'FEATURE' ? 'feature' : decision === 'SUSPENDED' ? 'suspend' : 'review';
      const body =
        decision === 'FEATURE'
          ? { featured: !resource.data.featured }
          : decision === 'SUSPENDED'
            ? { reason: reason.trim() }
            : { decision, ...(reason.trim() ? { reason: reason.trim() } : {}) };
      await adminRequest(`venues/${id}/${target}`, { method: 'POST', body });
      changed();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This decision could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  if (resource.loading)
    return (
      <div className="review-loading">
        <LoaderCircle className="spin" size={30} />
        <p>Opening venue details…</p>
      </div>
    );
  if (resource.error || !resource.data)
    return <ErrorState message={resource.error || 'Venue not found.'} retry={resource.retry} />;
  const venue = resource.data;
  const photos = venue.media || [];
  return (
    <>
      <div className="review-dialog-header">
        <span className="section-kicker">LISTING REVIEW</span>
        <h2>{venue.name}</h2>
        <p>
          <MapPin size={14} />
          {venue.locality ? `${venue.locality}, ` : ''}
          {venue.city}, {venue.state}
        </p>
        <Badge status={venue.status} />
      </div>
      <div className="review-body">
        <div className="review-details">
          <div className="review-gallery">
            {photos.length ? (
              <>
                <img
                  src={`/api/media/${photos[Math.min(photo, photos.length - 1)].id}`}
                  alt={`${venue.name}, photo ${photo + 1}`}
                />
                <div className="gallery-controls">
                  <button
                    className="icon-button"
                    aria-label="Previous photo"
                    disabled={photo === 0}
                    onClick={() => setPhoto((value) => value - 1)}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span>
                    {photo + 1} / {photos.length}
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Next photo"
                    disabled={photo >= photos.length - 1}
                    onClick={() => setPhoto((value) => value + 1)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </>
            ) : (
              <div className="gallery-empty">
                <ImageIcon size={35} />
                <span>No photographs supplied</span>
              </div>
            )}
          </div>
          <div className="review-detail-section">
            <div className="section-kicker">ABOUT THE VENUE</div>
            <h3>{humanize(venue.category)}</h3>
            <p className="venue-description">{venue.description}</p>
            <div className="detail-stat-grid">
              <div>
                <strong>{venue.seatingCapacity.toLocaleString('en-IN')}</strong>
                <span>Seating</span>
              </div>
              <div>
                <strong>{venue.diningCapacity.toLocaleString('en-IN')}</strong>
                <span>Dining</span>
              </div>
              <div>
                <strong>{venue.standingCapacity.toLocaleString('en-IN')}</strong>
                <span>Standing</span>
              </div>
              <div>
                <strong>{formatMoney(venue.rentalPricePaise)}</strong>
                <span>Starting rental</span>
              </div>
            </div>
          </div>
          <div className="review-detail-section">
            <div className="section-kicker">LOCATION</div>
            <p>
              {venue.address}
              <br />
              {venue.city}, {venue.state} {venue.pincode}
            </p>
            <a
              className="text-button inline-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.latitude},${venue.longitude}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Inspect map location
              <ExternalLink size={14} />
            </a>
            <small className="coordinate-label">
              {venue.latitude}, {venue.longitude}
            </small>
          </div>
          <div className="review-detail-section">
            <div className="section-kicker">FACILITIES & EVENTS</div>
            <div className="amenity-list">
              {venue.amenities?.length ? (
                venue.amenities.map((amenity) => (
                  <span key={amenity}>
                    <Check size={13} />
                    {humanize(amenity)}
                  </span>
                ))
              ) : (
                <p className="muted">No amenities supplied.</p>
              )}
            </div>
            <p className="muted">
              Events: {venue.eventTypes?.map(humanize).join(' · ') || 'Not supplied'}
            </p>
          </div>
          {!!venue.spaces?.length && (
            <div className="review-detail-section">
              <div className="section-kicker">INDEPENDENT SPACES</div>
              {venue.spaces.map((space) => (
                <div className="space-row" key={space.id}>
                  <div>
                    <strong>{space.name}</strong>
                    <small>{space.seatingCapacity} seated guests</small>
                  </div>
                  <span>{formatMoney(space.rentalPricePaise)}</span>
                </div>
              ))}
            </div>
          )}
          {venue.policy && (
            <div className="review-detail-section">
              <div className="section-kicker">VENUE POLICIES</div>
              {Object.entries(venue.policy)
                .filter(
                  ([key, value]) =>
                    ['bookingRules', 'cancellation', 'restrictions'].includes(key) &&
                    typeof value === 'string',
                )
                .map(([key, value]) => (
                  <p key={key}>
                    <strong>{humanize(key.replace(/([A-Z])/g, ' $1'))}</strong>
                    <br />
                    {String(value)}
                  </p>
                ))}
            </div>
          )}
        </div>
        <aside className="review-decision">
          <div className="review-owner">
            <span className="avatar avatar-muted">
              <Building2 size={20} />
            </span>
            <span>
              <strong>
                {venue.organization?.name || venue.owner?.displayName || 'Venue partner'}
              </strong>
              <small>{venue.owner?.phone || 'Business contact not supplied'}</small>
            </span>
          </div>
          <div className="review-checklist">
            <h3>Before you decide</h3>
            <p>
              <CheckCheck size={16} />
              Inspect all supplied photographs
            </p>
            <p>
              <MapPin size={16} />
              Check location and address
            </p>
            <p>
              <FileCheck2 size={16} />
              Verify capacity and pricing details
            </p>
            <p>
              <ShieldCheck size={16} />
              Review the partner business
            </p>
          </div>
          {venue.rejectionReason && (
            <div className="alert alert-error">Previous feedback: {venue.rejectionReason}</div>
          )}
          {error && (
            <div role="alert" className="alert alert-error">
              {error}
            </div>
          )}
          {venue.status === 'PENDING' ? (
            <div className="decision-actions">
              {!action ? (
                <>
                  <button
                    className="button button-primary button-full"
                    onClick={() => setAction('APPROVED')}
                    disabled={busy}
                  >
                    <Check size={17} />
                    Approve listing
                  </button>
                  <button
                    className="button button-secondary button-full danger-text"
                    onClick={() => setAction('REJECTED')}
                    disabled={busy}
                  >
                    Reject & provide feedback
                  </button>
                </>
              ) : (
                <form
                  className="form-stack"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void perform(action);
                  }}
                >
                  <strong>
                    {action === 'APPROVED'
                      ? 'Ready to publish this venue?'
                      : 'Explain the required changes'}
                  </strong>
                  <p className="muted">
                    {action === 'APPROVED'
                      ? 'The venue will become discoverable by customers after approval.'
                      : 'The partner will see this reason and can update their draft.'}
                  </p>
                  <label>
                    {action === 'APPROVED' ? 'Review note (optional)' : 'Rejection reason'}
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      required={action !== 'APPROVED'}
                      minLength={action !== 'APPROVED' ? 5 : undefined}
                      maxLength={2000}
                      rows={4}
                      placeholder="Be specific and helpful."
                    />
                  </label>
                  <button className="button button-primary button-full" disabled={busy}>
                    {busy ? 'Saving decision…' : 'Confirm decision'}
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => {
                      setAction(null);
                      setError('');
                    }}
                    disabled={busy}
                  >
                    Back
                  </button>
                </form>
              )}
            </div>
          ) : venue.status === 'APPROVED' ? (
            <div className="decision-actions">
              <button
                className="button button-secondary button-full"
                onClick={() => perform('FEATURE')}
                disabled={busy}
              >
                <Star size={16} />
                {venue.featured ? 'Remove from featured' : 'Feature this venue'}
              </button>
              {action === 'SUSPENDED' ? (
                <form
                  className="form-stack"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void perform('SUSPENDED');
                  }}
                >
                  <label>
                    Suspension reason
                    <textarea
                      required
                      minLength={5}
                      maxLength={2000}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={4}
                    />
                  </label>
                  <button className="button button-danger" disabled={busy}>
                    {busy ? 'Saving…' : 'Confirm suspension'}
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => setAction(null)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  className="button button-ghost danger-text"
                  onClick={() => setAction('SUSPENDED')}
                  disabled={busy}
                >
                  Suspend listing
                </button>
              )}
            </div>
          ) : (
            <div className="setup-notice">
              <ShieldCheck size={18} />
              <p>
                This listing is {venue.status.toLowerCase()}. Only submitted listings can be
                approved.
              </p>
            </div>
          )}
          <p className="review-audit-note">
            <ShieldCheck size={13} />
            Your decision is recorded in the audit trail.
          </p>
          <small className="muted">Submitted {formatDate(venue.createdAt)}</small>
        </aside>
      </div>
    </>
  );
}
