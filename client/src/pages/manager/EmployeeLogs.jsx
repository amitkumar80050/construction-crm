import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import activityLogService from '../../services/activityLogService';

const EmployeeLogs = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activityLogService.getManagedEmployees()
      .then((res) => setEmployees(res.data.data))
      .catch((e) => toast.error(e.response?.data?.message || 'Unable to load employees.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', color: '#1e293b' }}>Employee Logs</h1>
      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', marginTop: '16px', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>User ID</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Department</th>
            <th style={{ padding: '10px', textAlign: 'right' }}>Total Activities</th>
          </tr></thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e._id} onClick={() => navigate(`/manager/logs/${e.userId}`)} style={{ cursor: 'pointer', borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px' }}>{e.userId}</td>
                <td style={{ padding: '10px' }}>{e.name}</td>
                <td style={{ padding: '10px' }}>{e.department}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{e.totalActivities}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default EmployeeLogs;