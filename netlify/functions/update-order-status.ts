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
      console.warn('Google OAuth credentials not configured. Will attempt Apps Script proxy if GOOGLE_SCRIPT_UPDATE_URL is set.');
    } else {
      console.log('Google OAuth credentials are present.');
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
    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_UPDATE_URL;
    
    console.log('GOOGLE_SCRIPT_UPDATE_URL:', GOOGLE_SCRIPT_URL ? 'Configured ✓' : 'NOT CONFIGURED ✗');
    console.log('Attempting to update order:', orderID, 'to status:', status);
    
    if (GOOGLE_SCRIPT_URL) {
      try {
        const updatePayload = {
          spreadsheetId: SPREADSHEET_ID,
          sheetName: ORDERS_SHEET_NAME,
          orderID,
          status,
          rowIndex
        };
        
        console.log('Sending to Google Apps Script:', JSON.stringify(updatePayload));
        
        const updateResponse = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
        
        const responseText = await updateResponse.text();
        console.log('Google Apps Script response:', responseText);
        
        if (updateResponse.ok) {
          const responseData = JSON.parse(responseText);
          console.log('✅ Successfully updated order status in Google Sheets');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              message: 'Order status updated successfully in Google Sheets',
              orderID,
              status,
              scriptResponse: responseData
            }),
          };
        } else {
          console.error('❌ Google Apps Script returned error:', responseText);
          throw new Error(`Apps Script failed: ${responseText}`);
        }
      } catch (scriptError) {
        const errorMessage = scriptError instanceof Error ? scriptError.message : 'Unknown error';
        console.error('❌ Error calling Google Apps Script:', errorMessage);
        // Don't fail the payment, just log the error
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            message: 'Payment processed but status update failed',
            orderID,
            status,
            error: errorMessage
          }),
        };
      }
    } else {
      console.warn('⚠️ GOOGLE_SCRIPT_UPDATE_URL not configured');
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update order status';
    console.error('Error updating order status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};

export { handler };
