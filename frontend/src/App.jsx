import { useEffect, useState } from 'react';

export default function App() {
  const [view, setView] = useState('customer'); // 'customer' | 'kitchen' | 'admin'
  const [menu, setMenu] = useState([]);
  const [tables, setTables] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Auth State
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  // Dish Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Pizza');

  // Table Form State
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [tableError, setTableError] = useState('');

  const categories = ['All', 'Pizza', 'Burgers', 'Beverages', 'Sides', 'Desserts'];

  const fetchMenu = () => {
    fetch('http://127.0.0.1:8000/api/menu')
      .then((res) => res.json())
      .then((data) => {
        setMenu(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching menu:', err);
        setLoading(false);
      });
  };

  const fetchTables = () => {
    fetch('http://127.0.0.1:8000/api/tables')
      .then((res) => res.json())
      .then((data) => {
        setTables(data);
        if (data.length > 0 && !selectedTable) {
          setSelectedTable(data[0].table_number.toString());
        }
      })
      .catch((err) => console.error('Error fetching tables:', err));
  };

  useEffect(() => {
    fetchMenu();
    fetchTables();
  }, []);

  const fetchOrders = () => {
    fetch('http://127.0.0.1:8000/api/orders')
      .then((res) => res.json())
      .then((data) => setOrders(data))
      .catch((err) => console.error('Error fetching orders:', err));
  };

  useEffect(() => {
    if (view === 'kitchen' && user) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 3000);
      return () => clearInterval(interval);
    }
  }, [view, user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    if (authMode === 'login') {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: authUsername, password: authPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.detail || 'Login failed');
          return;
        }
        setUser({ username: data.username, token: data.access_token, role: data.role });
        setShowAuthModal(false);
        setAuthUsername('');
        setAuthPassword('');
      } catch (err) {
        setAuthError('Unable to connect to authentication service.');
      }
    } else {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: authUsername,
            password: authPassword,
            secret_code: secretCode,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.detail || 'Registration failed');
          return;
        }
        setAuthSuccessMsg('Account created successfully! Please log in.');
        setAuthMode('login');
        setSecretCode('');
      } catch (err) {
        setAuthError('Unable to complete registration.');
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('customer');
  };

  const requireAuthView = (targetView) => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setView(targetView);
    }
  };

  const addToCart = (item) => {
    setCart((prevCart) => {
      const existing = prevCart.find((c) => c.id === item.id);
      if (existing) {
        return prevCart.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || cart.length === 0 || !selectedTable) return;

    const payload = {
      customer_name: customerName,
      table_number: parseInt(selectedTable),
      items: cart,
      total_amount: totalAmount,
    };

    try {
      const res = await fetch('http://127.0.0.1:8000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setOrderSuccess(data.order);
      setCart([]);
      setCustomerName('');
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchOrders();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Delete Order Handler
  const handleDeleteOrder = async (orderId) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
    }
  };

  // Dish CRUD
  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    const payload = {
      name: newItemName,
      description: newItemDesc,
      price: parseInt(newItemPrice),
      category: newItemCategory,
    };

    try {
      await fetch('http://127.0.0.1:8000/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setNewItemName('');
      setNewItemDesc('');
      setNewItemPrice('');
      fetchMenu();
    } catch (err) {
      console.error('Failed to create item:', err);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/menu/${id}`, {
        method: 'DELETE',
      });
      fetchMenu();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  // Table CRUD
  const handleCreateTable = async (e) => {
    e.preventDefault();
    setTableError('');
    if (!newTableNumber || !newTableCapacity) return;

    try {
      const res = await fetch('http://127.0.0.1:8000/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: parseInt(newTableNumber),
          capacity: parseInt(newTableCapacity),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTableError(data.detail || 'Could not create table');
        return;
      }
      setNewTableNumber('');
      fetchTables();
    } catch (err) {
      setTableError('Failed to create table.');
    }
  };

  const handleDeleteTable = async (tableId) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/tables/${tableId}`, {
        method: 'DELETE',
      });
      fetchTables();
    } catch (err) {
      console.error('Failed to delete table:', err);
    }
  };

  const filteredMenu = menu.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#0f172a',
        backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.88)), url("https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Header Bar */}
      <header
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.75rem' }}>🍕</span>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', background: 'linear-gradient(135deg, #ea580c, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Bistro & Bites
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setView('customer')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                backgroundColor: view === 'customer' ? '#ea580c' : 'transparent',
                color: view === 'customer' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              Customer View
            </button>
            <button
              onClick={() => requireAuthView('kitchen')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                backgroundColor: view === 'kitchen' ? '#0f172a' : 'transparent',
                color: view === 'kitchen' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              Kitchen 👨‍🍳
            </button>
            <button
              onClick={() => requireAuthView('admin')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                backgroundColor: view === 'admin' ? '#2563eb' : 'transparent',
                color: view === 'admin' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              Admin Controls ⚙️
            </button>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '700' }}>👤 {user.username} ({user.role})</span>
                <button
                  onClick={handleLogout}
                  style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#ffffff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', color: '#dc2626' }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setShowAuthModal(true); setAuthError(''); setAuthSuccessMsg(''); }}
                style={{ padding: '8px 16px', borderRadius: '8px', background: '#0f172a', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', marginLeft: '12px' }}
              >
                Staff Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '16px', width: '340px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.35rem', fontWeight: '800' }}>
              {authMode === 'login' ? 'Staff Login' : 'Staff Registration'}
            </h2>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              {authMode === 'login' ? 'Enter your credentials to access tools.' : 'Authorized personnel only.'}
            </p>
            
            {authError && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: '500' }}>{authError}</div>}
            {authSuccessMsg && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: '500' }}>{authSuccessMsg}</div>}

            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <input
                type="text"
                placeholder="Username"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                required
                style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
              />

              {authMode === 'register' && (
                <input
                  type="password"
                  placeholder="Manager Secret Passcode"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  required
                  style={{ padding: '10px 12px', border: '2px solid #ea580c', borderRadius: '8px', background: '#fff7ed', fontSize: '0.9rem', outline: 'none' }}
                />
              )}

              <button
                type="submit"
                style={{ backgroundColor: '#ea580c', color: '#ffffff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem', marginTop: '4px' }}
              >
                {authMode === 'login' ? 'Log In' : 'Create Staff Account'}
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
              {authMode === 'login' ? (
                <span onClick={() => { setAuthMode('register'); setAuthError(''); setAuthSuccessMsg(''); }} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}>
                  Have a staff passcode? Register
                </span>
              ) : (
                <span onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccessMsg(''); }} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}>
                  Already registered? Log In
                </span>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
              <button onClick={() => setShowAuthModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem 3rem 1.5rem' }}>
        {/* Customer View */}
        {view === 'customer' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
            <div>
              {/* Search & Category Filter */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  padding: '1.25rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  marginBottom: '1.5rem',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                }}
              >
                <input
                  type="text"
                  placeholder="🔍 Search dishes, ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#f8fafc',
                    outline: 'none',
                    marginBottom: '1rem',
                  }}
                />

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: selectedCategory === cat ? 'none' : '1px solid #e2e8f0',
                        backgroundColor: selectedCategory === cat ? '#ea580c' : '#ffffff',
                        color: selectedCategory === cat ? '#ffffff' : '#64748b',
                        boxShadow: selectedCategory === cat ? '0 4px 6px -1px rgba(234, 88, 12, 0.3)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '1.25rem', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {selectedCategory === 'All' ? 'Our Menu' : selectedCategory} ({filteredMenu.length})
              </h2>

              {loading ? (
                <p style={{ color: '#cbd5e1' }}>Loading fresh dishes...</p>
              ) : filteredMenu.length === 0 ? (
                <div style={{ background: 'rgba(255, 255, 255, 0.9)', padding: '3rem', textAlign: 'center', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#64748b', margin: 0, fontWeight: '600' }}>No items match your criteria.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
                  {filteredMenu.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '16px',
                        padding: '1.25rem',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', backgroundColor: '#fff7ed', color: '#ea580c', padding: '4px 10px', borderRadius: '20px' }}>
                          {item.category}
                        </span>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '12px 0 6px 0', color: '#0f172a' }}>{item.name}</h3>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>{item.description}</p>
                      </div>

                      <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>₹{item.price}</span>
                        <button
                          onClick={() => addToCart(item)}
                          style={{
                            backgroundColor: '#ea580c',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart with Dynamic Table Dropdown */}
            <aside
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(8px)',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                position: 'sticky',
                top: '90px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>Your Order</h2>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '8px', color: '#475569' }}>
                  {cart.reduce((a, b) => a + b.quantity, 0)} items
                </span>
              </div>

              {orderSuccess && (
                <div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '12px', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: '600', border: '1px solid #bbf7d0' }}>
                  🎉 Order #{orderSuccess.order_id} sent to kitchen!
                </div>
              )}

              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                  <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>🛒</span>
                  <p style={{ fontSize: '0.9rem', margin: 0 }}>Your cart is empty.</p>
                </div>
              ) : (
                <div>
                  <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '1.25rem' }}>
                    {cart.map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>{item.name}</div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>₹{item.price} × {item.quantity}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => removeFromCart(item.id)} style={{ width: '26px', height: '26px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{item.quantity}</span>
                          <button onClick={() => addToCart(item)} style={{ width: '26px', height: '26px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1rem 0', fontWeight: '800', fontSize: '1.15rem' }}>
                    <span>Total</span>
                    <span style={{ color: '#ea580c' }}>₹{totalAmount}</span>
                  </div>

                  <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                    />
                    
                    <select
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      required
                      style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', backgroundColor: '#ffffff' }}
                    >
                      {tables.length === 0 ? (
                        <option value="">No tables available</option>
                      ) : (
                        tables.map((t) => (
                          <option key={t.id} value={t.table_number}>
                            Table {t.table_number} ({t.capacity} seats)
                          </option>
                        ))
                      )}
                    </select>

                    <button
                      type="submit"
                      disabled={tables.length === 0}
                      style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', marginTop: '4px' }}
                    >
                      Place Order (₹{totalAmount})
                    </button>
                  </form>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* Kitchen Dashboard (With Delete Buttons) */}
        {view === 'kitchen' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                Live Kitchen Board 🛎️
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: '6px' }}>
                Auto-refreshing every 3s
              </span>
            </div>

            {orders.length === 0 ? (
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '4rem', textAlign: 'center', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.3)' }}>
                <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0, fontWeight: '600' }}>No active orders in the queue.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {orders.map((o) => (
                  <div
                    key={o.order_id}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontWeight: '800', fontSize: '1.15rem' }}>Order #{o.order_id}</span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        backgroundColor: o.status === 'Preparing' ? '#fef3c7' : o.status === 'Ready' ? '#dcfce7' : '#f1f5f9',
                        color: o.status === 'Preparing' ? '#b45309' : o.status === 'Ready' ? '#15803d' : '#475569',
                      }}>
                        {o.status}
                      </span>
                    </div>

                    <p style={{ margin: '4px 0 12px 0', fontSize: '0.9rem', color: '#475569' }}>
                      <strong>Table {o.table_number}</strong> • {o.customer_name}
                    </p>

                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', margin: '1rem 0' }}>
                      {o.items.map((it, idx) => (
                        <div key={idx} style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                          <span style={{ color: '#1e293b', fontWeight: '500' }}>{it.name}</span>
                          <span style={{ fontWeight: '700', color: '#ea580c' }}>×{it.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* Status Toggle Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem' }}>
                      <button onClick={() => updateStatus(o.order_id, 'Preparing')} style={{ flex: 1, padding: '8px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px', border: '1px solid #fde68a', background: '#fffbeb', color: '#b45309', fontWeight: '700' }}>Preparing</button>
                      <button onClick={() => updateStatus(o.order_id, 'Ready')} style={{ flex: 1, padding: '8px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px', border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#047857', fontWeight: '700' }}>Ready</button>
                      <button onClick={() => updateStatus(o.order_id, 'Served')} style={{ flex: 1, padding: '8px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: '700' }}>Served</button>
                    </div>

                    {/* Delete Order Button (Visible when logged in) */}
                    <button
                      onClick={() => handleDeleteOrder(o.order_id)}
                      style={{
                        width: '100%',
                        marginTop: '10px',
                        padding: '8px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        background: '#fee2e2',
                        color: '#dc2626',
                        fontWeight: '700',
                      }}
                    >
                      🗑️ Delete / Clear Order
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin Controls View */}
        {view === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {/* Table Management Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '2rem', alignItems: 'start' }}>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>Add Restaurant Table</h2>
                {tableError && <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{tableError}</div>}
                <form onSubmit={handleCreateTable} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <input
                    type="number"
                    placeholder="Table Number (e.g. 6)"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    required
                    style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <select
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', backgroundColor: '#ffffff' }}
                  >
                    <option value="2">2 Seater (Couple)</option>
                    <option value="4">4 Seater (Standard)</option>
                    <option value="6">6 Seater (Family)</option>
                    <option value="8">8 Seater (Party)</option>
                    <option value="12">12 Seater (VIP)</option>
                  </select>
                  <button
                    type="submit"
                    style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', marginTop: '4px' }}
                  >
                    + Add Table
                  </button>
                </form>
              </div>

              {/* Table Catalog Grid */}
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>Active Tables ({tables.length})</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                  {tables.map((t) => (
                    <div key={t.id} style={{ border: '1px solid #e2e8f0', padding: '12px', borderRadius: '10px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>Table {t.table_number}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t.capacity} Seats</div>
                      </div>
                      <button
                        onClick={() => handleDeleteTable(t.id)}
                        style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.75rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Menu Management Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '2rem', alignItems: 'start' }}>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>Add New Dish</h2>
                <form onSubmit={handleCreateItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <input
                    type="text"
                    placeholder="Dish Name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    required
                    style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <textarea
                    placeholder="Description"
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    rows="3"
                    style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', resize: 'none' }}
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    required
                    style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', backgroundColor: '#ffffff' }}
                  >
                    <option value="Pizza">Pizza</option>
                    <option value="Burgers">Burgers</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Sides">Sides</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                  <button
                    type="submit"
                    style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', marginTop: '4px' }}
                  >
                    + Add to Menu
                  </button>
                </form>
              </div>

              {/* Menu Catalog */}
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>Active Menu Catalog</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {menu.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #f1f5f9', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', background: '#e2e8f0', color: '#334155', padding: '3px 8px', borderRadius: '6px', marginRight: '8px' }}>
                          {item.category}
                        </span>
                        <strong style={{ fontSize: '0.95rem' }}>{item.name}</strong> — <span style={{ fontWeight: '700', color: '#ea580c' }}>₹{item.price}</span>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{item.description}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}