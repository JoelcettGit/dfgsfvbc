// pages/api/create-order.js
import { createClient } from '@supabase/supabase-js';

// Cliente Admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { cartItems, total } = JSON.parse(req.body);

    if (!cartItems || cartItems.length === 0 || !total) {
      return res.status(400).json({ error: 'Faltan datos del carrito o está vacío.' });
    }

    // --- 1. Verificación de Stock (SE MANTIENE) ---
    const stockChecks = await Promise.all(cartItems.map(item => {
        const componentIds = item.type === 'BUNDLE' ? item.componentVariantIds : [];
         return supabaseAdmin.rpc('check_stock_availability', {
            item_id: item.id,
            item_type: item.type,
            quantity_wanted: item.quantity,
            component_variant_ids: componentIds
        });
    }));

     const failedStockCheck = stockChecks.find(result => result.error || !result.data);
     if (failedStockCheck) {
         console.warn("Verificación de stock fallida al crear pedido:", failedStockCheck?.error?.message || 'No disponible');
         const failedItemIndex = stockChecks.findIndex(result => result.error || !result.data);
         const failedItemName = cartItems[failedItemIndex]?.name || 'un producto';
         return res.status(409).json({ error: `Stock no disponible para ${failedItemName}. Por favor, revisa tu carrito.` });
     }
     console.log("Verificación de stock OK al crear pedido.");

    // --- 2. Crear Pedido (Orders) ---
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({ total_price: total, status: 'pendiente' }) // Siempre 'pendiente'
      .select()
      .single();

    if (orderError) throw orderError;
    console.log("Pedido creado (pendiente):", order.id);

    // --- 3. Preparar y Crear Items (Order_Items) ---
    const orderItemsData = cartItems.map(item => ({
      order_id: order.id,
      unit_price: item.price,
      quantity: item.quantity,
      product_id: (item.type === 'SIMPLE' || item.type === 'BUNDLE') ? item.id : null,
      product_variant_id: item.type === 'VARIANT' ? item.id : null,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsData);

    if (itemsError) {
        console.error("Error al insertar items, rollback del pedido:", itemsError);
        await supabaseAdmin.from('orders').delete().eq('id', order.id);
        throw itemsError;
    }
     console.log("Items del pedido insertados.");

    // --- 4. NO SE DECREMENTA STOCK AQUÍ ---

    // --- 5. Éxito ---
    res.status(200).json({ orderId: order.id }); // Se devuelve el ID

  } catch (error) {
    console.error("Error general en /api/create-order:", error.message);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
}