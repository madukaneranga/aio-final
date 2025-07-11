import React from 'react';

const StatusBadge = ({ status, type = 'order' }) => {
  const getStatusConfig = () => {
    const configs = {
      order: {
        pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
        accepted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Accepted' },
        processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
        ready: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Ready for Pickup' },
        shipped: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Shipped' },
        delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
        cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
      },
      booking: {
        pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
        confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmed' },
        completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
        cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
      },
      payment: {
        pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
        paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
        failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
        refunded: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Refunded' }
      }
    };

    return configs[type]?.[status] || { 
      bg: 'bg-gray-100', 
      text: 'text-gray-800', 
      label: status 
    };
  };

  const config = getStatusConfig();

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;