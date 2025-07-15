import React from 'react';
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";


export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-white">Privacy & Return Policies</h1>
          <p className="mt-2 text-gray-400">Last Updated: January 2025</p>
        </div>
        <div className="bg-zinc-900 p-8 rounded-lg shadow-md space-y-6 text-white text-sm">
          {/* Privacy Policy Section */}
          <section>
            <h2 className="text-xl font-semibold">Privacy Policy</h2>
            <p className="mt-2 text-gray-300">
              We collect personal data such as your name, email, payment info to operate the platform and provide services.
              We use cookies to improve your experience and track platform usage.
              We never sell your personal information and only share it with trusted third-party providers under strict confidentiality.
              You have rights to access, correct, delete, or export your data and opt out of marketing communications.
            </p>
          </section>

          {/* Return Policy Section */}
          <section>
            <h2 className="text-xl font-semibold mt-6">Return Policy</h2>
            <p className="mt-2 text-gray-300">
              Our platform enables sellers to define their own return policies for products and services.
              Generally:
            </p>
            <ul className="list-disc list-inside mt-2 text-gray-300">
              <li>Returns must be requested within 14 days of delivery.</li>
              <li>Products must be unused and in original packaging.</li>
              <li>Services like bookings may be non-refundable once delivered.</li>
              <li>Refunds or exchanges are processed after seller approval and item inspection.</li>
            </ul>
            <p className="mt-2 text-gray-300">
              For specific return instructions and eligibility, please check the seller’s return policy on their store page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}