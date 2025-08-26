import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Download, Printer, ArrowLeft } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Receipt = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const receiptRef = useRef();

  // Get type from URL search params
  const searchParams = new URLSearchParams(location.search);
  const type = searchParams.get("type"); // 'order' or 'booking'

  useEffect(() => {
    if (!user || !id || !type) return;
    fetchData();
  }, [user, id, type]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const endpoint = type === "order" ? `/api/orders/${id}` : `/api/bookings/${id}`;
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setData(data);
      } else {
        setError(`${type} not found`);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!data || !receiptRef.current) return;

    try {
      // Show loading state
      const button = document.querySelector('[data-pdf-download]');
      if (button) {
        button.textContent = 'Generating PDF...';
        button.disabled = true;
      }

      // Configure html2canvas options for better quality
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: receiptRef.current.scrollWidth,
        height: receiptRef.current.scrollHeight,
      });

      // Calculate dimensions for A4 page
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297; // A4 height in mm
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Generate filename with current date and receipt ID
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      const receiptId = data._id.slice(-8).toUpperCase();
      const filename = `Receipt_${receiptId}_${dateStr}.pdf`;
      
      // Download the PDF
      pdf.save(filename);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      // Reset button state
      const button = document.querySelector('[data-pdf-download]');
      if (button) {
        button.textContent = 'Download PDF';
        button.disabled = false;
      }
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!type || !["order", "booking"].includes(type)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Invalid Receipt Type</h2>
          <p className="text-gray-600">The receipt type must be 'order' or 'booking'</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Receipt Not Found</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">No Data Available</h2>
          <p className="text-gray-600">Unable to load receipt data</p>
        </div>
      </div>
    );
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Actions - Hidden in print */}
      <div className="bg-white shadow-sm border-b print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.history.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="flex space-x-3">
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                data-pdf-download
                className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 print:p-0">
        <div ref={receiptRef} className="bg-white shadow-lg rounded-lg p-8 print:shadow-none print:rounded-none" style={{fontFamily: 'Arial, sans-serif', lineHeight: '1.4'}}>
          {/* Receipt Header */}
          <div className="text-center pb-6 mb-6" style={{borderBottom: '2px solid #1f2937'}}>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px'}}>AIO CART</h1>
            <h2 className="text-xl text-gray-700" style={{fontSize: '18px', color: '#374151', marginBottom: '8px'}}>Payment Receipt</h2>
            <p className="text-sm text-gray-500 mt-2" style={{fontSize: '12px', color: '#6b7280'}}>
              Receipt #{data._id.slice(-8).toUpperCase()}
            </p>
          </div>

          {/* Receipt Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Receipt Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{formatDate(new Date())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{type === "order" ? "Order" : "Booking"} ID:</span>
                  <span className="font-medium">{data.combinedId || data._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium capitalize">{data.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment:</span>
                  <span className="font-medium">
                    {data.paymentDetails?.paymentStatus === "paid" ? "✓ Paid" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{data.customerId?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{data.customerId?.email || "N/A"}</span>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-3 mt-4">Store Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Store:</span>
                  <span className="font-medium">{data.storeId?.name || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Section */}
          {type === "order" && data.items && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Order Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead style={{backgroundColor: '#f9fafb'}}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#6b7280'}}>
                        Product
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{padding: '12px', textAlign: 'right', fontSize: '11px', fontWeight: '500', color: '#6b7280'}}>
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{padding: '12px', textAlign: 'right', fontSize: '11px', fontWeight: '500', color: '#6b7280'}}>
                        Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{padding: '12px', textAlign: 'right', fontSize: '11px', fontWeight: '500', color: '#6b7280'}}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.items.map((item, index) => (
                      <tr key={index} style={{borderBottom: '1px solid #e5e7eb'}}>
                        <td className="px-4 py-3" style={{padding: '12px'}}>
                          <div className="text-sm font-medium text-gray-900" style={{fontSize: '13px', fontWeight: '500', color: '#111827'}}>
                            {item.productId?.title || "Product"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900" style={{padding: '12px', textAlign: 'right', fontSize: '13px', color: '#111827'}}>
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900" style={{padding: '12px', textAlign: 'right', fontSize: '13px', color: '#111827'}}>
                          LKR {item.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900" style={{padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: '500', color: '#111827'}}>
                          LKR {(item.price * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Service Section for Bookings */}
          {type === "booking" && data.serviceId && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Service Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900">{data.serviceId.title || "Service"}</h4>
                    <p className="text-sm text-gray-600">
                      Date: {data.bookingDetails?.date ? formatDate(data.bookingDetails.date) : "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Time: {data.bookingDetails?.startTime || data.startTime} - {data.bookingDetails?.endTime || data.endTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">LKR {data.totalAmount}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Shipping Address for Orders */}
          {type === "order" && data.shippingAddress && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Shipping Address</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <p>{data.shippingAddress.street}</p>
                <p>{data.shippingAddress.city}, {data.shippingAddress.state}</p>
                <p>{data.shippingAddress.zipCode}</p>
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div className="pt-6" style={{borderTop: '2px solid #e5e7eb', paddingTop: '24px'}}>
            <h3 className="font-semibold text-gray-900 mb-4" style={{fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px'}}>Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm" style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px'}}>
                <span className="text-gray-600" style={{color: '#4b5563'}}>Subtotal:</span>
                <span className="font-medium" style={{fontWeight: '500'}}>LKR {data.storeAmount}</span>
              </div>
              <div className="flex justify-between text-sm" style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px'}}>
                <span className="text-gray-600" style={{color: '#4b5563'}}>Platform Fee:</span>
                <span className="font-medium" style={{fontWeight: '500'}}>LKR {data.platformFee}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2" style={{display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', color: '#111827', borderTop: '1px solid #d1d5db', paddingTop: '8px', marginTop: '8px'}}>
                <span>Total Amount:</span>
                <span>LKR {data.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-1">This is an electronically generated receipt.</p>
            <p className="mt-1">Generated on {formatDate(new Date())}</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            margin: 0.5in;
          }
          body {
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Receipt;