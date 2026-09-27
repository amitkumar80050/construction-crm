import React from 'react';
import { FaFileImport } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const LeadImport = () => {
	const navigate = useNavigate();

	return (
		<button
			type="button"
			onClick={() => navigate('/import')}
			style={{ padding: '10px 18px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
		>
			<FaFileImport /> Import Leads
		</button>
	);
};

export default LeadImport;
