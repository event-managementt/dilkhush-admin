

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 2 Sheets setup
    let mainSheet = ss.getSheetByName("Appointments");
    if (!mainSheet) {
      mainSheet = ss.getActiveSheet();
      mainSheet.setName("Appointments");
    }
    let historySheet = ss.getSheetByName("History");
    if (!historySheet) {
      historySheet = ss.insertSheet("History");
    }

    const payload = JSON.parse(e.postData.contents);

    // --- 1. DASHBOARD SE "COMPLETED" MARK KARNE KE LIYE (Move to History) ---
    if (payload.action === 'markDone') {
      const displayData = mainSheet.getDataRange().getDisplayValues();
      const rawData = mainSheet.getDataRange().getValues();
      const headers = rawData[0];

      for (let i = 1; i < displayData.length; i++) {
        if (displayData[i][0] === '#' + payload.token) {
          let rowToMove = rawData[i];
          rowToMove[10] = 'Completed'; 
          
          if (historySheet.getLastRow() === 0) {
            historySheet.appendRow(headers);
            historySheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#fcf4e3");
          }
          
          historySheet.appendRow(rowToMove);
          mainSheet.deleteRow(i + 1); 
          
          return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Token not found"})).setMimeType(ContentService.MimeType.JSON);
    }

    // --- 2. NAYA APPOINTMENT SAVE KARNA ---
    const headers = ["Token", "Timestamp", "First Name", "Last Name", "Email", "Phone", "Services", "Stylist", "App Date", "App Time", "Status"];
    if (mainSheet.getLastRow() === 0) {
      mainSheet.appendRow(headers);
      mainSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#fcf4e3");
    }

    let lastRow = mainSheet.getLastRow();
    let tokenNum = 1;
    if (lastRow > 1) {
      let lastTokenVal = mainSheet.getRange(lastRow, 1).getValue().toString().replace('#', '');
      tokenNum = parseInt(lastTokenVal) + 1;
    }
    let tokenStr = '#' + tokenNum.toString().padStart(2, '0');

    const rowData = [
      tokenStr, new Date(), payload.fname, payload.lname, payload.email, payload.phone,
      payload.service, payload.stylist, payload.appointment_date, payload.appointment_time, "Pending"
    ];
    mainSheet.appendRow(rowData);

    // Confirmation Email Bhejna
    sendProfessionalEmail(payload, tokenStr);

    return ContentService.createTextOutput(JSON.stringify({status: "success", token: tokenStr})).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

// Time helper
function formatTime12h(timeStr) {
  if (!timeStr) return "";
  let [hours, minutes] = timeStr.split(':');
  let modifier = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${modifier}`;
}

// --- 3. PROFESSIONAL EMAIL WITH STYLISH MAPS SECTION ---
function sendProfessionalEmail(data, token) {
  const scriptUrl = 'https://script.google.com/macros/s/AKfycbxqKtQA1hyX3tfnlVHIEZqhjYZ1VygHlVYrJpnvKqCT1UGpwwvESZjMmwcITgbv0h_t2A/exec';
  const confirmUrl = `${scriptUrl}?action=confirm&token=${encodeURIComponent(token)}`;
  
  const salonAddress = "Shop no: 36, PRAMUKH PARAMOUNT, Kudasan, Gandhinagar, Gujarat 382419";
  // Aapka naya link yahan set kar diya hai
  const mapsLink = "https://maps.app.goo.gl/ErvhzufaNxKpEyXa8";

  const simpleTime = formatTime12h(data.appointment_time);
  const uniqueId = new Date().getTime();

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 1px solid #e0e0e0; padding: 30px; border-radius: 15px; max-width: 500px; background-color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #b5952f; margin: 0; font-size: 28px; letter-spacing: 1px;">DilKhush Salon</h2>
        <div style="width: 50px; height: 2px; background: #b5952f; margin: 10px auto;"></div>
      </div>
      
      <p style="font-size: 16px; color: #333;">Hello <strong>${data.fname}</strong>,</p>
      <p style="color: #555; line-height: 1.6;">Aapka appointment request humein mil gaya hai. Please niche button par click karke confirm karein:</p>
      
      <div style="background: #fdfaf3; padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #b5952f;">
        <p style="margin: 5px 0;"><strong>Token:</strong> <span style="color: #b5952f;">${token}</span></p>
        <p style="margin: 5px 0;"><strong>Service:</strong> ${data.service}</p>
        <p style="margin: 5px 0;"><strong>Stylist:</strong> ${data.stylist || 'Any Available'}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${simpleTime} on ${data.appointment_date}</p>
      </div>

      <div style="text-align: center; margin-bottom: 25px;">
        <a href="${confirmUrl}" style="background: #b5952f; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; width: 85%;">Confirm My Booking</a>
      </div>

      <div style="background-color: #f8f9fa; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #eee;">
        <div style="font-size: 24px; margin-bottom: 5px;">📍</div>
        <p style="margin: 0; color: #333; font-weight: 700; font-size: 16px;">Our Location</p>
        <p style="margin: 5px 0 15px 0; color: #666; font-size: 13px; line-height: 1.4;">${salonAddress}</p>
        <a href="${mapsLink}" style="background-color: #ffffff; color: #b5952f; border: 1.5px solid #b5952f; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 14px;">Open Google Maps</a>
      </div>
      
      <p style="font-size: 11px; color: #999; margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
        Ref: ${token}-${uniqueId}
      </p>
    </div>
  `;

  MailApp.sendEmail({
    to: data.email,
    subject: `Action Required: Confirm Your Appointment ${token} - DilKhush Salon`,
    htmlBody: htmlBody
  });
}

// --- 4. DASHBOARD & EMAIL CLICKS ---
function doGet(e) {
  const action = e.parameter.action;
  const token = e.parameter.token;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let mainSheet = ss.getSheetByName("Appointments") || ss.getActiveSheet();
  let historySheet = ss.getSheetByName("History");

  if (action === 'getDashboardData') {
    let live = [], history = [];
    if (mainSheet.getLastRow() > 1) {
      const liveRows = mainSheet.getDataRange().getDisplayValues();
      for (let i = 1; i < liveRows.length; i++) {
        if (liveRows[i][10] === 'Confirmed') {
          live.push({ 
            token: liveRows[i][0], 
            name: liveRows[i][2] + " " + liveRows[i][3], 
            phone: liveRows[i][5], 
            service: liveRows[i][6], 
            stylist: liveRows[i][7],
            time: liveRows[i][9], 
            status: liveRows[i][10] 
          });
        }
      }
    }
    if (historySheet && historySheet.getLastRow() > 1) {
      const histRows = historySheet.getDataRange().getDisplayValues();
      for (let i = 1; i < histRows.length; i++) {
        history.unshift({ 
          token: histRows[i][0], 
          name: histRows[i][2] + " " + histRows[i][3], 
          phone: histRows[i][5], 
          service: histRows[i][6], 
          stylist: histRows[i][7],
          time: histRows[i][9], 
          status: histRows[i][10] 
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({live, history})).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'confirm' && token) {
    const data = mainSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === token) {
        mainSheet.getRange(i + 1, 11).setValue('Confirmed');
        return HtmlService.createHtmlOutput(getSuccessHtml(token)).setTitle("Booking Confirmed");
      }
    }
  }
  return HtmlService.createHtmlOutput("Invalid Request.");
}

function getSuccessHtml(token) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f7f7f7; }
          .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
          .icon { background: #28a745; color: white; width: 70px; height: 70px; line-height: 70px; font-size: 40px; border-radius: 50%; margin: 0 auto 20px; }
          h1 { color: #333; font-size: 24px; }
          .btn { background: #b5952f; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h1>Confirmed!</h1>
          <p>Aapka appointment <b>${token}</b> confirm ho gaya hai.<br>Milte hain DilKhush Salon mein!</p>
          <a href="#" onclick="window.close()" class="btn">Close Window</a>
        </div>
      </body>
    </html>
  `;
}

function dailyResetTask() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = ss.getSheetByName("Appointments");
  if (mainSheet && mainSheet.getLastRow() > 1) {
    mainSheet.deleteRows(2, mainSheet.getLastRow() - 1);
  }
}