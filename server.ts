import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
dotenv.config({ override: true });

const app = express();
app.use(express.json());

const PORT = 3000;

// Helper function to escape HTML special characters for Telegram API parse_mode: 'HTML' security
function escapeHtml(text: string): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Secure server-side endpoint for Telegram order receipt routing
app.post("/api/telegram", async (req, res) => {
  try {
    const orderData = req.body;
    const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim().replace(/^["']|["']$/g, "");
    const CHAT_ID = (process.env.TELEGRAM_CHAT_ID || "").trim().replace(/^["']|["']$/g, "");

    if (!BOT_TOKEN || !CHAT_ID) {
      console.warn("Telegram configuration token or chat ID is missing from .env.");
      res.json({ success: true, message: "Skipped notification (credentials missing in environment)" });
      return;
    }

    const {
      customerName = 'N/A',
      phoneNumber = 'N/A',
      address = 'N/A',
      orderId = 'N/A',
      deliveryLocation = 'N/A',
      deliveryPaymentMethod = 'cod',
      paymentMethod = 'cod',
      paymentNumber = 'N/A',
      transactionId = 'N/A',
      outsideDhakaLocation = 'N/A',
      deliveryNote = 'N/A',
      subTotal = '0',
      deliveryFee = '0',
      totalAmount = '0',
      cartItems = [],
      hostOrigin = ""
    } = orderData;

    // Use safety escaping on all user-supplied raw strings to prevent HTML malformation errors
    const safeCustomerName = escapeHtml(customerName);
    const safePhoneNumber = escapeHtml(phoneNumber);
    const safeExpressAddress = escapeHtml(address);
    const safeLocation = escapeHtml(deliveryLocation);
    const safeDistrict = escapeHtml(outsideDhakaLocation);
    const safeNote = escapeHtml(deliveryNote);
    const safePaymentNumber = escapeHtml(paymentNumber);
    const safeTransactionId = escapeHtml(transactionId);

    // Determine clean client-facing storefront base url
    const requestReferer = req.headers.referer || "";
    const activeOrigin = hostOrigin || requestReferer;
    let cleanOrigin = "";
    if (activeOrigin) {
      try {
        const urlObj = new URL(activeOrigin);
        cleanOrigin = urlObj.origin;
      } catch (e) {
        // Skip
      }
    }

    // Determine readable payment method translation
    const finalPaymentMethod = deliveryPaymentMethod || paymentMethod || 'cod';
    let paymentMethodBengali = "ক্যাশ অন ডেলিভারি (COD)";
    if (finalPaymentMethod === 'bkash') {
      paymentMethodBengali = "বিকাশ (অগ্রিম পেমেন্ট)";
    } else if (finalPaymentMethod === 'nagad') {
      paymentMethodBengali = "নগদ (অগ্রিম পেমেন্ট)";
    }

    let productDetails = "";
    cartItems.forEach((item: any, i: number) => {
      const safeItemName = escapeHtml(item.name || 'N/A');
      const itemQty = item.quantity || 1;
      const itemPrice = Number(item.price || 0).toFixed(0);
      const rowSum = (Number(item.price || 0) * itemQty).toFixed(0);
      productDetails += `${i + 1}. ${safeItemName} (x${itemQty}) - ${rowSum} টাকা\n`;
    });

    let messageText = `🚨 <b>নতুন অর্ডার এসেছে!</b> (ID: ${escapeHtml(orderId)}) 🚨\n`;
    messageText += `➖➖➖➖➖➖➖➖➖➖\n`;
    messageText += `<b>👤 গ্রাহকের তথ্য:</b>\n`;
    messageText += `<b>নাম:</b> ${safeCustomerName}\n`;
    messageText += `<b>ফোন:</b> <a href="tel:${safePhoneNumber}">${safePhoneNumber}</a>\n`;
    messageText += `<b>ঠিকানা:</b> ${safeExpressAddress}\n`;
    messageText += `<b>এলাকা:</b> ${safeLocation}\n`;
    
    if (safeLocation.includes("বাইরে") && safeDistrict !== 'N/A' && safeDistrict !== '') {
      messageText += `<b>জেলা/থানা:</b> ${safeDistrict}\n`;
    }
    
    if (safeNote !== 'N/A' && safeNote !== '') {
      messageText += `<b>বিশেষ নোট:</b> ${safeNote}\n`;
    }

    messageText += `➖➖➖➖➖➖➖➖➖➖\n`;
    messageText += `<b>🛍️ পণ্যের তালিকা:</b>\n${productDetails}`;
    messageText += `➖➖➖➖➖➖➖➖➖➖\n`;
    messageText += `<b>💰 পেমেন্টের তথ্য:</b>\n`;
    messageText += `<b>পেমেন্ট পদ্ধতি:</b> ${paymentMethodBengali}\n`;
    
    if (finalPaymentMethod === 'bkash' || finalPaymentMethod === 'nagad') {
      messageText += `<b>প্রেরক নম্বর:</b> ${safePaymentNumber}\n`;
      messageText += `<b>ট্রানজেকশন আইডি:</b> <code>${safeTransactionId}</code>\n`;
    }

    messageText += `<b>সাব-টোটাল:</b> ${Number(subTotal).toFixed(0)} টাকা\n`;
    messageText += `<b>ডেলিভারি ফি:</b> ${Number(deliveryFee).toFixed(0)} টাকা\n`;
    messageText += `<b>মোট মূল্য:</b> <b>${Number(totalAmount).toFixed(0)} টাকা</b>\n`;

    if (cleanOrigin) {
      messageText += `➖➖➖➖➖➖➖➖➖➖\n`;
      messageText += `<b>🔗 অর্ডার ট্র্যাক করার লিংক:</b>\n`;
      messageText += `<a href="${cleanOrigin}/#/order-track?orderId=${escapeHtml(orderId)}">এখানে ক্লিক করুন</a>\n`;
    }

    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const tgResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: messageText,
        parse_mode: 'HTML'
      })
    });

    const tgData = await tgResponse.json();
    if (!tgResponse.ok) {
      console.error("Telegram API sendMessage failed directly on Telegram Server:", tgData);
    } else {
      console.log("Telegram notification sent successfully to ID:", CHAT_ID);
    }
    res.json({ success: tgResponse.ok, data: tgData });
  } catch (error: any) {
    console.error("Telegram notification routing error failed on Server:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Configure Vite middleware or Static files serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running cleanly on http://localhost:${PORT}`);
  });
}

setupViteOrStatic();
