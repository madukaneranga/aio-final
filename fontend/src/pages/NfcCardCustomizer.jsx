import React, { useState } from 'react';
import * as QRCodeModule from 'qrcode.react';
const QRCode = QRCodeModule.default || QRCodeModule;

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { UploadCloud, BadgeCheck, Paintbrush, Eye, ShoppingCart } from 'lucide-react';

// ... rest of the component


const mockUser = {
  uid: 'user_123',
  isPremium: true,
  name: 'Maduka Neranga',
  email: 'maduka@aiocart.lk',
};

// Initialize all fields with non-null string defaults to prevent React errors
const mockStore = {
  storeName: 'AIO Cart Interiors',
  ownerName: 'Maduka Neranga',
  preferredName: 'Neranga',
  phone: '+94 77 123 4567',
  email: 'info@aiocart.lk',
  url: 'https://aiocart.lk/interiors',
  address: 'No 21, Colombo Road, Kandy',
  description: 'Elegant interior solutions for your living spaces.',
  businessCategory: 'Interior Design',
  businessHours: 'Mon-Fri: 9am–6pm',
  establishedYear: '2018',
  website: 'https://aiocart.lk/interiors',
  instagram: '@aiocart.lk',
  facebook: 'aiocartlk',
  whatsapp: '+94 77 123 4567',
  logoUrl: '',
};

const analyticsData = [
  { month: 'Apr', taps: 30 },
  { month: 'May', taps: 45 },
  { month: 'Jun', taps: 60 },
  { month: 'Jul', taps: 75 },
  { month: 'Aug', taps: 90 },
];

export default function NfcCardCustomizer() {
  const [activeTab, setActiveTab] = useState('Information');
  const [storeData, setStoreData] = useState(mockStore);
  const [quantity, setQuantity] = useState(25);
  const [templatePrice, setTemplatePrice] = useState(0);
  const [finishPrice, setFinishPrice] = useState(0);

  const tabs = [
    { name: 'Information', icon: <BadgeCheck size={16} /> },
    { name: 'Design', icon: <Paintbrush size={16} /> },
    { name: 'Layout', icon: <Eye size={16} /> },
    { name: 'Social', icon: <UploadCloud size={16} /> },
    { name: 'Order', icon: <ShoppingCart size={16} /> },
  ];

  const unitPrice =
    quantity === 25 ? 12.99 : quantity === 50 ? 9.99 : quantity === 100 ? 7.99 : 5.99;
  const totalPrice = (unitPrice * quantity + templatePrice + finishPrice).toFixed(2);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStoreData((prev) => ({ ...prev, [name]: value || '' }));
  };

  // Helper to safely render text with fallback empty string
  const safeText = (text) => (text ? text : '');

  return (
    <div className="min-h-screen bg-black text-white font-sans px-6 py-10">
      <h1 className="text-3xl font-bold text-center mb-6">NFC Business Card Customizer</h1>

      {/* Tabs */}
      <div className="flex justify-center space-x-4 mb-8 border-b border-gray-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`flex items-center space-x-1 px-4 py-2 rounded transition-all duration-200 ${
              activeTab === tab.name ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Card Preview */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-8 mb-10">
        <div className="w-[350px] h-[200px] bg-gradient-to-br from-gray-800 to-black rounded-xl shadow-xl p-4">
          <h2 className="text-xl font-bold">{safeText(storeData.storeName)}</h2>
          <p className="text-sm text-gray-400">
            {safeText(storeData.preferredName) || safeText(storeData.ownerName)}
          </p>
          <p className="text-sm mt-2">{safeText(storeData.businessCategory)}</p>
          <div className="mt-4">
            <QRCode
              value={safeText(storeData.url) || 'https://aiocart.lk'}
              size={64}
              bgColor="#000000"
              fgColor="#ffffff"
            />
          </div>
        </div>

        <div className="w-[350px] h-[200px] bg-black border border-gray-700 rounded-xl p-4 relative">
          <p className="text-sm">{safeText(storeData.description)}</p>
          <div className="text-xs text-gray-400 mt-4 space-y-1">
            {safeText(storeData.phone) && <div>📞 {safeText(storeData.phone)}</div>}
            {safeText(storeData.email) && <div>✉️ {safeText(storeData.email)}</div>}
            {safeText(storeData.website) && <div>🔗 {safeText(storeData.website)}</div>}
            {safeText(storeData.instagram) && <div>📸 {safeText(storeData.instagram)}</div>}
            {safeText(storeData.facebook) && <div>📘 {safeText(storeData.facebook)}</div>}
            {safeText(storeData.whatsapp) && <div>💬 {safeText(storeData.whatsapp)}</div>}
          </div>
          <div className="absolute bottom-2 left-2 text-[10px] text-gray-600">aiocart.lk</div>
        </div>
      </div>

      {/* Analytics */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Analytics</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={analyticsData}>
            <XAxis dataKey="month" stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none' }} />
            <Line type="monotone" dataKey="taps" stroke="#00FFAA" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tab Content */}
      {activeTab === 'Information' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            'storeName',
            'ownerName',
            'preferredName',
            'phone',
            'email',
            'url',
            'address',
            'description',
            'businessCategory',
            'businessHours',
            'establishedYear',
            'website',
          ].map((field) => (
            <input
              key={field}
              name={field}
              placeholder={field}
              value={storeData[field] || ''}
              onChange={handleInputChange}
              className="bg-gray-900 border border-gray-700 rounded px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
            />
          ))}
        </div>
      )}

      {activeTab === 'Social' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['instagram', 'facebook', 'whatsapp'].map((field) => (
            <input
              key={field}
              name={field}
              placeholder={field}
              value={storeData[field] || ''}
              onChange={handleInputChange}
              className="bg-gray-900 border border-gray-700 rounded px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
            />
          ))}
        </div>
      )}

      {activeTab === 'Order' && (
        <div className="max-w-md mx-auto bg-gray-900 border border-gray-700 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Place Your Order</h3>

          <label className="block mb-2">Select Quantity</label>
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full mb-4 bg-black border border-gray-700 rounded px-3 py-2"
          >
            <option value={25}>25 Cards</option>
            <option value={50}>50 Cards</option>
            <option value={100}>100 Cards</option>
            <option value={250}>250 Cards</option>
          </select>

          <label className="block mb-2">Select Template</label>
          <select
            onChange={(e) => setTemplatePrice(Number(e.target.value))}
            className="w-full mb-4 bg-black border border-gray-700 rounded px-3 py-2"
          >
            <option value={0}>Elegant Classic (Free)</option>
            <option value={1500}>Luxury Gold (+LKR 1500)</option>
            <option value={900}>Modern Minimal (+LKR 900)</option>
            <option value={1200}>Gradient Pro (+LKR 1200)</option>
            <option value={1800}>Tech Innovation (+LKR 1800)</option>
            <option value={2400}>Executive Elite (+LKR 2400)</option>
          </select>

          <label className="block mb-2">Select Finish</label>
          <select
            onChange={(e) => setFinishPrice(Number(e.target.value))}
            className="w-full mb-4 bg-black border border-gray-700 rounded px-3 py-2"
          >
            <option value={0}>Matte</option>
            <option value={600}>Glossy (+LKR 600)</option>
            <option value={1500}>Metallic (+LKR 1500)</option>
            <option value={900}>Textured (+LKR 900)</option>
          </select>

          <div className="text-right mt-4">
            <p className="text-sm text-gray-400">Unit Price: LKR {unitPrice}</p>
            <p className="text-lg font-bold text-white">Total: LKR {totalPrice}</p>
          </div>
        </div>
      )}
    </div>
  );
}
