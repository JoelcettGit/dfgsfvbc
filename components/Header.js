// components/Header.js
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../context/CartContext';
import { useState } from 'react'; // <-- Importar useState
import { useRouter } from 'next/router'; // <-- Importar useRouter

export default function Header() {
    const { cartItems } = useCart();
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // --- NUEVO: Estado y Manejador para la Búsqueda ---
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    const handleSearchSubmit = (e) => {
        e.preventDefault(); // Evita que la página se recargue
        if (searchTerm.trim()) { // Solo busca si hay algo escrito (quitando espacios)
            router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
        }
    };
    // ----------------------------------------------------

    return (
        <header className="main-header">
            <div className="logo">
                <Link href="/">
                    {/* Usamos <a> tag dentro de Link para asegurar el comportamiento correcto */}
                    <a> 
                        <Image
                            src="/logo-vidaanimada.png"
                            alt="Vida Animada Logo"
                            width={150}
                            height={50}
                            style={{ objectFit: 'contain', cursor: 'pointer' }}
                            priority
                        />
                    </a>
                </Link>
            </div>

            {/* --- NUEVO: Formulario de Búsqueda --- */}
            <form onSubmit={handleSearchSubmit} className="search-form">
                <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <button type="submit" className="search-button" aria-label="Buscar">
                    🔍 {/* O usa un icono SVG/FontAwesome */}
                </button>
            </form>
            {/* ------------------------------------ */}

            <nav className="main-nav">
                <ul>
                    <li><Link href="/">Inicio</Link></li>
                    <li><Link href="/categorias">Productos</Link></li>
                    <li>
                        <Link href="/carrito">
                            <a className="cart-icon"> {/* Usamos <a> tag dentro de Link */}
                                🛒
                                {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
                            </a>
                        </Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
}
