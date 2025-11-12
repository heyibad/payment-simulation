import type { Handler } from '@netlify/functions';

const SPREADSHEET_ID = '1hzt3zyATvpMz5lN-ijwO9XzSxkmuiWY4-yTpF_Kojjc';
const ORDERS_GID = '2936601';
const PRODUCTS_GID = '0';

interface Product {
  itemID: string;
  productName: string;
  price: string;
  weight: string;
  quantity: number;
  status: string;
  media: string;
  tags: string;
}

interface Order {
  orderNo: string;
  itemName: string;
  weight: string;
  quantity: string;
  subtotal: string;
  paymentMode: string;
  customerName: string;
  customerEmail: string;
  deliveryAddress: string;
  status: string;
}

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
    const orderID = event.queryStringParameters?.orderid;

    if (!orderID) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'orderid parameter is required' }),
      };
    }

    // Fetch orders sheet using export URL
    const ordersUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${ORDERS_GID}`;
    console.log('Fetching orders from:', ordersUrl);
    const ordersResponse = await fetch(ordersUrl);
    
    if (!ordersResponse.ok) {
      throw new Error(`Failed to fetch orders sheet: ${ordersResponse.statusText}`);
    }
    
    const ordersCSV = await ordersResponse.text();
    console.log('Orders CSV sample:', ordersCSV.substring(0, 500));
    
    // Parse orders CSV - handle quoted fields properly
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const ordersLines = ordersCSV.split('\n').filter(line => line.trim());
    const ordersHeaders = parseCSVLine(ordersLines[0]);
    console.log('Orders headers:', ordersHeaders);
    
    // Find the order
    let targetOrder: Order | null = null;
    for (let i = 1; i < ordersLines.length; i++) {
      const values = parseCSVLine(ordersLines[i]);
      const order: Record<string, string> = {};
      ordersHeaders.forEach((header, idx) => {
        order[header] = values[idx] || '';
      });
      
      console.log(`Checking order: ${order['Order No']} against ${orderID}`);
      
      if (order['Order No'] === orderID) {
        targetOrder = {
          orderNo: order['Order No'],
          itemName: order['Item Name'],
          weight: order['Weight'],
          quantity: order['Quantity'],
          subtotal: order['Subtotal (PKR)'],
          paymentMode: order['Payment Mode'],
          customerName: order['Customer Name'],
          customerEmail: order['Customer Email'],
          deliveryAddress: order['Delivery Address'],
          status: order['Status'],
        };
        console.log('Found order:', targetOrder);
        break;
      }
    }

    if (!targetOrder) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Order not found' }),
      };
    }

    // Fetch products sheet using export URL
    const productsUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${PRODUCTS_GID}`;
    console.log('Fetching products from:', productsUrl);
    const productsResponse = await fetch(productsUrl);
    
    if (!productsResponse.ok) {
      throw new Error(`Failed to fetch products sheet: ${productsResponse.statusText}`);
    }
    
    const productsCSV = await productsResponse.text();
    console.log('Products CSV sample:', productsCSV.substring(0, 500));
    
    // Parse products CSV
    const productsLines = productsCSV.split('\n').filter(line => line.trim());
    const productsHeaders = parseCSVLine(productsLines[0]);
    console.log('Products headers:', productsHeaders);
    
    const productsMap: Record<string, Product> = {};
    for (let i = 1; i < productsLines.length; i++) {
      const values = parseCSVLine(productsLines[i]);
      const product: Record<string, string> = {};
      productsHeaders.forEach((header, idx) => {
        product[header] = values[idx] || '';
      });
      
      productsMap[product['Product Name']] = {
        itemID: product['ItemID'],
        productName: product['Product Name'],
        price: product['Price (PKR)'],
        weight: product['Weight'],
        quantity: parseInt(product['Quantity']) || 0,
        status: product['Status'],
        media: product['Media'],
        tags: product['Tags'],
      };
    }
    
    console.log('Products loaded:', Object.keys(productsMap).length);

    // Parse order items
    const itemNames = targetOrder.itemName.split(',').map(s => s.trim());
    const weights = targetOrder.weight.split(',').map(s => s.trim());
    const quantities = targetOrder.quantity.split(',').map(s => s.trim());

    const orderProducts = itemNames.map((name, idx) => {
      const product = productsMap[name];
      if (!product) {
        return null;
      }
      
      return {
        ...product,
        orderedQuantity: parseInt(quantities[idx]) || 1,
        orderedWeight: weights[idx],
      };
    }).filter(p => p !== null);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        order: targetOrder,
        products: orderProducts,
      }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch order';
    console.error('Error fetching order:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};

export { handler };
