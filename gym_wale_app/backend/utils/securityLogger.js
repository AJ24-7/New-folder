const fs = require('fs').promises;
const path = require('path');

class SecurityLogger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.logFile = path.join(this.logDir, 'security.log');
        this.ensureLogDir();
    }

    async ensureLogDir() {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('Error creating log directory:', error);
        }
    }

    async log(event, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            details,
            pid: process.pid,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        };

        const logLine = JSON.stringify(logEntry) + '\n';

        try {
            // Write to file
            await fs.appendFile(this.logFile, logLine);
            
            // Also log to console in development
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[SECURITY] ${event}:`, details);
            }

            // In production, you might want to send to external logging service
            if (process.env.NODE_ENV === 'production') {
                await this.sendToExternalLogger(logEntry);
            }

        } catch (error) {
            console.error('Error writing security log:', error);
        }
    }

    async sendToExternalLogger(logEntry) {
        // Implement integration with external logging services
        // like Datadog, Splunk, ELK Stack, etc.
        try {
            // Example: Send to external API
            if (process.env.SECURITY_LOG_WEBHOOK) {
                await fetch(process.env.SECURITY_LOG_WEBHOOK, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.SECURITY_LOG_TOKEN}`
                    },
                    body: JSON.stringify(logEntry)
                });
            }
        } catch (error) {
            console.error('Error sending to external logger:', error);
        }
    }

    async getRecentLogs(hours = 24, eventTypes = []) {
        try {
            const logContent = await fs.readFile(this.logFile, 'utf8');
            const lines = logContent.split('\n').filter(line => line.trim());
            
            const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
            
            const recentLogs = lines
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(log => {
                    if (!log) return false;
                    const logTime = new Date(log.timestamp);
                    if (logTime < cutoffTime) return false;
                    if (eventTypes.length > 0 && !eventTypes.includes(log.event)) return false;
                    return true;
                })
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return recentLogs;
        } catch (error) {
            console.error('Error reading security logs:', error);
            return [];
        }
    }

    async getFailedLoginAttempts(email, hours = 1) {
        const logs = await this.getRecentLogs(hours, ['login_attempt_invalid_password', 'login_attempt_invalid_user']);
        return logs.filter(log => log.details.email === email);
    }

    async getSuspiciousActivity(hours = 24) {
        const suspiciousEvents = [
            'rate_limit_exceeded',
            'login_attempt_locked_account',
            'suspicious_activity',
            'multiple_failed_attempts'
        ];
        
        return await this.getRecentLogs(hours, suspiciousEvents);
    }

    async generateSecurityReport(hours = 24) {
        const logs = await this.getRecentLogs(hours);
        
        const report = {
            timeRange: `${hours} hours`,
            totalEvents: logs.length,
            eventSummary: {},
            topIPs: {},
            failedLogins: 0,
            successfulLogins: 0,
            suspiciousActivity: 0,
            generatedAt: new Date().toISOString()
        };

        logs.forEach(log => {
            // Count events by type
            report.eventSummary[log.event] = (report.eventSummary[log.event] || 0) + 1;
            
            // Count IPs
            if (log.details.ip) {
                report.topIPs[log.details.ip] = (report.topIPs[log.details.ip] || 0) + 1;
            }
            
            // Count specific event types
            if (log.event.includes('login_attempt_invalid')) {
                report.failedLogins++;
            } else if (log.event === 'login_success') {
                report.successfulLogins++;
            } else if (log.event.includes('suspicious') || log.event.includes('rate_limit')) {
                report.suspiciousActivity++;
            }
        });

        // Sort top IPs
        report.topIPs = Object.entries(report.topIPs)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .reduce((obj, [ip, count]) => {
                obj[ip] = count;
                return obj;
            }, {});

        return report;
    }

    async cleanOldLogs(daysToKeep = 30) {
        try {
            const logContent = await fs.readFile(this.logFile, 'utf8');
            const lines = logContent.split('\n').filter(line => line.trim());
            
            const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
            
            const recentLines = lines.filter(line => {
                try {
                    const log = JSON.parse(line);
                    return new Date(log.timestamp) >= cutoffTime;
                } catch {
                    return false;
                }
            });

            await fs.writeFile(this.logFile, recentLines.join('\n') + '\n');
            
            console.log(`Cleaned old security logs. Kept ${recentLines.length} of ${lines.length} entries.`);
        } catch (error) {
            console.error('Error cleaning old logs:', error);
        }
    }
}

module.exports = SecurityLogger;
