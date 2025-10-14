// components/Header.js
import Link from 'next/link';
import Image from 'next/image'; // 1. Importa el componente Image
import { useCart } from '../context/CartContext';

export default function Header() {
    const { cartItems } = useCart();
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <header className="main-header">
            <div className="logo">
                <Link href="/">
                    {/* 2. Reemplaza <img> por <Image> con ancho y alto */}
                    <Image 
                        src="/logo-vidaanimada.png" 
                        alt="Vida Animada Logo"
                        width={150}
                        height={50}
                        style={{ objectFit: 'contain', cursor: 'pointer' }}
                        priority // Carga esta imagen primero, ya que está en el encabezado
                    />
                </Link>
            </div>
            <nav className="main-nav">
                <ul>
                    {/* 3. Asegúrate de que todos los enlaces usen <Link> correctamente */}
                    <li><Link href="/">Inicio</Link></li>
                    <li><Link href="/categorias">Categorías</Link></li>
                    <li><Link href="/#nosotros">Nosotros</Link></li>
                    <li>
                        <Link href="/carrito" className="cart-icon">
                            🛒
                            {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
                        </Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
}
