import React, { useState } from 'react';
import { useAsana } from '../context/AsanaContext';
import * as Icons from 'lucide-react';

export const AdminView: React.FC = () => {
  const { outlets, zones, users, addOutlet, addUser } = useAsana();

  // Outlet form states
  const [outName, setOutName] = useState('');
  const [outZoneId, setOutZoneId] = useState('');

  // User form states
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uRole, setURole] = useState('employee');
  const [uZoneId, setUZoneId] = useState('');
  const [uOutletId, setUOutletId] = useState('');

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outName.trim() || !outZoneId) return;

    await addOutlet(outName.trim(), outZoneId);
    setOutName('');
    setOutZoneId('');
    alert('New outlet added successfully!');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uName.trim() || !uEmail.trim() || !uRole) return;

    await addUser(
      uName.trim(),
      uEmail.trim().toLowerCase(),
      uRole,
      uRole === 'store_manager' || uRole === 'employee' ? uOutletId : '',
      uRole === 'zonal_manager' || uRole === 'store_manager' || uRole === 'employee' ? uZoneId : ''
    );

    // Reset user form
    setUName('');
    setUEmail('');
    setURole('employee');
    setUZoneId('');
    setUOutletId('');
    alert('New user created successfully!');
  };

  const getRoleBadgeClass = (role: string) => {
    if (role === 'ceo') return 'badge-high';
    if (role === 'admin') return 'badge-medium';
    return 'badge-low';
  };

  const getZoneName = (zoneId?: string | null) => {
    return zones.find(z => z.id === zoneId)?.name || 'N/A';
  };

  const getOutletName = (outletId?: string | null) => {
    return outlets.find(o => o.id === outletId)?.name || 'N/A';
  };

  return (
    <div className="admin-view-container animate-fade-in">
      <div className="admin-grid-layout">
        {/* Left Column: Management Forms */}
        <div className="admin-col gap-24">
          {/* Create Outlet Card */}
          <div className="dashboard-card-pj">
            <div className="pj-card-header">
              <Icons.PlusSquare size={16} />
              <h4>Add New Jewelry Outlet</h4>
            </div>
            <form onSubmit={handleCreateOutlet} className="admin-form-block">
              <div className="form-group-pj">
                <label>Outlet Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kozhikode Bypass"
                  value={outName}
                  onChange={(e) => setOutName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-pj">
                <label>Assign to Zone</label>
                <select
                  value={outZoneId}
                  onChange={(e) => setOutZoneId(e.target.value)}
                  required
                >
                  <option value="">Select Zone...</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="primary-btn admin-submit-btn">
                Create Outlet
              </button>
            </form>
          </div>

          {/* Create User Card */}
          <div className="dashboard-card-pj">
            <div className="pj-card-header">
              <Icons.UserPlus size={16} />
              <h4>Register User Account</h4>
            </div>
            <form onSubmit={handleCreateUser} className="admin-form-block">
              <div className="form-group-pj">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-pj">
                <label>Corporate Email</label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@parakkat.com"
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-pj">
                <label>System Access Role</label>
                <select
                  value={uRole}
                  onChange={(e) => setURole(e.target.value)}
                  required
                >
                  <option value="employee">Outlet Employee</option>
                  <option value="store_manager">Store Manager</option>
                  <option value="zonal_manager">Zonal Manager</option>
                  <option value="ceo">CEO Group</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>

              {/* Conditional Zones (Zonal, Store Manager, Employee) */}
              {(uRole === 'zonal_manager' || uRole === 'store_manager' || uRole === 'employee') && (
                <div className="form-group-pj">
                  <label>Assign Zone</label>
                  <select
                    value={uZoneId}
                    onChange={(e) => setUZoneId(e.target.value)}
                    required
                  >
                    <option value="">Select Zone...</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional Outlets (Store Manager, Employee) */}
              {(uRole === 'store_manager' || uRole === 'employee') && (
                <div className="form-group-pj">
                  <label>Assign Outlet Store</label>
                  <select
                    value={uOutletId}
                    onChange={(e) => setUOutletId(e.target.value)}
                    required
                  >
                    <option value="">Select Outlet...</option>
                    {outlets
                      .filter(o => !uZoneId || o.zoneId === uZoneId)
                      .map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                  </select>
                </div>
              )}

              <button type="submit" className="primary-btn admin-submit-btn">
                Add User Account
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Listings Grid */}
        <div className="admin-col gap-24">
          {/* Outlets Listing */}
          <div className="dashboard-card-pj admin-listing-card">
            <div className="pj-card-header">
              <Icons.MapPin size={16} />
              <h4>Outlets Directory ({outlets.length})</h4>
            </div>
            <div className="admin-scroller">
              <table className="admin-table-pj">
                <thead>
                  <tr>
                    <th>Outlet Name</th>
                    <th>Zone</th>
                  </tr>
                </thead>
                <tbody>
                  {outlets.map(o => (
                    <tr key={o.id}>
                      <td><strong>{o.name}</strong></td>
                      <td>{getZoneName(o.zoneId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Users Directory */}
          <div className="dashboard-card-pj admin-listing-card">
            <div className="pj-card-header">
              <Icons.Users size={16} />
              <h4>Employee Accounts Directory ({users.length})</h4>
            </div>
            <div className="admin-scroller">
              <table className="admin-table-pj">
                <thead>
                  <tr>
                    <th>Name / Email</th>
                    <th>Role</th>
                    <th>Zone/Outlet</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-table-cell">
                          <strong>{u.name}</strong>
                          <span className="user-email-lbl">{u.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getRoleBadgeClass(u.role)}`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div className="user-table-cell">
                          {u.role === 'zonal_manager' && <span>Zone: {getZoneName(u.zoneId)}</span>}
                          {(u.role === 'store_manager' || u.role === 'employee') && (
                            <>
                              <span>Outlet: {getOutletName(u.outletId)}</span>
                              <span className="user-email-lbl">Zone: {getZoneName(u.zoneId)}</span>
                            </>
                          )}
                          {(u.role === 'ceo' || u.role === 'admin') && <span>Global</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .admin-view-container {
          padding: 24px 32px;
          height: calc(100vh - var(--header-height));
          overflow-y: auto;
          background-color: var(--bg-secondary);
        }

        .admin-grid-layout {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 24px;
          align-items: flex-start;
        }

        @media (max-width: 900px) {
          .admin-grid-layout {
            grid-template-columns: 1fr;
          }
        }

        .admin-col {
          display: flex;
          flex-direction: column;
        }

        .gap-24 {
          gap: 24px;
        }

        .admin-form-block {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-group-pj {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group-pj label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .form-group-pj input,
        .form-group-pj select {
          width: 100%;
          padding: 8px 12px;
          font-size: 13px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background-color: var(--bg-secondary);
        }

        .form-group-pj input:focus,
        .form-group-pj select:focus {
          outline: none;
          border-color: var(--primary);
        }

        .admin-submit-btn {
          width: 100%;
          justify-content: center;
          padding: 10px;
          font-size: 13px;
          font-weight: 600;
        }

        /* Scroller listings */
        .admin-listing-card {
          height: 380px;
          display: flex;
          flex-direction: column;
        }

        .admin-scroller {
          flex: 1;
          overflow-y: auto;
        }

        .admin-table-pj {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .admin-table-pj th,
        .admin-table-pj td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border-color);
          font-size: 12.5px;
        }

        .admin-table-pj th {
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.05em;
          background-color: var(--bg-secondary);
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .user-table-cell {
          display: flex;
          flex-direction: column;
        }

        .user-email-lbl {
          font-size: 10px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};
