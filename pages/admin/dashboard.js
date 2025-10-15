import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';    
import Image from 'next/image';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// --- COMPONENTE PRINCIPAL DEL DASHBOARD ---
export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Estado para gestionar la vista actual (ver lista o editar/agregar producto)
    const [view, setView] = useState('list'); // 'list' o 'form'
    const [editingProduct, setEditingProduct] = useState(null); // Guarda el producto que se está editando

    useEffect(() => {
        const checkUserAndFetchProducts = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/admin/login');
            } else {
                setUser(session.user);
                await fetchProducts();
                setIsLoading(false);
            }
        };
        checkUserAndFetchProducts();
    }, [router]);

    // Función para obtener todos los productos con sus variantes
    const fetchProducts = async () => {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                product_variants (*)
            `)
            .order('id', { ascending: false });

        if (error) {
            console.error("Error al cargar productos y variantes:", error.message);
        } else {
            setProducts(data || []);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    const handleAddNewProduct = () => {
        setEditingProduct(null);
        setView('form');
    };
    
    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setView('form');
    };

    if (isLoading) {
        return <div className="loading-screen">Cargando datos del administrador...</div>;
    }

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <h1>Dashboard de Vida Animada</h1>
                <p>Bienvenido, {user?.email}</p>
                <button onClick={handleLogout} className="btn-secondary">Cerrar Sesión</button>
            </header>

            <main className="admin-main">
                {view === 'list' && (
                    <ProductListView products={products} onAddNew={handleAddNewProduct} onEdit={handleEditProduct} />
                )}
                {view === 'form' && (
                    <ProductFormView product={editingProduct} onBack={() => setView('list')} onSave={fetchProducts} />
                )}
            </main>
        </div>
    );
}

// --- VISTA DE LISTA DE PRODUCTOS ---
function ProductListView({ products, onAddNew, onEdit }) {
    return (
        <div className="admin-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Listado de Productos ({products.length})</h2>
                <button onClick={onAddNew} className="btn-primary">Agregar Nuevo Producto</button>
            </div>
            <div className="table-container">
                <table className="products-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Categoría</th>
                            <th>Variantes</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id}>
                                <td>{product.name}</td>
                                <td>{product.category}</td>
                                <td>{product.product_variants.length}</td>
                                <td>
                                    <button onClick={() => onEdit(product)} className="btn-edit">Editar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- VISTA DE FORMULARIO PARA AGREGAR/EDITAR PRODUCTOS ---
function ProductFormView({ product, onBack, onSave }) {
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [category, setCategory] = useState(product?.category || '');
    const [basePrice, setBasePrice] = useState(product?.base_price || 0);
    const [variants, setVariants] = useState(product?.product_variants || []);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        let productId = product?.id;

        // Si es un producto nuevo, lo insertamos primero
        if (!productId) {
            const { data, error } = await supabase.from('products').insert({
                name, description, category, base_price: basePrice
            }).select().single();
            
            if (error) {
                alert("Error al crear el producto: " + error.message);
                setIsSaving(false);
                return;
            }
            productId = data.id;
        } else { // Si es un producto existente, lo actualizamos
            const { error } = await supabase.from('products').update({
                name, description, category, base_price: basePrice
            }).eq('id', productId);

            if (error) {
                alert("Error al actualizar el producto: " + error.message);
                setIsSaving(false);
                return;
            }
        }
        
        // Aquí iría la lógica para guardar las variantes (siguiente paso)
        alert("Producto guardado con éxito. Ahora puedes gestionar las variantes.");
        setIsSaving(false);
        onSave(); // Refresca la lista de productos
        onBack(); // Vuelve a la lista
    };

    return (
        <div className="admin-section">
            <button onClick={onBack} className="btn-secondary" style={{ marginBottom: '1rem' }}>← Volver a la lista</button>
            <h2>{product ? `Editando: ${product.name}` : "Agregar Nuevo Producto"}</h2>
            
            <form onSubmit={handleSaveProduct} className="add-product-form">
                <h3>Datos Generales</h3>
                <input type="text" placeholder="Nombre del Producto" value={name} onChange={e => setName(e.target.value)} required />
                <textarea placeholder="Descripción del Producto" value={description} onChange={e => setDescription(e.target.value)} />
                <input type="text" placeholder="Categoría" value={category} onChange={e => setCategory(e.target.value)} required />
                <input type="number" step="0.01" placeholder="Precio Base" value={basePrice} onChange={e => setBasePrice(e.target.value)} required />
                <button type="submit" className="btn-primary" disabled={isSaving}>
                    {isSaving ? "Guardando..." : "Guardar Datos Generales"}
                </button>
            </form>

            {product && (
                <div className="variants-section">
                    <h3>Variantes del Producto</h3>
                    {/* Aquí irá la lista de variantes y el formulario para agregar nuevas */}
                    <p>La gestión de variantes (colores, talles, stock e imágenes) se implementará en el siguiente paso.</p>
                </div>
            )}
        </div>
    );
}