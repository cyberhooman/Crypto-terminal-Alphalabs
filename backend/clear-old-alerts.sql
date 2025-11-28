-- Clear old alerts from database
-- Keep only alerts from last 6 hours with HIGH or CRITICAL severity

-- First, check how many we'll delete
SELECT COUNT(*) as total_alerts FROM confluence_alerts;
SELECT COUNT(*) as alerts_to_keep
FROM confluence_alerts
WHERE timestamp > (EXTRACT(EPOCH FROM NOW()) * 1000 - 6 * 60 * 60 * 1000)
AND severity IN ('CRITICAL', 'HIGH');

-- Delete old alerts (older than 6 hours OR low severity)
DELETE FROM confluence_alerts
WHERE timestamp <= (EXTRACT(EPOCH FROM NOW()) * 1000 - 6 * 60 * 60 * 1000)
OR severity NOT IN ('CRITICAL', 'HIGH');

-- Verify deletion
SELECT COUNT(*) as remaining_alerts FROM confluence_alerts;
SELECT severity, COUNT(*) as count
FROM confluence_alerts
GROUP BY severity
ORDER BY count DESC;
