import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { CreditCard, Lock, ShoppingBag, RefreshCw } from "lucide-react";
import { ProductSummary } from "@/components/payment/ProductSummary";

const formSchema = z.object({
  cardNumber: z.string()
    .min(16, "Card number must be 16 digits")
    .max(19, "Card number is too long")
    .regex(/^[\d\s]+$/, "Card number must contain only digits"),
  cardName: z.string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name is too long"),
  expiryDate: z.string()
    .regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, "Format: MM/YY"),
  cvv: z.string()
    .min(3, "CVV must be 3 digits")
    .max(4, "CVV must be 3-4 digits")
    .regex(/^\d+$/, "CVV must contain only digits"),
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email is too long"),
  billingAddress: z.string()
    .min(5, "Address is too short")
    .max(200, "Address is too long"),
  city: z.string()
    .min(2, "City is too short")
    .max(100, "City is too long"),
  zipCode: z.string()
    .min(4, "ZIP code is too short")
    .max(10, "ZIP code is too long")
    .regex(/^[A-Z0-9\s-]+$/i, "Invalid ZIP code format"),
});

type FormData = z.infer<typeof formSchema>;

interface Product {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  weight: string;
}

const Payment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const orderId = searchParams.get("orderid");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cardNumber: "",
      cardName: "",
      expiryDate: "",
      cvv: "",
      email: "",
      billingAddress: "",
      city: "",
      zipCode: "",
    },
  });

  const fetchOrderData = async () => {
    if (!orderId) {
      toast({
        title: "Error",
        description: "No order ID provided",
        variant: "destructive",
      });
      return;
    }

    setIsRefreshing(true);
      try {
        const SPREADSHEET_ID = '1hzt3zyATvpMz5lN-ijwO9XzSxkmuiWY4-yTpF_Kojjc';
        const ORDERS_GID = '2936601'; // The gid from the URL
        const PRODUCTS_GID = '0'; // Default sheet gid
        
        // Add timestamp to prevent caching - ALWAYS fetch fresh data
        const timestamp = new Date().getTime();
        
        // Fetch orders sheet using export URL (works better than gviz)
        const ordersUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${ORDERS_GID}&timestamp=${timestamp}`;
        const ordersResponse = await fetch(ordersUrl, {
          cache: 'no-store', // Never use cached data
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        });
        
        if (!ordersResponse.ok) {
          throw new Error(`Failed to fetch orders: ${ordersResponse.statusText}`);
        }
        
        const ordersCSV = await ordersResponse.text();
        
        // Use PapaParse for proper CSV parsing (handles quoted fields correctly)
        const ordersParsed = Papa.parse<Record<string, string>>(ordersCSV, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
        });
        
        if (ordersParsed.errors.length > 0) {
          console.error('CSV parsing errors:', ordersParsed.errors);
        }
        
        const orders = ordersParsed.data;
        const order = orders.find((o) => o['Order No'] === orderId);
        
        if (!order) {
          throw new Error(`Order ${orderId} not found`);
        }
        
        // Check if order is already completed
        const orderStatus = order['Status']?.trim().toLowerCase();
        if (orderStatus === 'complete' || orderStatus === 'completed') {
          toast({
            title: "Order Already Completed",
            description: "This order has already been paid. Redirecting to confirmation...",
            variant: "default",
          });
          setTimeout(() => {
            navigate(`/confirmation?orderid=${orderId}&status=success`);
          }, 2000);
          return;
        }
        
        console.log('✅ Order loaded:', orderId, '| Status:', order['Status']);
        
        // Fetch products sheet - ALWAYS fresh data
        const productsUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${PRODUCTS_GID}&timestamp=${timestamp}`;
        const productsResponse = await fetch(productsUrl, {
          cache: 'no-store', // Never use cached data
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        });
        
        if (!productsResponse.ok) {
          throw new Error(`Failed to fetch products: ${productsResponse.statusText}`);
        }
        
        const productsCSV = await productsResponse.text();
        
        // Use PapaParse for products too
        const productsParsed = Papa.parse<Record<string, string>>(productsCSV, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
        });
        
        const allProducts = productsParsed.data;
        
        // Map products by name
        const productMap: Record<string, Record<string, string>> = {};
        allProducts.forEach((p) => {
          productMap[p['Product Name']] = p;
        });
        
        // Parse order items - these ARE comma-separated within the field value
        const itemNames = order['Item Name'].split(',').map((s: string) => s.trim());
        const weights = order['Weight'].split(',').map((s: string) => s.trim());
        const quantities = order['Quantity'].split(',').map((s: string) => s.trim());
        
        console.log('📦 Order:', orderId);
        console.log('🛍️ Items:', itemNames);
        console.log('📊 Quantities:', quantities);
        
        const transformedProducts = itemNames.map((name: string, idx: number) => {
          const product = productMap[name];
          const qty = parseInt(quantities[idx]) || 1;
          
          if (!product) {
            console.warn(`⚠️ Product not found in products sheet: ${name}`);
            // Product not in sheet - use placeholder
            return {
              id: `order-item-${idx}`,
              name: name,
              imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300',
              price: 0, // Set to 0 if not found
              quantity: qty,
              weight: weights[idx],
            };
          }
          
          // Get LIVE price from products sheet
          const livePrice = parseFloat(product['Price (PKR)'].replace(/,/g, ''));
          
          console.log(`✅ ${product['Product Name']}: PKR ${livePrice} × ${qty} = PKR ${livePrice * qty}`);
          
          return {
            id: product['ItemID'],
            name: product['Product Name'],
            imageUrl: product['Media'],
            price: livePrice, // Using LIVE price from products sheet
            quantity: qty,
            weight: weights[idx],
          };
        });
        
        // Calculate LIVE total amount
        const liveTotal = transformedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💰 TOTAL AMOUNT: PKR', liveTotal);
        console.log('� Products:', transformedProducts.length);
        console.log('🕐 Fetched at:', new Date().toLocaleTimeString());
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        setProducts(transformedProducts);
        
        // Set sync time
        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }));
        
        // Pre-fill customer info
        if (order['Customer Email']) {
          form.setValue('email', order['Customer Email']);
        }
        if (order['Delivery Address']) {
          form.setValue('billingAddress', order['Delivery Address']);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch order details. Please check the order ID.",
          variant: "destructive",
        });
        console.error('Error fetching order:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

  useEffect(() => {
    fetchOrderData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    form.setValue('cardNumber', formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    form.setValue('expiryDate', value);
  };

  const onSubmit = async (data: FormData) => {
    setIsProcessing(true);

    try {
      const paymentData = {
        orderId,
        ...data,
        products,
        totalAmount: products.reduce((sum, p) => sum + (p.price * p.quantity), 0),
        timestamp: new Date().toISOString(),
      };

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update order status to Complete in Google Sheets
      const updateResponse = await fetch('/.netlify/functions/update-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderID: orderId,
          status: 'Complete',
        }),
      });

      if (!updateResponse.ok) {
        console.error('Failed to update order status');
      }

      toast({
        title: "Payment Successful!",
        description: "Your order status has been updated to Complete.",
      });

      setTimeout(() => {
        navigate(`/confirmation?orderid=${orderId}&status=success`);
      }, 1000);
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "Please check your details and try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalAmount = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            EasyRokra
          </h1>
          <p className="text-muted-foreground">Secure Payment Gateway</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-elevated">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <CardTitle>Payment Details</CardTitle>
                </div>
                <CardDescription>Complete your purchase securely</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="cardNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Card Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="1234 5678 9012 3456"
                                maxLength={19}
                                {...field}
                                onChange={handleCardNumberChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cardName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cardholder Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="expiryDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expiry Date</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="MM/YY"
                                  maxLength={5}
                                  {...field}
                                  onChange={handleExpiryChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="cvv"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CVV</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="123"
                                  maxLength={4}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-6 space-y-4">
                      <h3 className="font-semibold">Billing Information</h3>

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main Street" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="New York" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ZIP Code</FormLabel>
                              <FormControl>
                                <Input placeholder="10001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isProcessing}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      {isProcessing ? "Processing..." : `Pay PKR ${totalAmount.toFixed(2)}`}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      Your payment information is encrypted and secure
                    </p>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <ProductSummary 
              products={products} 
              orderId={orderId || ""}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
