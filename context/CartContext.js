import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function useCart() {
    return useContext(CartContext);
}

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);

    // Cargar el carrito desde el almacenamiento local al iniciar
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem('vida_animada_cart');
            if (savedCart) {
                setCartItems(JSON.parse(savedCart));
            }
        } catch (error) {
            console.error("No se pudo cargar el carrito desde localStorage", error);
        }
    }, []);

    // Guardar el carrito en el almacenamiento local cada vez que cambie
    useEffect(() => {
        localStorage.setItem('vida_animada_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    // Lógica para agregar al carrito (ahora basada en el ID de la variante)
    const addToCart = (variantToAdd) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === variantToAdd.id);
            if (existingItem) {
                // Si la variante ya existe, incrementa su cantidad
                return prevItems.map(item =>
                    item.id === variantToAdd.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                // Si es una nueva variante, la agrega con cantidad 1
                return [...prevItems, { ...variantToAdd, quantity: 1 }];
            }
        });
    };

    const removeFromCart = (variantId) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== variantId));
    };

    const updateQuantity = (variantId, newQuantity) => {
        if (newQuantity < 1) {
            removeFromCart(variantId);
        } else {
            setCartItems(prevItems =>
                prevItems.map(item =>
                    item.id === variantId ? { ...item, quantity: newQuantity } : item
                )
            );
        }
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const value = {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}