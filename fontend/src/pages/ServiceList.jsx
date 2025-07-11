import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ServiceCard from '../components/ServiceCard';
import SearchFilters from '../components/SearchFilters';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Calendar } from 'lucide-react';

const ServiceList = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();

  const categories = [
    'Tutoring',
    'Home Services',
    'Beauty & Wellness',
    'Consulting',
    'Fitness',
    'Technology',
    'Creative Services',
    'Professional Services'
  ];

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    fetchServices(searchParams.toString());
  }, [location.search]);

  const fetchServices = async (queryString = '') => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/services?${queryString}`);
      
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      } else {
        setError('Failed to fetch services');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (filters) => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    fetchServices(params.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Services</h1>
          
          <SearchFilters
            onSearch={handleSearch}
            categories={categories}
            placeholder="Search services..."
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="mb-6">
          <p className="text-gray-600">
            {services.length} service{services.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        {services.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No services found"
            description="Try adjusting your search criteria or check back later for new services."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceList;