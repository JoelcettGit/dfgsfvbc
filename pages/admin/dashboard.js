// pages/admin/dashboard.js
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Image from 'next/image';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newStock, setNewStock] = useState('');
    const [newIsFeatured, setNewIsFeatured] = useState(false);
    const [newImageFile, setNewImageFile] = useState(null);
    const [isAddingProduct, setIsAddingProduct] = useState(false);

    const [editingProduct, setEditingProduct] = useState(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editImageUrl, setEditImageUrl] = useState('');
    const [editImageFile, setEditImageFile] = useState(null);
    const [editStock, setEditStock] = useState(0);
    const [editIsFeatured, setEditIsFeatured] = useState(false);
    const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);

    useEffect(() => {
        const checkUserAndFetchProducts = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/admin/login'); } 
            else {
                setUser(session.user);
                const { data: fetchedProducts, error } = await supabase.from('products').select('*').order('id', { ascending: false });
                if (error) { console.error("Error al cargar productos:", error.message); } 
                else { setProducts(fetchedProducts || []); }
                setIsLoading(false);
            }
        };
        checkUserAndFetchProducts();
    }, [router]);

    const handleNewFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) { setNewImageFile(e.target.files[0]); }
    };

    const handleEditFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) { setEditImageFile(e.target.files[0]); }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        if (!newImageFile) { alert("Por favor, selecciona una imagen."); return; }
        setIsAddingProduct(true);
        try {
            const fileName = `${Date.now()}-${newImageFile.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, newImageFile);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
            const { data, error: insertError } = await supabase.from('products').insert([{
                name: newName, price: parseFloat(newPrice), category: newCategory.toLowerCase(),
                image_url: publicUrl, stock: parseInt(newStock, 10), is_featured: newIsFeatured
            }]).select();
            if (insertError) throw insertError;
            if (data) {
                setProducts([data[0], ...products]);
                setNewName(''); setNewPrice(''); setNewCategory(''); setNewStock('');
                setNewIsFeatured(false); setNewImageFile(null);
                document.getElementById('newImageFile').value = '';
            }
        } catch (error) { alert('Error: ' + error.message); } 
        finally { setIsAddingProduct(false); }
    };
    
    const handleEditClick = (product) => {
        setEditingProduct(product);
        setEditName(product.name); setEditPrice(product.price); setEditCategory(product.category);
        setEditImageUrl(product.image_url); setEditImageFile(null);
        setEditStock(product.stock); setEditIsFeatured(product.is_featured);
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        setIsUpdatingProduct(true);
        let finalImageUrl = editImageUrl;
        try {
            if (editImageFile) {
                const fileName = `${Date.now()}-${editImageFile.name.replace(/\s/g, '_')}`;
                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, editImageFile);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
                finalImageUrl = publicUrl;
            }
            const { data, error: updateError } = await supabase.from('products').update({
                name: editName, price: parseFloat(editPrice), category: editCategory.toLowerCase(),
                image_url: finalImageUrl, stock: parseInt(editStock, 10), is_featured: editIsFeatured
            }).eq('id', editingProduct.id).select();
            if (updateError) throw updateError;
            if (data) {
                setProducts(products.map(p => (p.id === editingProduct.id ? data[0] : p)));
                setEditingProduct(null); setEditImageFile(null);
            }
        } catch (error) { alert('Error al actualizar: ' + error.message); } 
        finally { setIsUpdatingProduct(false); }
    };

    const handleDeleteProduct = async (productId, productName) => {
        if (!confirm(`¿Seguro que quieres eliminar "${productName}"?`)) { return; }
        try {
            const { error } = await supabase.from('products').delete().eq('id', productId);
            if (error) throw error;
            setProducts(products.filter(p => p.id !== productId));
        } catch (error) { alert('Error al eliminar: ' + error.message); }
    };
    
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    if (isLoading) { return <div className="loading-screen">Cargando...</div>; }

    return (
        <>
            <div className="admin-dashboard">
                <header className="admin-header">
                    <h1>Dashboard</h1>
                    <p>Bienvenido, {user?.email}</p>
                    <button onClick={() => router.push('/')} className="btn-secondary">Ver Tienda</button>
                    <button onClick={handleLogout} className="btn-secondary">Cerrar Sesión</button>
                </header>
                <main className="admin-main">
                    <div className="admin-section">
                        <h2>Agregar Producto</h2>
                        <form onSubmit={handleAddProduct} className="add-product-form">
                            <input type="text" placeholder="Nombre" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                            <input type="number" step="0.01" placeholder="Precio" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required />
                            <input type="text" placeholder="Categoría" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} required />
                            <div className="file-input-container">
                                <label htmlFor="newImageFile">Imagen del Producto</label>
                                <input type="file" id="newImageFile" accept="image/*" onChange={handleNewFileChange} required />
                                {newImageFile && <p className="selected-file-name">{newImageFile.name}</p>}
                            </div>
                            <input type="number" placeholder="Stock" value={newStock} onChange={(e) => setNewStock(e.target.value)} required />
                            <div className="checkbox-container add-form-checkbox">
                                <input type="checkbox" id="newIsFeatured" checked={newIsFeatured} onChange={(e) => setNewIsFeatured(e.target.checked)} />
                                <label htmlFor="newIsFeatured">Marcar como destacado</label>
                            </div>
                            <button type="submit" className="btn-primary" disabled={isAddingProduct}>{isAddingProduct ? 'Agregando...' : 'Agregar Producto'}</button>
                        </form>
                    </div>
                    <div className="admin-section">
                        <h2>Listado de Productos ({products.length})</h2>
                        <div className="table-container">
                            <table className="products-table">
                                <thead>
                                    <tr>
                                        <th>Imagen</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Destacado</th><th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product.id}>
                                            <td><Image src={product.image_url} alt={product.name} className="table-product-image" width={80} height={80} /></td>
                                            <td>{product.name}</td><td>{product.category}</td><td>${product.price}</td>
                                            <td>{product.stock} u.</td><td>{product.is_featured ? 'Sí' : 'No'}</td>
                                            <td>
                                                <button onClick={() => handleEditClick(product)} className="btn-edit">Editar</button>
                                                <button onClick={() => handleDeleteProduct(product.id, product.name)} className="btn-delete">Eliminar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
            {editingProduct && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Editando: {editingProduct.name}</h2>
                        <form onSubmit={handleUpdateProduct}>
                            <label>Nombre</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            <label>Precio</label><input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                            <label>Categoría</label><input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
                            <div className="file-input-container">
                                <label htmlFor="editImageFile">Cambiar Imagen</label>
                                <input type="file" id="editImageFile" accept="image/*" onChange={handleEditFileChange} />
                                {editImageFile ? (<p className="selected-file-name">{editImageFile.name}</p>) : (<p className="selected-file-name">Imagen actual: <a href={editImageUrl} target="_blank" rel="noopener noreferrer">Ver</a></p>)}
                            </div>
                            <label>Stock</label><input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} />
                            <div className="checkbox-container">
                                <input type="checkbox" id="isFeatured" checked={editIsFeatured} onChange={(e) => setEditIsFeatured(e.target.checked)} />
                                <label htmlFor="isFeatured">Marcar como destacado</label>
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn-primary" disabled={isUpdatingProduct}>{isUpdatingProduct ? 'Guardando...' : 'Guardar Cambios'}</button>
                                <button type="button" onClick={() => setEditingProduct(null)} className="btn-secondary">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
