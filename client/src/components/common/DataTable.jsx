import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const DataTable = ({ 
  columns, 
  data, 
  pagination, 
  onPageChange, 
  loading,
  onRowClick 
}) => {
  const { page, pages, total, limit } = pagination;

  const handlePrevious = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (page < pages) onPageChange(page + 1);
  };

  return (
    <div className="data-table-container">
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center">
                  <div className="loader-small">Loading...</div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center no-data">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr 
                  key={row._id || index} 
                  onClick={() => onRowClick?.(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render 
                        ? col.render(row[col.key], row) 
                        : row[col.key] || '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="table-footer">
          <div className="table-info">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
          </div>
          <div className="table-pagination">
            <button 
              onClick={handlePrevious} 
              disabled={page <= 1}
              className="page-btn"
            >
              <FaChevronLeft />
            </button>
            <span className="page-info">
              Page {page} of {pages}
            </span>
            <button 
              onClick={handleNext} 
              disabled={page >= pages}
              className="page-btn"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;