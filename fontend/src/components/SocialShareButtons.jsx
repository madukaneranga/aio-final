import React, { useState } from "react";
import { 
  Facebook, 
  Instagram, 
  MessageCircle, 
  Copy, 
  Share2,
  Check
} from "lucide-react";
import { formatLKR } from "../utils/currency";

const SocialShareButtons = ({ 
  purchaseData, 
  type = "order", 
  className = "" 
}) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState({});

  if (!purchaseData) return null;

  // Generate share content based on purchase type
  const generateShareContent = (platform) => {
    const isOrder = type === "order";
    const purchaseType = isOrder ? "order" : "booking";
    const itemText = isOrder 
      ? purchaseData.items?.length === 1 
        ? purchaseData.items[0].productId?.title || "product"
        : `${purchaseData.items?.length || 0} items`
      : purchaseData.serviceId?.title || "service";
    
    const storeName = purchaseData.storeId?.name || "AIO Cart";
    const totalAmount = formatLKR(purchaseData.totalAmount);
    
    const baseContent = {
      text: `Just ${isOrder ? "ordered" : "booked"} ${itemText} from ${storeName} on AIO Cart! 🛒✨`,
      hashtags: ["AIOCart", "OnlineShopping", "SriLanka", storeName.replace(/\s+/g, '')],
      url: window.location.origin
    };

    switch (platform) {
      case 'facebook':
        return {
          ...baseContent,
          text: `${baseContent.text} Total: ${totalAmount}. Check out AIO Cart for amazing deals! #AIOCart #Shopping`
        };
        
      case 'instagram':
        return {
          ...baseContent,
          text: `${baseContent.text} 💳 Amazing shopping experience! #${baseContent.hashtags.join(' #')}`
        };
        
      case 'whatsapp':
        return {
          ...baseContent,
          text: `🛍️ ${baseContent.text}\n💰 Total: ${totalAmount}\n📱 Shop at: ${baseContent.url}\n\nGreat deals await you on AIO Cart!`
        };
        
      case 'copy':
        return {
          ...baseContent,
          text: `🛍️ ${baseContent.text}\nTotal: ${totalAmount}\nShop at: ${baseContent.url}\n\n#AIOCart #OnlineShopping #SriLanka`
        };
        
      default:
        return baseContent;
    }
  };

  // Handle Facebook share
  const handleFacebookShare = () => {
    const content = generateShareContent('facebook');
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?` +
      `u=${encodeURIComponent(content.url)}&` +
      `quote=${encodeURIComponent(content.text)}`;
    
    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    window.open(
      facebookUrl,
      'facebook-share',
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1`
    );
    
    setShared({ ...shared, facebook: true });
    setTimeout(() => setShared({ ...shared, facebook: false }), 3000);
  };

  // Handle WhatsApp share
  const handleWhatsAppShare = () => {
    const content = generateShareContent('whatsapp');
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(content.text)}`;
    
    window.open(whatsappUrl, '_blank');
    
    setShared({ ...shared, whatsapp: true });
    setTimeout(() => setShared({ ...shared, whatsapp: false }), 3000);
  };

  // Handle Instagram share (copy to clipboard with instructions)
  const handleInstagramShare = () => {
    const content = generateShareContent('instagram');
    
    navigator.clipboard.writeText(content.text).then(() => {
      setShared({ ...shared, instagram: true });
      
      // Show instructions for Instagram
      alert(
        "Caption copied to clipboard! 📋\n\n" +
        "To share on Instagram:\n" +
        "1. Open Instagram app\n" +
        "2. Create a new post or story\n" +
        "3. Paste the copied caption\n" +
        "4. Add your own photo or use our branded template!"
      );
      
      setTimeout(() => setShared({ ...shared, instagram: false }), 3000);
    }).catch(() => {
      alert("Unable to copy to clipboard. Please try again.");
    });
  };

  // Handle copy to clipboard
  const handleCopyLink = () => {
    const content = generateShareContent('copy');
    
    navigator.clipboard.writeText(content.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = content.text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  // Handle native share API if available
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const content = generateShareContent('native');
        await navigator.share({
          title: `My ${type} from AIO Cart`,
          text: content.text,
          url: content.url
        });
        
        setShared({ ...shared, native: true });
        setTimeout(() => setShared({ ...shared, native: false }), 3000);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Share Your Purchase! 🎉
        </h3>
        <p className="text-gray-600 text-sm">
          Let your friends know about your great shopping experience
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Facebook Share */}
        <button
          onClick={handleFacebookShare}
          className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all hover:scale-105 ${
            shared.facebook 
              ? "border-blue-500 bg-blue-50 text-blue-700" 
              : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
          }`}
        >
          {shared.facebook ? (
            <Check className="w-6 h-6 text-blue-500 mb-2" />
          ) : (
            <Facebook className="w-6 h-6 text-blue-600 mb-2" />
          )}
          <span className="text-sm font-medium">
            {shared.facebook ? "Shared!" : "Facebook"}
          </span>
        </button>

        {/* Instagram Share */}
        <button
          onClick={handleInstagramShare}
          className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all hover:scale-105 ${
            shared.instagram 
              ? "border-pink-500 bg-pink-50 text-pink-700" 
              : "border-gray-200 hover:border-pink-300 hover:bg-pink-50"
          }`}
        >
          {shared.instagram ? (
            <Check className="w-6 h-6 text-pink-500 mb-2" />
          ) : (
            <Instagram className="w-6 h-6 text-pink-600 mb-2" />
          )}
          <span className="text-sm font-medium">
            {shared.instagram ? "Copied!" : "Instagram"}
          </span>
        </button>

        {/* WhatsApp Share */}
        <button
          onClick={handleWhatsAppShare}
          className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all hover:scale-105 ${
            shared.whatsapp 
              ? "border-green-500 bg-green-50 text-green-700" 
              : "border-gray-200 hover:border-green-300 hover:bg-green-50"
          }`}
        >
          {shared.whatsapp ? (
            <Check className="w-6 h-6 text-green-500 mb-2" />
          ) : (
            <MessageCircle className="w-6 h-6 text-green-600 mb-2" />
          )}
          <span className="text-sm font-medium">
            {shared.whatsapp ? "Shared!" : "WhatsApp"}
          </span>
        </button>

        {/* Copy/Native Share */}
        {navigator.share ? (
          <button
            onClick={handleNativeShare}
            className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all hover:scale-105 ${
              shared.native 
                ? "border-purple-500 bg-purple-50 text-purple-700" 
                : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
            }`}
          >
            {shared.native ? (
              <Check className="w-6 h-6 text-purple-500 mb-2" />
            ) : (
              <Share2 className="w-6 h-6 text-purple-600 mb-2" />
            )}
            <span className="text-sm font-medium">
              {shared.native ? "Shared!" : "Share"}
            </span>
          </button>
        ) : (
          <button
            onClick={handleCopyLink}
            className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all hover:scale-105 ${
              copied 
                ? "border-gray-500 bg-gray-50 text-gray-700" 
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {copied ? (
              <Check className="w-6 h-6 text-gray-500 mb-2" />
            ) : (
              <Copy className="w-6 h-6 text-gray-600 mb-2" />
            )}
            <span className="text-sm font-medium">
              {copied ? "Copied!" : "Copy"}
            </span>
          </button>
        )}
      </div>

      {/* Share Statistics/Incentive */}
      <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          💡 <strong>Pro Tip:</strong> Friends who shop through your shares get 5% off their first order!
        </p>
      </div>
    </div>
  );
};

export default SocialShareButtons;