// Standalone Google Apps Script to update order status
// This version doesn't need to be bound to a specific sheet
// Deploy this as a Web App with "Execute as: Me" and "Who has access: Anyone"

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const { spreadsheetId, sheetName, orderID, status } = data;

        // Open the spreadsheet by ID (works from any script)
        const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        const sheet = spreadsheet.getSheetByName(sheetName);

        if (!sheet) {
            return ContentService.createTextOutput(
                JSON.stringify({
                    error: "Sheet not found",
                    sheetName: sheetName,
                    availableSheets: spreadsheet
                        .getSheets()
                        .map((s) => s.getName()),
                })
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
                JSON.stringify({
                    error: "Required columns not found",
                    headers: headers,
                    lookingFor: ["Order No", "Status"],
                })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // Find and update the order
        for (let i = 1; i < values.length; i++) {
            if (values[i][orderNoIndex] === orderID) {
                // Update the status column (i+1 because sheets are 1-indexed)
                sheet.getRange(i + 1, statusIndex + 1).setValue(status);

                // Add timestamp if column exists
                const timestampIndex = headers.indexOf("Last Updated");
                if (timestampIndex !== -1) {
                    sheet
                        .getRange(i + 1, timestampIndex + 1)
                        .setValue(new Date());
                }

                return ContentService.createTextOutput(
                    JSON.stringify({
                        success: true,
                        message: `Order ${orderID} status updated to ${status}`,
                        row: i + 1,
                        timestamp: new Date().toISOString(),
                    })
                ).setMimeType(ContentService.MimeType.JSON);
            }
        }

        return ContentService.createTextOutput(
            JSON.stringify({
                error: "Order not found",
                orderID: orderID,
                totalOrders: values.length - 1,
            })
        ).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(
            JSON.stringify({
                error: error.toString(),
                stack: error.stack,
            })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}

// Test with GET request to verify it's running
function doGet(e) {
    return ContentService.createTextOutput(
        JSON.stringify({
            status: "OK",
            message: "Order Status Updater API is running (Standalone)",
            timestamp: new Date().toISOString(),
            version: "2.0",
        })
    ).setMimeType(ContentService.MimeType.JSON);
}

// Test function - Run this to verify it works
function testUpdate() {
    const testData = {
        postData: {
            contents: JSON.stringify({
                spreadsheetId: "1hzt3zyATvpMz5lN-ijwO9XzSxkmuiWY4-yTpF_Kojjc",
                sheetName: "skincare orders",
                orderID: "ORD-5555",
                status: "Complete",
            }),
        },
    };

    const result = doPost(testData);
    Logger.log(result.getContent());
}
