// ─────────────────────────────────────────────────────────────────────────────
// AuditLogger.js - Immutable Audit Trail for Administrative & Security Events
// ─────────────────────────────────────────────────────────────────────────────

import { pgPool, readLocalStoreAsync, writeLocalStoreAsync } from '../../../db.js';

export class AuditLogger {
  /**
   * Records an administrative action or security event in the immutable audit log.
   */
  async logAdminAction({ adminUser = 'admin', action, targetId = null, ip = '127.0.0.1', details = {}, status = 'SUCCESS' }) {
    const timestamp = new Date().toISOString();
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      admin_user: adminUser,
      action,
      target_id: targetId ? String(targetId) : null,
      ip: String(ip || '').replace(/^::ffff:/, ''),
      details: typeof details === 'object' ? details : { raw: details },
      status: String(status).toUpperCase()
    };

    // 1. PostgreSQL Persistence
    if (pgPool) {
      try {
        await pgPool.query(`
          INSERT INTO audit_logs (id_str, timestamp, admin_user, action, target_id, ip, details, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          entry.id,
          entry.timestamp,
          entry.admin_user,
          entry.action,
          entry.target_id,
          entry.ip,
          JSON.stringify(entry.details),
          entry.status
        ]);
      } catch (dbErr) {
        // Fallback to local store if table or connection error
        await this._logToLocalFallback(entry);
      }
    } else {
      await this._logToLocalFallback(entry);
    }

    console.log(`🛡️ [AUDIT] [${entry.timestamp}] [${entry.admin_user}] ${entry.action} -> ${entry.status} (${entry.ip})`);
    return entry;
  }

  async _logToLocalFallback(entry) {
    try {
      const store = await readLocalStoreAsync();
      store.auditLogs = store.auditLogs || [];
      store.auditLogs.unshift(entry);
      // Keep last 1000 audit records in local memory store
      if (store.auditLogs.length > 1000) {
        store.auditLogs = store.auditLogs.slice(0, 1000);
      }
      await writeLocalStoreAsync(store);
    } catch (err) {
      console.error('AuditLogger Local Store Error:', err);
    }
  }

  /**
   * Retrieves recent audit logs for the admin dashboard.
   */
  async getAuditLogs(limit = 100) {
    if (pgPool) {
      try {
        const result = await pgPool.query(`
          SELECT id_str as id, timestamp, admin_user, action, target_id, ip, details, status
          FROM audit_logs
          ORDER BY id DESC
          LIMIT $1
        `, [limit]);

        if (result.rows && result.rows.length > 0) {
          return result.rows.map(r => ({
            ...r,
            details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details
          }));
        }
      } catch (err) {}
    }

    const store = await readLocalStoreAsync();
    return (store.auditLogs || []).slice(0, limit);
  }
}

export const auditLogger = new AuditLogger();
