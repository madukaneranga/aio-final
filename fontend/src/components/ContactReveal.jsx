import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Lock, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }
  return data;
};

const ContactReveal = ({ store, onReveal }) => {
  const { user } = useAuth();
  
  const [revealStatus, setRevealStatus] = useState(null);
  const [contactDetails, setContactDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const requiredCredits = 1;

  // API functions
  const checkRevealEligibility = async (storeId) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/customer/reveals/${storeId}/eligibility`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(response);
  };

  const performReveal = async (storeId) => {
    const response = await fetch(`${API_BASE_URL}/api/wallet/customer/reveals/${storeId}`, {
      method: 'POST',
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(response);
  };

  // Check reveal eligibility when component mounts
  useEffect(() => {
    const checkEligibility = async () => {
      if (!user || !store?._id) {
        // If no user, just set initial state without making API calls
        if (!user) {
          setRevealStatus({ canReveal: false, reasons: { loginRequired: true } });
        }
        return;
      }
      
      try {
        const response = await checkRevealEligibility(store._id);
        console.log('🔍 Reveal eligibility response:', response); // Debug log
        if (response.success) {
          setRevealStatus({
            canReveal: response.data.canReveal,
            reasons: response.data.reasons,
            hasValidReveal: response.data.hasValidReveal,
            revealExpiresAt: response.data.revealExpiresAt,
          });
          
          // If user has valid reveal, show contact details immediately
          if (response.data.hasValidReveal && response.data.contactDetails) {
            setContactDetails(response.data.contactDetails);
          }
        }
      } catch (err) {
        console.error('Failed to check reveal eligibility:', err);
        setRevealStatus({
          canReveal: false,
          reasons: { error: true },
        });
      }
    };

    checkEligibility();
  }, [user, store?._id]);

  const handleRevealClick = async () => {
    if (!user) {
      // Redirect to login page
      window.location.href = '/login';
      return;
    }

    if (!revealStatus?.canReveal) {
      if (revealStatus?.reasons?.alreadyRevealed) {
        setError('You have already revealed this store\'s contact details today');
        return;
      }
      setError('Contact details are currently unavailable');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await performReveal(store._id);
      if (response.success) {
        setContactDetails(response.data.contactDetails);
        
        // Update reveal status
        setRevealStatus(prev => ({
          ...prev,
          canReveal: false,
          reasons: { ...prev?.reasons, alreadyRevealed: true }
        }));

        if (onReveal) {
          onReveal(response.data);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonState = () => {
    if (!user) {
      return {
        disabled: false,
        text: 'Login to View Contacts',
        icon: Lock,
        color: 'bg-black hover:bg-gray-800',
        description: 'Click to login and view contact details'
      };
    }

    if (contactDetails) {
      if (revealStatus?.hasValidReveal) {
        return {
          disabled: true,
          text: 'Contact Details Available',
          icon: CheckCircle,
          color: 'bg-black',
          description: 'Contact details available until ' + (revealStatus.revealExpiresAt ? new Date(revealStatus.revealExpiresAt).toLocaleString() : 'tomorrow')
        };
      } else {
        return {
          disabled: true,
          text: 'Already Revealed',
          icon: CheckCircle,
          color: 'bg-black',
          description: 'Contact details revealed today'
        };
      }
    }

    if (revealStatus?.canReveal) {
      return {
        disabled: false,
        text: 'View Contact Details',
        icon: Eye,
        color: 'bg-black hover:bg-gray-800',
        description: 'Click to reveal contact information'
      };
    }

    if (revealStatus?.reasons?.insufficientOwnerCredits) {
      return {
        disabled: true,
        text: 'Contact Unavailable',
        icon: AlertCircle,
        color: 'bg-gray-300',
        description: 'Store owner needs to purchase credits'
      };
    }

    if (revealStatus?.reasons?.error) {
      return {
        disabled: true,
        text: 'Contact Unavailable',
        icon: AlertCircle,
        color: 'bg-gray-300',
        description: 'Unable to load contact information'
      };
    }

    // Still loading or initial state
    return {
      disabled: true,
      text: 'Loading...',
      icon: Loader2,
      color: 'bg-gray-400',
      description: 'Loading contact information'
    };
  };

  const buttonState = getButtonState();
  const ButtonIcon = buttonState.icon;

  return (
    <div className="space-y-3">

      {/* Contact Details (if revealed) */}
      {contactDetails && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-black font-medium">
              <CheckCircle className="w-4 h-4" />
              <span>Contact Details Revealed</span>
            </div>
            {revealStatus?.revealExpiresAt && (
              <div className="text-xs text-gray-600">
                Available until {new Date(revealStatus.revealExpiresAt).toLocaleString()}
              </div>
            )}
          </div>
          <div className="space-y-1 text-sm">
            {contactDetails.email && (
              <div>
                <span className="font-medium">Email:</span>{' '}
                <a href={`mailto:${contactDetails.email}`} className="text-black hover:text-gray-600 hover:underline">
                  {contactDetails.email}
                </a>
              </div>
            )}
            {contactDetails.phone && (
              <div>
                <span className="font-medium">Phone:</span>{' '}
                <a href={`tel:${contactDetails.phone}`} className="text-black hover:text-gray-600 hover:underline">
                  {contactDetails.phone}
                </a>
              </div>
            )}
            {contactDetails.whatsapp && (
              <div>
                <span className="font-medium">WhatsApp:</span>{' '}
                <a 
                  href={`https://wa.me/${contactDetails.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="text-black hover:text-gray-600 hover:underline"
                >
                  {contactDetails.whatsapp}
                </a>
              </div>
            )}
            {contactDetails.address && (
              <div>
                <span className="font-medium">Address:</span>{' '}
                <span className="text-gray-700">{contactDetails.address}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reveal Button */}
      <button
        onClick={handleRevealClick}
        disabled={buttonState.disabled || isLoading}
        className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-white font-medium transition-colors ${buttonState.color} disabled:opacity-50 disabled:cursor-not-allowed`}
        title={buttonState.description}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ButtonIcon className={`w-4 h-4 ${buttonState.icon === Loader2 ? 'animate-spin' : ''}`} />
        )}
        <span>{isLoading ? 'Revealing...' : buttonState.text}</span>
      </button>

      {/* Error Display */}
      {error && (
        <div className="bg-gray-100 border border-gray-300 rounded p-3">
          <div className="flex items-center space-x-2 text-black text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

    </div>
  );
};


export default ContactReveal;