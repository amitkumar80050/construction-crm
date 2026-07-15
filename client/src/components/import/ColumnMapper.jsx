import React from 'react';

const ColumnMapper = ({ detectedColumns, crmFields, mapping, onChange }) => {
  const handleMap = (uploadedColumn, crmField) => {
    onChange({ ...mapping, [uploadedColumn]: crmField });
  };

  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Map Columns</h3>
      <div style={{ display: 'grid', gap: '10px' }}>
        {detectedColumns.map((col) => (
          <div key={col} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
            <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '14px', color: '#475569' }}>
              {col}
            </div>
            <span style={{ color: '#94a3b8' }}>→</span>
            <select
              value={mapping[col] || ''}
              onChange={(e) => handleMap(col, e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            >
              <option value="">-- Ignore this column --</option>
              {crmFields.map((f) => (
                <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColumnMapper;