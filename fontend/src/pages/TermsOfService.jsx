import React from 'react';
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-white">Terms of Service</h1>
          <p className="mt-2 text-gray-400">Last Updated: July 2025</p>
        </div>
        <div className="bg-zinc-900 p-8 rounded-lg shadow-md space-y-6 text-white text-sm">
          <section>
            <h2 className="text-xl font-semibold">Acceptance of Terms</h2>
            <p className="text-gray-300">By using AIO, you agree to our Terms and Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6">User Accounts</h2>
            <ul className="list-disc list-inside text-gray-300">
              <li>You must be 18+ years old</li>
              <li>You're responsible for your account activity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6">Seller Obligations</h2>
            <ul className="list-disc list-inside text-gray-300">
              <li>Provide accurate listings & fulfill orders</li>
              <li>Comply with laws and respect IP rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6">Dispute Resolution</h2>
            <p className="text-gray-300">Disputes may be resolved via AIO mediation or binding arbitration.</p>
          </section>
        </div>
      </div>
    </div>
  );
}