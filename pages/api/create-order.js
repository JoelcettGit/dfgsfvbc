// pages/api/create-order.js
import { createClient } from '@supabase/supabase-js';

// Cliente Admin (Service Key)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// --- Función Helper para Decrementar Stock (¡IMPORTANTE!) ---
// Esta función intenta restar stock de forma segura.
// Devuelve true si tuvo éxito, false si no había stock suficiente.
async function decrementStock(itemId, itemType, quantity, componentIds = []) {
  try {
    if (itemType === 'SIMPLE') {
      // Llama a una función de base de datos (RPC) para decrementar de forma atómica
      const { error } = await supabaseAdmin.rpc('decrement_product_stock', {
        product_id_in: itemId,
        quantity_in: quantity
      });
      if (error) {
        console.error(`Stock insuficiente o error al decrementar producto simple ${itemId}:`, error);
        return false; // Falla si la función rpc devuelve error (ej: stock < quantity)
      }
      return true; // Éxito

    } else if (itemType === 'VARIANT') {
      // Llama a una función RPC para decrementar variante
      const { error } = await supabaseAdmin.rpc('decrement_variant_stock', {
        variant_id_in: itemId,
        quantity_in: quantity
      });
       if (error) {
        console.error(`Stock insuficiente o error al decrementar variante ${itemId}:`, error);
        return false;
      }
      return true; // Éxito

    } else if (itemType === 'BUNDLE' && componentIds.length > 0) {
      // Llama a una función RPC para decrementar MÚLTIPLES variantes (el bundle)
       const { error } = await supabaseAdmin.rpc('decrement_bundle_stock', {
         variant_ids_in: componentIds,
         quantity_in: quantity // Resta 'quantity' de CADA componente
       });
       if (error) {
         console.error(`Stock insuficiente o error al decrementar componentes del bundle ${itemId}:`, error);
         return false;
       }
       return true; // Éxito
    } else {
       console.error("Tipo de item o datos inválidos para decrementar stock:", {itemId, itemType, componentIds});
       return false; // Tipo inválido o faltan IDs de componentes
    }
  } catch (err) {
      console.error("Excepción en decrementStock:", err);
      return false; // Error inesperado
  }
}


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { cartItems, total } = JSON.parse(req.body);

    if (!cartItems || cartItems.length === 0 || !total) {
      return res.status(400).json({ error: 'Faltan datos del carrito o está vacío.' });
    }

    // --- Validación de Stock PREVIA (Importante) ---
    // Verificamos si hay stock suficiente ANTES de crear el pedido.
    // Usamos Promis.all para verificar todos los items en paralelo.
    const stockChecks = await Promise.all(cartItems.map(item => {
        // Para bundles, necesitamos los IDs de componentes que vienen del carrito
        const componentIds = item.type === 'BUNDLE' ? item.componentVariantIds : [];
        // Llamamos a una función RPC de SOLO LECTURA para verificar stock
         return supabaseAdmin.rpc('check_stock_availability', {
            item_id: item.id,
            item_type: item.type,
            quantity_wanted: item.quantity,
            component_variant_ids: componentIds
        });
    }));

    // Buscamos si alguna verificación de stock falló
     const failedStockCheck = stockChecks.find(result => result.error || !result.data);
     if (failedStockCheck) {
         console.warn("Verificación de stock fallida:", failedStockCheck?.error?.message || 'No disponible');
         // Buscamos el item que falló para dar un mensaje más útil (opcional)
         const failedItemIndex = stockChecks.findIndex(result => result.error || !result.data);
         const failedItemName = cartItems[failedItemIndex]?.name || 'un producto';
         return res.status(409).json({ error: `Stock no disponible para ${failedItemName}. Por favor, revisa tu carrito.` }); // 409 Conflict
     }
     console.log("Verificación de stock OK para todos los items.");


    // --- Si la verificación de stock pasó, procedemos a crear el pedido ---

    // 1. Crear el Pedido (Orders)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({ total_price: total, status: 'pendiente' })
      .select()
      .single();

    if (orderError) throw orderError;
    console.log("Pedido creado:", order.id);

    // 2. Preparar los Items del Pedido
    const orderItemsData = cartItems.map(item => ({
      order_id: order.id,
      unit_price: item.price,
      quantity: item.quantity,
      // Guarda el ID del producto (SIMPLE/BUNDLE) o de la variante (VARIANT)
      product_id: (item.type === 'SIMPLE' || item.type === 'BUNDLE') ? item.id : null,
      product_variant_id: item.type === 'VARIANT' ? item.id : null,
      // Opcional: Podríamos guardar 'componentsDetails' como JSONB si quisiéramos
      // bundle_components_details: item.type === 'BUNDLE' ? item.componentsDetails : null
    }));

    // 3. Insertar los Items del Pedido
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsData);

    if (itemsError) {
        // ¡Importante! Si falla la inserción de items, deberíamos intentar borrar el pedido 'orders' (rollback)
        console.error("Error al insertar items, intentando rollback del pedido:", itemsError);
        await supabaseAdmin.from('orders').delete().eq('id', order.id);
        throw itemsError; // Lanza el error para que el catch lo maneje
    }
     console.log("Items del pedido insertados.");


    // --- 4. Decrementar Stock (POSTERIOR a crear el pedido) ---
    // Intentamos decrementar stock para cada item del carrito.
    const stockDecrementResults = await Promise.all(cartItems.map(item =>
      decrementStock(
        item.id,
        item.type,
        item.quantity,
        item.type === 'BUNDLE' ? item.componentVariantIds : []
      )
    ));

    // Verificamos si ALGUNA operación de decremento falló
    const failedDecrement = stockDecrementResults.some(success => !success);

    if (failedDecrement) {
        // ¡CRÍTICO! Algo falló al decrementar stock DESPUÉS de crear el pedido.
        // Esto indica un problema grave (ej: stock cambió entre verificación y decremento).
        // Deberíamos marcar el pedido como 'error_stock' o notificar al admin.
        // Por ahora, solo logueamos y devolvemos error al cliente.
        console.error(`¡FALLO CRÍTICO! No se pudo decrementar stock para el pedido ${order.id} después de crearlo.`);
        // Intentar rollback (borrar pedido e items), aunque puede fallar si ya se envió respuesta.
         await supabaseAdmin.from('order_items').delete().eq('order_id', order.id);
         await supabaseAdmin.from('orders').delete().eq('id', order.id);
        // Devolvemos un error genérico
        return res.status(500).json({ error: 'Error al actualizar el inventario. Contacta soporte.' });
    }
    console.log("Stock decrementado correctamente para el pedido:", order.id);

    // --- 5. Éxito ---
    res.status(200).json({ orderId: order.id });

  } catch (error) {
    console.error("Error general en /api/create-order:", error.message);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
}