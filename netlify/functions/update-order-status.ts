import type { Handler } from '@netlify/functions';
import { google } from 'googleapis';

const SPREADSHEET_ID = '1hzt3zyATvpMz5lN-ijwO9XzSxkmuiWY4-yTpF_Kojjc';
const ORDERS_SHEET_NAME = 'skincare orders';

const handler: Handler = async (event) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const { orderID, status = 'Complete' } = JSON.parse(event.body || '{}');

    if (!orderID) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'orderID is required' }),
      };
    }

    const clientId = process.env.GOOGLE_SHEETS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_SHEETS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn('Google OAuth credentials not configured. Order status not updated.');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'Payment recorded (Google Sheets update skipped - credentials not configured)',
          orderID,
          status 
        }),
      };
    }

    // Note: For full OAuth flow, you'd need a refresh token
    // For now, we'll use the simpler approach of reading and finding the row
    
    // Fetch current orders to find the row
    const ordersUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(ORDERS_SHEET_NAME)}`;
    const ordersResponse = await fetch(ordersUrl);
    const ordersCSV = await ordersResponse.text();
    
    // Parse to find row number
    const lines = ordersCSV.split('\n').filter(line => line.trim());
    let rowIndex = -1;
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].includes(orderID)) {
        rowIndex = i + 1; // +1 because sheets are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Order not found' }),
      };
    }

    // Use Google Apps Script Web App as a proxy to update the sheet
    // You need to create a Google Apps Script and deploy it as a web app
    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_UPDATE_URL;
    
    if (GOOGLE_SCRIPT_URL) {
      const updateResponse = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: SPREADSHEET_ID,
          sheetName: ORDERS_SHEET_NAME,
          orderID,
          status,
          rowIndex
        }),
      });
      
      if (updateResponse.ok) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            message: 'Order status updated successfully in Google Sheets',
            orderID,
            status
          }),
        };
      }
    }
    
    // Fallback: Log the payment
    console.log(`✅ PAYMENT SUCCESSFUL - Order ${orderID} should be marked as "${status}" at row ${rowIndex}`);
    console.log(`Manual update required in Google Sheets: ${SPREADSHEET_ID}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Payment processed successfully - Status update pending',
        orderID,
        status,
        rowIndex,
        instructions: 'Update status manually in Google Sheets or configure GOOGLE_SCRIPT_UPDATE_URL'
      }),
    };
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to update order status' }),
    };
  }
};

export { handler };
