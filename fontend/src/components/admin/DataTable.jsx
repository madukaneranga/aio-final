import React, { useState } from 'react';
import { 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  CheckCircle,
  XCircle
} from 'lucide-react';

const DataTable = ({ 
  title,
  columns,
  data,
  loading = false,
  pagination = null,
  onPageChange = null,
  onSort = null,
  onView = null,
  onEdit = null,
  onDelete = null,
  onToggleStatus = null,
  selectedItems = [],
  onSelectItem = null,
  onSelectAll = null,
  emptyMessage = "No data available"
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    if (onSort) onSort(key, direction);
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key === columnKey) {
      return <ArrowUpDown className={`w-4 h-4 ${sortConfig.direction === 'asc' ? 'rotate-0' : 'rotate-180'}`} />;
    }
    return <ArrowUpDown className="w-4 h-4 opacity-50" />;
  };

  const renderActions = (item) => {
    return (
      <div className="flex items-center space-x-2">
        {onView && (
          <button
            onClick={() => onView(item)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        
        {onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
        
        {onToggleStatus && (
          <button
            onClick={() => onToggleStatus(item)}
            className={`p-2 rounded-lg transition-colors ${
              item.isActive || item.status === 'active'
                ? 'text-red-600 hover:bg-red-50' 
                : 'text-green-600 hover:bg-green-50'
            }`}
            title={item.isActive || item.status === 'active' ? 'Deactivate' : 'Activate'}
          >
            {item.isActive || item.status === 'active' 
              ? <XCircle className="w-4 h-4" />
              : <CheckCircle className="w-4 h-4" />
            }
          </button>
        )}
        
        {onDelete && (
          <button
            onClick={() => onDelete(item)}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  const renderCell = (item, column) => {
    if (column.render) {
      return column.render(item);
    }
    
    const value = column.key.split('.').reduce((obj, key) => obj?.[key], item);
    
    if (column.type === 'currency') {
      return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR'
      }).format(value || 0);
    }
    
    if (column.type === 'date') {
      return value ? new Date(value).toLocaleDateString() : 'N/A';
    }
    
    if (column.type === 'status') {
      const status = value || (item.isActive ? 'active' : 'inactive');
      const statusClasses = {
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-red-100 text-red-800',
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
        completed: 'bg-blue-100 text-blue-800',
        processing: 'bg-purple-100 text-purple-800'
      };
      
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          statusClasses[status] || 'bg-gray-100 text-gray-800'
        }`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    }
    
    return value || 'N/A';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      {data.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 mb-4">
            <MoreHorizontal className="mx-auto h-12 w-12" />
          </div>
          <p className="text-gray-500 text-lg">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {onSelectAll && (
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === data.length && data.length > 0}
                        onChange={(e) => onSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-black focus:ring-black"
                      />
                    </th>
                  )}
                  
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                      }`}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{column.title}</span>
                        {column.sortable && getSortIcon(column.key)}
                      </div>
                    </th>
                  ))}
                  
                  {(onView || onEdit || onDelete || onToggleStatus) && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item) => (
                  <tr key={item._id || item.id} className="hover:bg-gray-50">
                    {onSelectItem && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item._id || item.id)}
                          onChange={(e) => onSelectItem(item._id || item.id, e.target.checked)}
                          className="rounded border-gray-300 text-black focus:ring-black"
                        />
                      </td>
                    )}
                    
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-6 py-4 text-sm text-gray-900 ${
                          column.className || ''
                        } ${column.nowrap !== false ? 'whitespace-nowrap' : ''}`}
                      >
                        {renderCell(item, column)}
                      </td>
                    ))}
                    
                    {(onView || onEdit || onDelete || onToggleStatus) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {renderActions(item)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination && onPageChange && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {((pagination.current - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.current * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onPageChange(pagination.current - 1)}
                  disabled={pagination.current <= 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`px-3 py-1 text-sm rounded-lg ${
                          page === pagination.current
                            ? 'bg-black text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => onPageChange(pagination.current + 1)}
                  disabled={pagination.current >= pagination.pages}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DataTable;