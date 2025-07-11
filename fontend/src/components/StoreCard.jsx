import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Store } from 'lucide-react';

const StoreCard = ({ store }) => {
  return (
    <Link to={`/store/${store._id}`} className="block">
      <div className="store-card bg-white rounded-lg shadow-md overflow-hidden">
        <div className="relative">
          <img
            src={store.heroImages?.[0] ? 
              (store.heroImages[0].startsWith('http') ? store.heroImages[0] : `${import.meta.env.VITE_API_URL}${store.heroImages[0]}`) : 
              'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop'
            }
            alt={store.name}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-sm flex items-center space-x-1">
            <Store className="w-3 h-3" />
            <span className="capitalize">{store.type}</span>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2">{store.name}</h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{store.description}</p>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-gray-600">{store.rating || 4.5}</span>
            </div>
            <span className="text-sm text-gray-500">
              {store.totalSales} sales
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              By {store.ownerId?.name || 'Store Owner'}
            </span>
            <span className={`text-sm px-2 py-1 rounded ${
              store.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {store.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default StoreCard;