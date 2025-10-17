// pages/carrito.js
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../context/CartContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useState } from 'react'; // <--- 1. Importar useState

export default function CartPage() {
    const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
    const [isProcessing, setIsProcessing] = useState(false); // <--- 2. Añadir estado de carga

    const calculateTotal = () => {
        return cartItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
    };

    // La función de generar mensaje sigue igual
    const generateWhatsAppMessage = (orderId, total) => {
        let message = `¡Hola Vida Animada! 👋 Me gustaría hacer el siguiente pedido:\n\n*PEDIDO Nº: ${orderId}*\n\n`;
        
        const groupedItems = cartItems.reduce((acc, item) => {
            if (!acc[item.name]) {
                acc[item.name] = { items: [], subtotal: 0 };
            }
            acc[item.name].items.push(item);
            acc[item.name].subtotal += item.price * item.quantity;
            return acc;
        }, {});

        Object.keys(groupedItems).forEach(productName => {
            const group = groupedItems[productName];
            message += `📦 *${productName.trim()}*\n`;

            if (!group.items[0].color_name && !group.items[0].size) {
                const item = group.items[0];
                message += `   Cantidad: ${item.quantity}\n`;
            } else {
                const colors = group.items.reduce((acc, item) => {
                    const color = item.color_name || 'Sin Color';
                    if (!acc[color]) acc[color] = [];
                    acc[color].push(` ${item.quantity}u ${item.size || ''}`);
                    return acc;
                }, {});
                Object.keys(colors).forEach(colorName => {
                    message += `   Color: ${colorName}\n`;
                    message += `   Talles: ${colors[colorName].join(',')}\n`;
                });
            }
            message += `   Subtotal: $${group.subtotal.toFixed(2)}\n\n`;
        });

        message += `-------------------------\n*TOTAL DEL PEDIDO: $${total}*\n\n¡Espero su respuesta! Gracias 😊`;
        return encodeURIComponent(message);
    };

    // --- 3. Nueva función para manejar el pedido ---
    const handleFinishOrder = async () => {
        if (cartItems.length === 0) return;
        
        setIsProcessing(true); // Bloquear el botón
        const total = calculateTotal();

        try {
            // --- 4. Llamar a nuestra nueva API ---
            const response = await fetch('/api/create-order', {
                method: 'POST',
                body: JSON.stringify({
                    cartItems: cartItems,
                    total: total
                })
            });

            if (!response.ok) {
                throw new Error('Error al crear el pedido en el servidor');
            }

            const data = await response.json();
            const orderId = data.orderId;

            // --- 5. Si todo OK, generar mensaje y redirigir ---
            const message = generateWhatsAppMessage(orderId, total);
            const whatsappUrl = `https://wa.me/3804882298?text=${message}`;

            // Limpiar el carrito ANTES de redirigir
            clearCart();
            
            // Redirigir al usuario a WhatsApp
            window.location.href = whatsappUrl;

        } catch (error) {
            console.error("Error al finalizar pedido:", error);
            alert("Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.");
            setIsProcessing(false); // Desbloquear el botón si hay error
        }
    };

    return (
        <>
            <Head><title>Carrito de Compras - Vida Animada</title></Head>
            <Header />
            <main>
                <section className="page-section">
                    <h1>Tu Carrito de Compras</h1>
                    {cartItems.length === 0 ? (
                        <div className="cart-empty">
                            <p>Tu carrito está vacío.</p>
                            <Link href="/categorias" className="btn-primary">Ver productos</Link>
                        </div>
                    ) : (
                        <div className="cart-container">
                            <div className="cart-items">
                                {cartItems.map(item => (
                                    <div key={item.id} className="cart-item">
                                        <Image src={item.image_url} alt={item.name} width={80} height={80} style={{ objectFit: 'cover', borderRadius: '8px' }} />
                                        <div className="cart-item-details">
                                            <h4>{item.name}</h4>
                                            <p className="variant-info">
                                                {item.color_name && <span>{item.color_name}</span>}
                                                {item.size && <span>{item.size}</span>}
                                            </p>
                                            <p className="price">${item.price}</p>
                                        </div>
                                        <div className="cart-item-quantity">
                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                        </div>
                                        <div className="cart-item-subtotal">
                                            <p>${(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="cart-item-remove">×</button>
                                    </div>
                                ))}
                            </div>

                            <aside className="cart-summary">
                                <h2>Resumen del Pedido</h2>
                                <div className="summary-total">
                                    <span>TOTAL</span>
                                    <span>${calculateTotal()}</span>
                                </div>
                                
                                {/* --- 6. Botón actualizado --- */}
                                <button
                                    onClick={handleFinishOrder}
                                    className="btn-primary whatsapp-button"
                                    disabled={isProcessing} // Se deshabilita mientras procesa
                                >
                                    {isProcessing ? 'Procesando...' : 'Finalizar Pedido por WhatsApp'}
                                </button>
                                
                                <button
                                    onClick={clearCart}
                                    className="btn-secondary clear-cart-button"
                                    disabled={isProcessing}
                                >
                                    Vaciar Carrito
                                </button>
                            </aside>
                        </div>
                    )}
                </section>
            </main>
            <Footer />
        </>
    );
}