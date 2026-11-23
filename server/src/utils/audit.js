import AuditLog from '../models/AuditLog.js';

export async function writeAudit(req, action, entityType, entityId, before = null, after = null, reason) {
  await AuditLog.create({
    actorId: req.user.id,
    action,
    entityType,
    entityId,
    before,
    after,
    reason,
    ip: req.ip,
    userAgent: req.get('user-agent') || '',
  });
}
