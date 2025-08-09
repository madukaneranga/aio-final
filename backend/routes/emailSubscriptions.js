// backend/routes/emailRoutes.js
import express from "express";
import baseTemplate from "../templates/emailTemplate.js";
import { sendEmail } from "../services/emailService.js";
import EmailSubscription from "../models/EmailSubscription.js";

const router = express.Router();

router.post("/send-email", async (req, res) => {
  const {
    type,
    to,
    subject,
    title,
    body,
    buttonText,
    buttonLink,
    footer,
    orderNumber,
    trackingNumber,
    customerName,
  } = req.body;

  const html = baseTemplate({
    type,
    title,
    body,
    buttonText,
    buttonLink,
    footer,
    orderNumber,
    trackingNumber,
    customerName,
  });

  try {
    const result = await sendEmail({
      to,
      subject,
      html,
    });

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: "Email send failed" });
  }
});

const getNameFromEmail = (email) => {
  const namePart = email.split('@')[0]; // Get "john.doe123" from "john.doe123@gmail.com"

  // Optional: remove digits, replace separators, capitalize words
  return namePart
    .replace(/[0-9]/g, '')          // Remove numbers (optional)
    .replace(/[\._\-]/g, ' ')       // Replace ., _, - with spaces
    .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize each word
};

router.post("/", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const existing = await EmailSubscription.findOne({ email });

    if (existing) {
      return res.status(409).json({ message: "Email already subscribed" });
    }

    const newSubscription = new EmailSubscription({ email });
    await newSubscription.save();

    const html = baseTemplate({
      type: "welcome",
      title: "🎉 Thanks for Subscribing!",
      body  : "You’re now subscribed to our updates!",
      buttonText: "Start Shopping",
      buttonLink: "https://aiocart.lk/",
      footer: "Get ready for an amazing shopping journey with exclusive deals and premium service.",
      customerName : getNameFromEmail(email),
    });

    try {
      const result = await sendEmail({
        to: email,
        subject: '🎉 Thanks for Subscribing!',
        html,
      });

      return res.status(201).json({ success: true, result });  // return here
    } catch (err) {
      return res.status(500).json({ error: "Email send failed" });  // return here
    }

  } catch (err) {
    console.error("Email subscription error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});


export default router;
