import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

export const generateReceipt = async (orderData, type = 'order') => {
  try {
    const doc = new PDFDocument({ margin: 50 });
    
    // Generate unique filename
    const fileName = `receipt_${orderData._id}_${Date.now()}.pdf`;
    const filePath = path.join(process.cwd(), 'uploads', 'receipts', fileName);
    
    // Ensure uploads/receipts directory exists
    const uploadsDir = path.dirname(filePath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Create write stream
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    
    // Header
    doc.fontSize(20).text('AIO CART', 50, 50);
    doc.fontSize(16).text('Payment Receipt', 50, 80);
    doc.moveTo(50, 110).lineTo(550, 110).stroke();
    
    // Receipt Info
    let yPosition = 130;
    doc.fontSize(12);
    doc.text(`Receipt #: ${orderData._id.toString().slice(-8).toUpperCase()}`, 50, yPosition);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 350, yPosition);
    yPosition += 20;
    doc.text(`${type === 'order' ? 'Order' : 'Booking'} ID: ${orderData.combinedId || orderData._id}`, 50, yPosition);
    yPosition += 30;
    
    // Customer Info
    doc.fontSize(14).text('Customer Information:', 50, yPosition);
    yPosition += 20;
    doc.fontSize(11);
    if (orderData.customerId) {
      doc.text(`Customer: ${orderData.customerId.name || 'N/A'}`, 50, yPosition);
      yPosition += 15;
      doc.text(`Email: ${orderData.customerId.email || 'N/A'}`, 50, yPosition);
      yPosition += 15;
    }
    
    // Store Info
    if (orderData.storeId) {
      doc.text(`Store: ${orderData.storeId.name || 'N/A'}`, 50, yPosition);
      yPosition += 15;
      doc.text(`Store Email: ${orderData.storeId.contactInfo?.email || 'N/A'}`, 50, yPosition);
      yPosition += 15;
      doc.text(`Store Phone: ${orderData.storeId.contactInfo?.phone || 'N/A'}`, 50, yPosition);
      yPosition += 30;
    }
    
    // Payment Information
    doc.fontSize(14).text('Payment Information:', 50, yPosition);
    yPosition += 20;
    doc.fontSize(11);
    doc.text(`Payment Method: ${getPaymentMethodDisplay(orderData.paymentDetails?.paymentMethod)}`, 50, yPosition);
    yPosition += 15;
    doc.text(`Payment Status: ${orderData.paymentDetails?.paymentStatus || 'Pending'}`, 50, yPosition);
    yPosition += 15;
    
    if (orderData.paymentDetails?.bankTransferReference) {
      doc.text(`Bank Transfer Reference: ${orderData.paymentDetails.bankTransferReference}`, 50, yPosition);
      yPosition += 15;
    }
    
    if (orderData.paymentDetails?.transactionId) {
      doc.text(`Transaction ID: ${orderData.paymentDetails.transactionId}`, 50, yPosition);
      yPosition += 15;
    }
    yPosition += 15;
    
    // Items/Services
    doc.fontSize(14).text(type === 'order' ? 'Items Ordered:' : 'Service Booked:', 50, yPosition);
    yPosition += 20;
    
    // Table headers
    doc.fontSize(11);
    doc.text('Description', 50, yPosition);
    doc.text('Qty', 300, yPosition);
    doc.text('Price', 350, yPosition);
    doc.text('Total', 450, yPosition);
    yPosition += 15;
    
    // Draw line under headers
    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 10;
    
    if (type === 'order' && orderData.items) {
      // Order items
      orderData.items.forEach(item => {
        doc.text(item.productId?.title || 'Product', 50, yPosition);
        doc.text(item.quantity.toString(), 300, yPosition);
        doc.text(`LKR ${item.price.toFixed(2)}`, 350, yPosition);
        doc.text(`LKR ${(item.price * item.quantity).toFixed(2)}`, 450, yPosition);
        yPosition += 20;
      });
    } else if (type === 'booking') {
      // Booking service
      doc.text(orderData.serviceId?.title || 'Service', 50, yPosition);
      doc.text('1', 300, yPosition);
      doc.text(`LKR ${orderData.totalAmount.toFixed(2)}`, 350, yPosition);
      doc.text(`LKR ${orderData.totalAmount.toFixed(2)}`, 450, yPosition);
      yPosition += 20;
      
      if (orderData.bookingDetails) {
        doc.text(`Date: ${new Date(orderData.bookingDetails.date).toLocaleDateString()}`, 50, yPosition);
        yPosition += 15;
        doc.text(`Time: ${orderData.bookingDetails.startTime} - ${orderData.bookingDetails.endTime}`, 50, yPosition);
        yPosition += 20;
      }
    }
    
    // Draw line before totals
    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 15;
    
    // Totals
    doc.text(`Subtotal: LKR ${orderData.totalAmount.toFixed(2)}`, 350, yPosition);
    yPosition += 15;
    if (orderData.platformFee) {
      doc.text(`Platform Fee: LKR ${orderData.platformFee.toFixed ? orderData.platformFee.toFixed(2) : orderData.platformFee}`, 350, yPosition);
      yPosition += 15;
    }
    doc.fontSize(12).text(`Total Amount: LKR ${orderData.totalAmount.toFixed(2)}`, 350, yPosition);
    yPosition += 30;
    
    // Shipping Address (for orders)
    if (type === 'order' && orderData.shippingAddress) {
      doc.fontSize(14).text('Shipping Address:', 50, yPosition);
      yPosition += 20;
      doc.fontSize(11);
      const address = orderData.shippingAddress;
      if (address.street) {
        doc.text(address.street, 50, yPosition);
        yPosition += 15;
      }
      if (address.city || address.state) {
        doc.text(`${address.city || ''} ${address.state || ''}`, 50, yPosition);
        yPosition += 15;
      }
      if (address.zipCode || address.country) {
        doc.text(`${address.zipCode || ''} ${address.country || ''}`, 50, yPosition);
        yPosition += 30;
      }
    }
    
    // Generate QR Code for verification
    const qrData = `Receipt: ${orderData._id.toString()}\nAmount: LKR ${orderData.totalAmount}\nDate: ${new Date().toISOString()}`;
    const qrCodeBuffer = await QRCode.toBuffer(qrData, { width: 100 });
    
    // Add QR code to PDF
    doc.image(qrCodeBuffer, 450, yPosition, { width: 80 });
    doc.fontSize(10).text('Scan for verification', 450, yPosition + 90);
    
    // Footer
    yPosition += 120;
    doc.fontSize(10);
    doc.text('Thank you for your business!', 50, yPosition);
    doc.text('This is a computer-generated receipt.', 50, yPosition + 15);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, yPosition + 30);
    
    // Finalize PDF
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve(`/uploads/receipts/${fileName}`);
      });
      stream.on('error', reject);
    });
    
  } catch (error) {
    console.error('Error generating receipt:', error);
    throw error;
  }
};

const getPaymentMethodDisplay = (method) => {
  switch (method) {
    case 'payhere': return 'PayHere (Online Payment)';
    case 'bank_transfer': return 'Bank Transfer';
    case 'cod': return 'Cash on Delivery';
    default: return method || 'Unknown';
  }
};