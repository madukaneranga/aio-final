import React from 'react';
import { 
  Phone,
  Mail,
  MapPin,
  MessageCircle
} from 'lucide-react';

const ContactReveal = ({ store }) => {
  // Extract contact details directly from the store object
  const contactDetails = {
    email: store?.contactInfo?.email || store?.email,
    phone: store?.contactInfo?.phone || store?.phone,
    whatsapp: store?.contactInfo?.whatsapp || store?.whatsapp,
    address: store?.contactInfo?.address || store?.address,
  };

  // Check if we have any contact information
  const hasContactInfo = contactDetails.email || contactDetails.phone || 
                        contactDetails.whatsapp || contactDetails.address;

  if (!hasContactInfo) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-center text-gray-500">
          <Phone className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No contact information available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center space-x-2 text-gray-800 font-medium mb-3">
        <Phone className="w-4 h-4" />
        <span>Contact Information</span>
      </div>
      
      <div className="space-y-3">
        {contactDetails.email && (
          <div className="flex items-start space-x-3">
            <Mail className="w-4 h-4 mt-1 text-gray-600" />
            <div>
              <span className="text-sm text-gray-600">Email</span>
              <div>
                <a 
                  href={`mailto:${contactDetails.email}`} 
                  className="text-black hover:text-gray-600 hover:underline font-medium"
                >
                  {contactDetails.email}
                </a>
              </div>
            </div>
          </div>
        )}
        
        {contactDetails.phone && (
          <div className="flex items-start space-x-3">
            <Phone className="w-4 h-4 mt-1 text-gray-600" />
            <div>
              <span className="text-sm text-gray-600">Phone</span>
              <div>
                <a 
                  href={`tel:${contactDetails.phone}`} 
                  className="text-black hover:text-gray-600 hover:underline font-medium"
                >
                  {contactDetails.phone}
                </a>
              </div>
            </div>
          </div>
        )}
        
        {contactDetails.whatsapp && (
          <div className="flex items-start space-x-3">
            <MessageCircle className="w-4 h-4 mt-1 text-gray-600" />
            <div>
              <span className="text-sm text-gray-600">WhatsApp</span>
              <div>
                <a 
                  href={`https://wa.me/${contactDetails.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="text-black hover:text-gray-600 hover:underline font-medium"
                >
                  {contactDetails.whatsapp}
                </a>
              </div>
            </div>
          </div>
        )}
        
        {contactDetails.address && (
          <div className="flex items-start space-x-3">
            <MapPin className="w-4 h-4 mt-1 text-gray-600" />
            <div>
              <span className="text-sm text-gray-600">Address</span>
              <div className="text-gray-800 font-medium">
                {contactDetails.address}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default ContactReveal;