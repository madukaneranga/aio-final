import React from 'react';
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ContactUs() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-white">Contact Us</h1>
          <p className="mt-2 text-gray-400">AIO Platform Support</p>
        </div>
        <div className="bg-zinc-900 p-8 rounded-lg shadow-md space-y-6 text-white">
          <section>
            <h2 className="text-xl font-semibold">Email Support</h2>
            <ul className="text-sm space-y-1 text-gray-300">
              <li><strong>General:</strong> support@aio.com</li>

            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6">Chat</h2>
            <p className="text-sm text-gray-300">Available 24/7 via Whatsapp.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6">Phone Support</h2>
            <p className="text-sm text-gray-300">Sri Lanka: +94 74 114 5704</p>
            <p className="text-sm text-gray-300">Hours: Mon–Fri 9AM–8PM </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6">Business Address</h2>
            <address className="text-sm not-italic text-gray-300">
              No.50/A<br />
              3rd Mile Post<br />
              Batawala, Padukka<br />
              Western, Sri Lanka
            </address>
          </section>
        </div>
      </div>
    </div>
  );
}