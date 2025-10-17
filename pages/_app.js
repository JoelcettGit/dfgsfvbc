import { CartProvider } from '../context/CartContext'; // 1. Importa el proveedor
import '../styles/globals.css';
import "react-responsive-carousel/lib/styles/carousel.min.css";
function MyApp({ Component, pageProps }) {
  return (
    // 2. Envuelve toda la aplicación con el CartProvider
    <CartProvider>
      <Component {...pageProps} />
    </CartProvider>
  );
}

export default MyApp;