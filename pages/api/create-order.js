// pages/api/create-order.js
import { createClient } from '@supabase/supabase-js';

// Inicializamos el cliente de Supabase con la 'service_role'
// Esto nos da acceso de administrador para saltarnos el RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Solo aceptamos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { cartItems, total } = JSON.parse(req.body);

    if (!cartItems || !total) {
      return res.status(400).json({ error: 'Faltan datos del carrito.' });
    }

    // --- 1. Crear el Pedido (Orders) ---
    // Usamos el cliente 'admin' para escribir en la tabla 'orders'
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        total_price: total,
        status: 'pendiente' // El estado inicial
      })
      .select()
      .single(); // .single() para obtener el objeto del pedido creado

    if (orderError) throw orderError;

    // --- 2. Preparar los Items del Pedido (Order_Items) ---
    const orderItemsData = cartItems.map(item => {
      // Determinamos si es un producto simple o una variante
      const isVariant = item.color_name || item.size;

      return {
        order_id: order.id, // El ID del pedido que acabamos de crear
        unit_price: item.price,
        quantity: item.quantity,
        // La clave 'item.id' contiene el ID correcto (sea de producto o de variante)
        product_id: isVariant ? null : item.id,
        product_variant_id: isVariant ? item.id : null
      };
    });

    // --- 3. Insertar los Items del Pedido ---
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsData);

    if (itemsError) throw itemsError;

    // --- 4. Éxito ---
    // Devolvemos el ID del nuevo pedido al cliente
    res.status(200).json({ orderId: order.id });

  } catch (error) {
    console.error("Error al crear el pedido:", error.message);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
}