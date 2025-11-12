// Google Apps Script to update order status in Google Sheets
// Deploy this as a Web App with access set to "Anyone"
// Then copy the Web App URL and add it as GOOGLE_SCRIPT_UPDATE_URL environment variable

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const { spreadsheetId, sheetName, orderID, status, rowIndex } = data;

        // Open the spreadsheet
        const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        const sheet = spreadsheet.getSheetByName(sheetName);

        if (!sheet) {
            return ContentService.createTextOutput(
                JSON.stringify({ error: "Sheet not found" })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // Get all data to find the order
        const dataRange = sheet.getDataRange();
        const values = dataRange.getValues();

        // Find the header row
        const headers = values[0];
        const orderNoIndex = headers.indexOf("Order No");
        const statusIndex = headers.indexOf("Status");

        if (orderNoIndex === -1 || statusIndex === -1) {
            return ContentService.createTextOutput(
                JSON.stringify({ error: "Required columns not found" })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // Find and update the order
        for (let i = 1; i < values.length; i++) {
            if (values[i][orderNoIndex] === orderID) {
                // Update the status column (i+1 because sheets are 1-indexed)
                sheet.getRange(i + 1, statusIndex + 1).setValue(status);

                return ContentService.createTextOutput(
                    JSON.stringify({
                        success: true,
                        message: `Order ${orderID} status updated to ${status}`,
                        row: i + 1,
                    })
                ).setMimeType(ContentService.MimeType.JSON);
            }
        }

        return ContentService.createTextOutput(
            JSON.stringify({ error: "Order not found" })
        ).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(
            JSON.stringify({ error: error.toString() })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}

// Test function - Run this first to verify everything works
function testUpdate() {
    const testData = {
        postData: {
            contents: JSON.stringify({
                spreadsheetId: "1hzt3zyATvpMz5lN-ijwO9XzSxkmuiWY4-yTpF_Kojjc",
                sheetName: "skincare orders",
                orderID: "ORD-5555",
                status: "Complete",
                rowIndex: 3,
            }),
        },
    };

    const result = doPost(testData);
    Logger.log(result.getContent());
}

// Test function to verify doGet works (optional)
function doGet(e) {
    return ContentService.createTextOutput(
        JSON.stringify({
            status: "OK",
            message: "Order Status Updater API is running",
            timestamp: new Date().toISOString(),
        })
    ).setMimeType(ContentService.MimeType.JSON);
}
