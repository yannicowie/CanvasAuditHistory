import * as React from 'react';

export interface IAuditHistoryAppProps {
    auditDataJson: string;
    fieldNameDisplay: string;
    dateFormat: string;
    onRefreshRequested: () => void;
}

interface AuditChange {
    attribute: string;
    attributeDisplayName?: string; // New property from C#
    oldValue: string;
    newValue: string;
}

interface AuditRecord {
    action: string;
    auditId: string;
    changes: AuditChange[];
    createdOn: string;
    operation: string;
    userId: string;
}

export const AuditHistoryApp: React.FC<IAuditHistoryAppProps> = ({ auditDataJson, fieldNameDisplay, dateFormat, onRefreshRequested }) => {
    const [auditData, setAuditData] = React.useState<AuditRecord[]>([]);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!auditDataJson || auditDataJson.trim() === "") {
            setAuditData([]);
            setError(null);
            return;
        }

        try {
            const parsed = JSON.parse(auditDataJson) as AuditRecord[];
            setAuditData(parsed);
            setError(null);
        } catch (err: unknown) {
            setError("Failed to parse audit data: " + (err instanceof Error ? err.message : String(err)));
            setAuditData([]);
        }
    }, [auditDataJson]);

    // Handle date formatting (Local vs US vs UK vs ISO)
    const parseDate = (wcfDate: string) => {
        if (!wcfDate) return '';
        const ms = parseInt(wcfDate.replace(/[^0-9]/g, ''), 10);
        const dateObj = new Date(ms);
        
        if (dateFormat === "US") {
            return dateObj.toLocaleString("en-US");
        } else if (dateFormat === "UK") {
            return dateObj.toLocaleString("en-GB");
        } else if (dateFormat === "ISO") {
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const hh = String(dateObj.getHours()).padStart(2, '0');
            const min = String(dateObj.getMinutes()).padStart(2, '0');
            return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
        }
        // Defaults to the user's current system timezone and language settings natively
        return dateObj.toLocaleString(); 
    };

    // Wording tweaks for Action
    const getActionText = (action: string) => {
        if (action === "Create") return "Created";
        if (action === "Update") return "Updated";
        return action;
    };

    // Format the field name display based on the PCF dropdown setting
    const getFieldLabel = (change: AuditChange) => {
        const logical = change.attribute;
        const display = change.attributeDisplayName ?? logical; // Fixed: Fallback if no display name

        if (fieldNameDisplay === "LogicalName") return logical;
        if (fieldNameDisplay === "Both") return `${display} [${logical}]`;
        return display; // Default
    };

    return (
        <div style={{ padding: '10px', boxSizing: 'border-box', fontFamily: '"Segoe UI", "Segoe UI Web (West European)", "Helvetica Neue", sans-serif', height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header with Refresh Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                <button 
                    onClick={onRefreshRequested}
                    style={{
                        backgroundColor: '#f3f2f1', border: '1px solid #8a8886', borderRadius: '4px',
                        padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '13px', color: '#323130'
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 2v6h-6"></path>
                        <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                        <path d="M3 22v-6h6"></path>
                        <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Added paddingLeft to prevent circle clipping, boxSizing to fix overflow */}
            <div style={{ flexGrow: 1, overflowY: 'auto', paddingLeft: '10px', boxSizing: 'border-box' }}>
                {error && <div style={{ padding: '10px', color: '#a4262c' }}>{error}</div>}
                {(!auditData || auditData.length === 0) && !error && <div style={{ padding: '10px', color: '#605e5c' }}>No audit history available.</div>}

                {auditData.map((record) => (
                    <div key={record.auditId} style={{ marginBottom: '20px', borderLeft: '3px solid #0078d4', paddingLeft: '15px', position: 'relative' }}>
                        
                        <div style={{ position: 'absolute', left: '-7px', top: '0', width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#0078d4' }} />
                        
                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: '#323130' }}>
                            {getActionText(record.action)} by {record.userId}
                        </div>
                        <div style={{ fontSize: '12px', color: '#605e5c', marginBottom: '8px' }}>
                            {parseDate(record.createdOn)}
                        </div>
                        
                        <div style={{ backgroundColor: '#f3f2f1', padding: '10px', borderRadius: '4px', fontSize: '13px' }}>
                            {record.changes.length === 0 ? (
                                <span style={{ color: '#605e5c', fontStyle: 'italic' }}>No fields changed.</span>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #edebe9' }}>
                                            <th style={{ paddingBottom: '4px', width: '33%', color: '#323130' }}>Field</th>
                                            <th style={{ paddingBottom: '4px', width: '33%', color: '#323130' }}>Old Value</th>
                                            <th style={{ paddingBottom: '4px', width: '33%', color: '#323130' }}>New Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {record.changes.map((change, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #edebe9' }}>
                                                <td style={{ padding: '4px 0', fontWeight: 600, color: '#323130' }}>
                                                    {getFieldLabel(change)}
                                                </td>
                                                {/* Removed line-through, kept the red coloring */}
                                                <td style={{ padding: '4px 0', color: '#a4262c' }}>
                                                    {change.oldValue || '-'}
                                                </td>
                                                <td style={{ padding: '4px 0', color: '#107c10' }}>
                                                    {change.newValue || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};