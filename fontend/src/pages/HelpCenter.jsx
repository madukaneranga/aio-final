import React from 'react';
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function HelpCenter() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-white">Help Center</h1>
          <p className="mt-2 text-gray-400">AIO Platform Support</p>
        </div>
        <div className="bg-zinc-900 p-8 rounded-lg shadow-md space-y-6 text-white">
          <section>
            <h2 className="text-2xl font-semibold">Getting Started</h2>
            <p className="mt-2 font-medium text-gray-200">Setting Up Your Store</p>
            <p className="text-sm text-gray-300">
              Creating your store on AIO is simple. After signing up, you'll be guided through our setup wizard...
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6">Selling on AIO</h2>
            <p className="mt-2 font-medium text-gray-200">Payment Processing</p>
            <p className="text-sm text-gray-300">
              AIO supports major payment methods including credit cards, PayPal...
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6">Customer Support</h2>
            <ul className="list-disc list-inside text-sm text-gray-300">
              <li>24/7 technical support</li>
              <li>Knowledge base & tutorials</li>
              <li>Community forums & webinars</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}