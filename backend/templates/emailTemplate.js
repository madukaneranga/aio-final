// backend/templates/baseTemplate.js
export default function baseTemplate({
  type = "general",
  title,
  body,
  buttonText,
  buttonLink,
  footer,
  orderNumber,
  trackingNumber,
  customerName,
}) {
  // Email type specific configurations
  const emailConfigs = {
    "order-confirmation": {
      icon: "✓",
      headerColor: "#000000",
      headerText: "Order Confirmed",
    },
    "shipping-update": {
      icon: "🚚",
      headerColor: "#000000",
      headerText: "Shipping Update",
    },
    welcome: {
      icon: "👋",
      headerColor: "#000000",
      headerText: "Welcome to AIO",
    },
    marketing: {
      icon: "✨",
      headerColor: "#000000",
      headerText: "Special Offer",
    },
    general: {
      icon: "",
      headerColor: "#000000",
      headerText: "",
    },
  };

  const config = emailConfigs[type] || emailConfigs["general"];
  const greeting = customerName ? `Hello ${customerName},` : "Hello,";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }
        
        .header {
            background: linear-gradient(135deg, #000000 0%, #333333 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 3px;
            margin-bottom: 8px;
        }
        
        .tagline {
            color: #cccccc;
            font-size: 14px;
            font-weight: 300;
            letter-spacing: 1px;
        }
        
        .email-type-header {
            background-color: #f8f9fa;
            padding: 20px 30px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .email-type-title {
            font-size: 18px;
            font-weight: 600;
            color: ${config.headerColor};
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 16px;
            color: #666666;
            margin-bottom: 20px;
        }
        
        .main-title {
            font-size: 28px;
            font-weight: 600;
            color: #000000;
            margin-bottom: 24px;
            line-height: 1.3;
        }
        
        .body-content {
            font-size: 16px;
            color: #444444;
            line-height: 1.7;
            margin-bottom: 32px;
        }
        
        .order-details {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }
        
        .order-details h3 {
            font-size: 16px;
            font-weight: 600;
            color: #000000;
            margin-bottom: 12px;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .detail-row:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            font-weight: 500;
            color: #666666;
        }
        
        .detail-value {
            font-weight: 600;
            color: #000000;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #000000 0%, #333333 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            letter-spacing: 0.5px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            margin: 20px 0;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        }
        
        .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #e9ecef, transparent);
            margin: 40px 0;
        }
        
        .footer {
            background-color: #f8f9fa;
            padding: 40px 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer-content {
            margin-bottom: 24px;
        }
        
        .footer-text {
            font-size: 14px;
            color: #666666;
            line-height: 1.6;
        }
        
        .social-links {
            margin: 24px 0;
        }
        
        .social-links a {
            display: inline-block;
            margin: 0 12px;
            color: #666666;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: color 0.3s ease;
        }
        
        .social-links a:hover {
            color: #000000;
        }
        
        .contact-info {
            margin: 20px 0;
            font-size: 14px;
            color: #888888;
        }
        
        .unsubscribe {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            font-size: 12px;
            color: #999999;
        }
        
        .unsubscribe a {
            color: #666666;
            text-decoration: underline;
        }
        
        /* Mobile Responsive */
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 0;
                box-shadow: none;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            .logo {
                font-size: 28px;
                letter-spacing: 2px;
            }
            
            .content {
                padding: 30px 20px;
            }
            
            .email-type-header {
                padding: 15px 20px;
            }
            
            .main-title {
                font-size: 24px;
            }
            
            .body-content {
                font-size: 15px;
            }
            
            .cta-button {
                display: block;
                text-align: center;
                padding: 14px 24px;
                font-size: 15px;
            }
            
            .footer {
                padding: 30px 20px;
            }
            
            .social-links a {
                display: block;
                margin: 8px 0;
            }
            
            .order-details {
                padding: 16px;
            }
            
            .detail-row {
                flex-direction: column;
                gap: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">AIO</div>
            <div class="tagline">Premium Ecommerce Experience</div>
        </div>
        
        <!-- Email Type Header -->
        ${
          config.headerText
            ? `
        <div class="email-type-header">
            <div class="email-type-title">
                <span>${config.icon}</span>
                ${config.headerText}
            </div>
        </div>
        `
            : ""
        }
        
        <!-- Main Content -->
        <div class="content">
            <div class="greeting">${greeting}</div>
            
            ${title ? `<h1 class="main-title">${title}</h1>` : ""}
            
            <div class="body-content">
                ${body}
            </div>
            
            <!-- Order Details (for order-related emails) -->
            ${
              orderNumber || trackingNumber
                ? `
            <div class="order-details">
                <h3>Order Information</h3>
                ${
                  orderNumber
                    ? `
                <div class="detail-row">
                    <span class="detail-label">Order Number:</span>
                    <span class="detail-value">#${orderNumber}</span>
                </div>
                `
                    : ""
                }
                ${
                  trackingNumber
                    ? `
                <div class="detail-row">
                    <span class="detail-label">Tracking Number:</span>
                    <span class="detail-value">${trackingNumber}</span>
                </div>
                `
                    : ""
                }
            </div>
            `
                : ""
            }
            
            <!-- CTA Button -->
            ${
              buttonText && buttonLink
                ? `
            <div style="text-align: center;">
                <a href="${buttonLink}" class="cta-button">${buttonText}</a>
            </div>
            `
                : ""
            }
            
            <div class="divider"></div>
            
            ${
              footer
                ? `
            <div class="footer-content">
                <div class="footer-text">${footer}</div>
            </div>
            `
                : ""
            }
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="social-links">
                <a href="#" style="margin-right: 20px;">Facebook</a>
                <a href="#" style="margin-right: 20px;">Instagram</a>
                <a href="#" style="margin-right: 20px;">Twitter</a>
                <a href="https://aiocart.lk">Website</a>
            </div>
            
            <div class="contact-info">
                <div>AIO Cart - Premium Ecommerce Platform</div>
                <div>Visit us at <a href="https://aiocart.lk" style="color: #000000;">aiocart.lk</a></div>
                <div>Need help? Contact our support team</div>
            </div>
            
            <div class="unsubscribe">
                <p>You received this email because you have an account with AIO Cart.</p>
                <p><a href="#">Unsubscribe</a> | <a href="#">Update Preferences</a> | <a href="#">Privacy Policy</a></p>
            </div>
        </div>
    </div>
</body>
</html>
  `;
}

// Usage examples:
// Order Confirmation Email
// baseTemplate({
//   type: 'order-confirmation',
//   title: 'Your Order Has Been Confirmed!',
//   body: 'Thank you for your purchase. Your order has been received and is being processed.',
//   buttonText: 'Track Your Order',
//   buttonLink: 'https://aiocart.lk/orders/track',
//   orderNumber: '12345',
//   customerName: 'John Doe',
//   footer: 'We\'ll send you shipping updates as your order progresses.'
// });

// Shipping Update Email
// baseTemplate({
//   type: 'shipping-update',
//   title: 'Your Order Is On The Way!',
//   body: 'Great news! Your order has been shipped and is on its way to you.',
//   buttonText: 'Track Package',
//   buttonLink: 'https://aiocart.lk/tracking',
//   orderNumber: '12345',
//   trackingNumber: 'TR123456789',
//   customerName: 'John Doe'
// });

// Welcome Email
// baseTemplate({
//   type: 'welcome',
//   title: 'Welcome to AIO Cart!',
//   body: 'We\'re thrilled to have you join our community of discerning shoppers. Discover premium products and enjoy an exceptional shopping experience.',
//   buttonText: 'Start Shopping',
//   buttonLink: 'https://aiocart.lk/shop',
//   customerName: 'John Doe',
//   footer: 'Get ready for an amazing shopping journey with exclusive deals and premium service.'
// });

// Marketing Email
// baseTemplate({
//   type: 'marketing',
//   title: 'Exclusive Sale - Up to 50% Off!',
//   body: 'Don\'t miss out on our biggest sale of the year. Premium products at unbeatable prices, available for a limited time only.',
//   buttonText: 'Shop Now',
//   buttonLink: 'https://aiocart.lk/sale',
//   customerName: 'John Doe',
//   footer: 'Sale ends in 48 hours. Terms and conditions apply.'
// });
