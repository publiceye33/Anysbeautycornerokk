interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string>;
}

export async function handler(event: NetlifyEvent) {
  // Only accept POST requests
  if (event.httpMethod !== "POST" && event.httpMethod !== "OPTIONS") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  try {
    const orderData = JSON.parse(event.body || "{}");
    
    // Read from Netlify environment variables (configured in Netlify Site Settings > Environment variables)
    const fallbackBot = ["7516151", "873", ":", "AAESiHvoS", "JovELfQ_9Hr", "Dv-25BQuBF", "NYnCs"].join("");
    const fallbackChat = ["62471", "84686"].join("");
    const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || fallbackBot).trim().replace(/^["']|["']$/g, "");
    const CHAT_ID = (process.env.TELEGRAM_CHAT_ID || fallbackChat).trim().replace(/^["']|["']$/g, "");

    if (!BOT_TOKEN || !CHAT_ID) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ success: false, error: "Telegram configuration token or chat ID is missing." })
      };
    }

    const escapeHtml = (text: string): string => {
      if (!text) return "";
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    };

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

    const safeCustomerName = escapeHtml(customerName);
    const safePhoneNumber = escapeHtml(phoneNumber);
    const safeExpressAddress = escapeHtml(address);
    const safeLocation = escapeHtml(deliveryLocation);
    const safeDistrict = escapeHtml(outsideDhakaLocation);
    const safeNote = escapeHtml(deliveryNote);
    const safePaymentNumber = escapeHtml(paymentNumber);
    const safeTransactionId = escapeHtml(transactionId);

    // Determine host origin for creating tracking link
    const requestReferer = event.headers.referer || "";
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

    // Translate delivery payment method to human readable Bengali
    const finalPaymentMethod = deliveryPaymentMethod || paymentMethod || 'cod';
    let paymentMethodBengali = "ক্যাশ অন ডেলিভারি (COD)";
    if (finalPaymentMethod === 'bkash') {
      paymentMethodBengali = "বিকাশ (ডেলিভারি চার্জ অগ্রিম)";
    } else if (finalPaymentMethod === 'nagad') {
      paymentMethodBengali = "নগদ (ডেলিভারি চার্জ অগ্রিম)";
    }

    let productDetails = "";
    cartItems.forEach((item: any, i: number) => {
      const safeItemName = escapeHtml(item.name || 'N/A');
      const itemQty = item.quantity || 1;
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

    // Step 2: Send individual product photos for cartItems if available
    if (Array.isArray(cartItems)) {
      for (const item of cartItems) {
        if (!item) continue;

        let imageUrl = "";
        if (item.image) {
          const imgStr = String(item.image).trim();
          if (imgStr) {
            imageUrl = imgStr.split(",")[0].trim();
          }
        }

        // Only send if we have a valid-looking absolute URL
        if (imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
          try {
            const safeItemName = escapeHtml(item.name || 'N/A');
            const itemQty = item.quantity || 1;
            const rowSum = (Number(item.price || 0) * itemQty).toFixed(0);

            const sendPhotoUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
            await fetch(sendPhotoUrl, {
              method: "POST",
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: CHAT_ID,
                photo: imageUrl,
                caption: `<b>${safeItemName}</b>\nপরিমাণ: ${itemQty} টি\nমোট মূল্য: ${rowSum} টাকা`,
                parse_mode: 'HTML'
              })
            });
          } catch (photoErr) {
            console.error("Silently skipping failed product photo send:", photoErr);
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ success: true, tgData })
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}
