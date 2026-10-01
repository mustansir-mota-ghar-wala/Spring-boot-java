import { useEffect, useState, useMemo, useRef } from "react";
import "./App.css";

const API_BASE = "http://localhost:8080/api/products";

function App() {
  // ==========================================
  // REAL BACKEND STATE
  // ==========================================
  const [dashboard, setDashboard] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    expiringSoonProducts: 0,
    totalInventoryValue: 0
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);

  // Filters, Search & Sort
  const [currentFilter, setCurrentFilter] = useState("all"); // 'all' | 'low-stock' | 'expiring-soon' | 'out-of-stock' | 'search'
  const [searchName, setSearchName] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeNavTab, setActiveNavTab] = useState("Dashboard");

  // Theme (Light / Dark)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("inventory_theme") || "light";
  });

  // Modals & Popups
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, product: null });
  const [openActionId, setOpenActionId] = useState(null);

  // Form Fields (Aligned strictly with Product.java model)
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: "",
    price: "",
    expiryDate: ""
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Alerts & Notifications
  const [toasts, setToasts] = useState([]);
  const [reorderDismissed, setReorderDismissed] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  const actionMenuRef = useRef(null);

  // ==========================================
  // THEME EFFECT
  // ==========================================
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("inventory_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  // Close row action menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setOpenActionId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toast Notification Trigger
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // ==========================================
  // FETCH REAL DATA FROM SPRING BOOT
  // ==========================================
  const loadDashboard = () => {
    fetch(`${API_BASE}/dashboard`)
      .then(res => {
        if (!res.ok) throw new Error("Dashboard fetch failed");
        return res.json();
      })
      .then(data => {
        setDashboard(data);
        setBackendOnline(true);
      })
      .catch(err => {
        console.error("Error fetching dashboard from backend:", err);
        setBackendOnline(false);
      });
  };

  const loadAllProducts = (skipResetFilter = false) => {
    setLoading(true);
    fetch(API_BASE)
      .then(res => {
        if (!res.ok) throw new Error("Products fetch failed");
        return res.json();
      })
      .then(data => {
        setProducts(data);
        setBackendOnline(true);
        if (!skipResetFilter) {
          setCurrentFilter("all");
          setSearchName("");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching products from backend:", err);
        setBackendOnline(false);
        setLoading(false);
      });
  };

  const loadData = () => {
    loadDashboard();
    loadAllProducts(true);
  };

  useEffect(() => {
    loadDashboard();
    loadAllProducts();
  }, []);

  // ==========================================
  // REAL FILTER HANDLERS (Calling backend endpoints)
  // ==========================================
  const handleShowAll = () => {
    setCurrentFilter("all");
    setSearchName("");
    loadAllProducts();
  };

  const handleShowLowStock = () => {
    setCurrentFilter("low-stock");
    setSearchName("");
    setLoading(true);
    fetch(`${API_BASE}/low-stock`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching low stock:", err);
        setLoading(false);
      });
  };

  const handleShowExpiringSoon = () => {
    setCurrentFilter("expiring-soon");
    setSearchName("");
    setLoading(true);
    fetch(`${API_BASE}/expiring-soon`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching expiring soon:", err);
        setLoading(false);
      });
  };

  const handleShowOutOfStock = () => {
    setCurrentFilter("out-of-stock");
    setSearchName("");
    setLoading(true);
    fetch(API_BASE)
      .then(res => res.json())
      .then(data => {
        setProducts(data.filter(p => Number(p.quantity) === 0));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!searchName.trim()) {
      handleShowAll();
      return;
    }

    setCurrentFilter("search");
    setLoading(true);
    fetch(`${API_BASE}/search?name=${encodeURIComponent(searchName.trim())}`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error searching products:", err);
        setLoading(false);
      });
  };

  // ==========================================
  // STATUS HELPERS (Smart Inventory Business Logic)
  // ==========================================
  const getStockStatus = (quantity) => {
    const q = Number(quantity);
    if (q === 0) return { label: "Out of Stock", class: "danger" };
    if (q <= 5) return { label: "Low Stock", class: "warning" };
    return { label: "In Stock", class: "good" };
  };

  const getExpiryDetails = (expiryDate) => {
    if (!expiryDate) return { text: "No Expiry", class: "valid" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const difference = expiry.getTime() - today.getTime();
    const daysRemaining = Math.ceil(difference / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return { text: "Expired", class: "danger" };
    }
    if (daysRemaining <= 30) {
      return { text: `in ${daysRemaining} days`, class: "warning" };
    }
    return { text: "Valid", class: "valid" };
  };

  // Avatar color generator based on product name hash
  const getAvatarColor = (str = "") => {
    const colors = [
      "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
      "linear-gradient(135deg, #10b981 0%, #047857 100%)",
      "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
      "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
      "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)",
      "linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // ==========================================
  // ADD & EDIT PRODUCT MODAL
  // ==========================================
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "",
      quantity: "",
      price: "",
      expiryDate: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      category: product.category || "",
      quantity: product.quantity ?? "",
      price: product.price ?? "",
      expiryDate: product.expiryDate || ""
    });
    setOpenActionId(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      quantity: parseInt(formData.quantity, 10) || 0,
      price: parseFloat(formData.price) || 0.0,
      expiryDate: formData.expiryDate || null
    };

    if (editingProduct && editingProduct.id) {
      // PUT /api/products/{id}
      fetch(`${API_BASE}/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(res => {
          if (!res.ok) throw new Error("Update failed");
          return res.json();
        })
        .then(() => {
          addToast(`Updated product "${payload.name}" successfully!`, "success");
          handleCloseModal();
          loadData();
        })
        .catch(err => {
          console.error("Error updating product:", err);
          addToast("Failed to update product.", "error");
        })
        .finally(() => setFormSubmitting(false));
    } else {
      // POST /api/products
      fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(res => {
          if (!res.ok) throw new Error("Add failed");
          return res.json();
        })
        .then(() => {
          addToast(`Added "${payload.name}" to inventory!`, "success");
          handleCloseModal();
          loadData();
        })
        .catch(err => {
          console.error("Error adding product:", err);
          addToast("Failed to add product.", "error");
        })
        .finally(() => setFormSubmitting(false));
    }
  };

  // ==========================================
  // DELETE PRODUCT
  // ==========================================
  const promptDelete = (product) => {
    setOpenActionId(null);
    setDeleteDialog({ open: true, product });
  };

  const confirmDelete = () => {
    if (!deleteDialog.product) return;
    const { id, name } = deleteDialog.product;

    fetch(`${API_BASE}/${id}`, {
      method: "DELETE"
    })
      .then(res => {
        if (!res.ok) throw new Error("Delete failed");
        addToast(`Deleted "${name}"`, "info");
        setDeleteDialog({ open: false, product: null });
        setSelectedIds(prev => prev.filter(selId => selId !== id));
        loadData();
      })
      .catch(err => {
        console.error("Error deleting product:", err);
        addToast("Failed to delete product.", "error");
      });
  };

  // ==========================================
  // BATCH SELECTION
  // ==========================================
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(products.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Delete ${selectedIds.length} selected inventory products?`)) {
      Promise.all(
        selectedIds.map(id =>
          fetch(`${API_BASE}/${id}`, { method: "DELETE" })
        )
      )
        .then(() => {
          addToast(`Deleted ${selectedIds.length} products.`, "info");
          setSelectedIds([]);
          loadData();
        })
        .catch(() => addToast("Error during batch delete.", "error"));
    }
  };

  // ==========================================
  // SORTED PRODUCTS
  // ==========================================
  const sortedProducts = useMemo(() => {
    const list = [...products];
    switch (sortOption) {
      case "price-high":
        return list.sort((a, b) => (b.price || 0) - (a.price || 0));
      case "price-low":
        return list.sort((a, b) => (a.price || 0) - (b.price || 0));
      case "qty-low":
        return list.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
      case "qty-high":
        return list.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      case "name":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "id":
        return list.sort((a, b) => a.id - b.id);
      default:
        return list;
    }
  }, [products, sortOption]);

  // Derived real category breakdown from actual loaded products
  const categoryStats = useMemo(() => {
    const map = {};
    products.forEach(p => {
      const cat = p.category ? p.category.trim() : "Uncategorized";
      if (!map[cat]) {
        map[cat] = { count: 0, lowStock: 0, totalQty: 0 };
      }
      map[cat].count += 1;
      map[cat].totalQty += (p.quantity || 0);
      if (Number(p.quantity) <= 5) {
        map[cat].lowStock += 1;
      }
    });

    const entries = Object.keys(map).map(catName => ({
      name: catName,
      count: map[catName].count,
      lowStock: map[catName].lowStock,
      totalQty: map[catName].totalQty
    }));

    return entries.sort((a, b) => b.count - a.count);
  }, [products]);

  // Out of stock count from real data
  const outOfStockCount = useMemo(() => {
    return products.filter(p => Number(p.quantity) === 0).length;
  }, [products]);

  // Available unique categories from current products for easy auto-fill
  const existingCategories = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(set);
  }, [products]);

  // ==========================================
  // RENDER UI
  // ==========================================
  return (
    <div className="app-container">
      {/* ----------------------------------------------------------------------
          TOP NAVIGATION BAR (Matching PolicyPilot Layout with Smart Inventory Features)
          ---------------------------------------------------------------------- */}
      <header className="navbar">
        {/* Brand / Logo */}
        <div className="nav-brand" onClick={handleShowAll}>
          <div className="brand-badge">
            <span>📦</span>
          </div>
          <div className="brand-name">
            Smart<span>Inventory</span>
          </div>
        </div>

        {/* Center Navigation Tabs (Direct Smart Inventory Views) */}
        <nav className="nav-links">
          {[
            { id: "Dashboard", label: "Dashboard", onClick: handleShowAll },
            { id: "Products", label: "All Products", onClick: handleShowAll },
            { id: "LowStock", label: "Low Stock", onClick: handleShowLowStock },
            { id: "ExpiringSoon", label: "Expiring Soon", onClick: handleShowExpiringSoon }
          ].map(tab => (
            <button
              key={tab.id}
              className={`nav-pill ${activeNavTab === tab.id ? "active" : ""}`}
              onClick={() => {
                setActiveNavTab(tab.id);
                tab.onClick();
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right Action Icons & User Info */}
        <div className="nav-actions">
          {/* Backend Status Dot */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: backendOnline ? "var(--status-green)" : "var(--status-red)",
              fontWeight: 500
            }}
            title={backendOnline ? "Spring Boot backend connected" : "Cannot reach backend (port 8080)"}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: backendOnline ? "var(--status-green)" : "var(--status-red)"
              }}
            ></span>
            <span>{backendOnline ? "Online" : "Offline"}</span>
          </div>

          {/* Theme Toggle (Dark / Light) */}
          <button
            className="icon-btn"
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
            onClick={toggleTheme}
          >
            {theme === "light" ? "☾" : "☀"}
          </button>

          {/* Notifications Bell */}
          <button
            className="icon-btn"
            title="Notifications"
            onClick={() => {
              if (dashboard.lowStockProducts > 0 || dashboard.expiringSoonProducts > 0) {
                addToast(
                  `Notice: ${dashboard.lowStockProducts} low stock & ${dashboard.expiringSoonProducts} expiring items.`,
                  "info"
                );
              } else {
                addToast("All stock levels healthy.", "success");
              }
            }}
          >
            <span>🔔</span>
            {(dashboard.lowStockProducts > 0 || dashboard.expiringSoonProducts > 0) && (
              <span className="notification-badge"></span>
            )}
          </button>

          <div className="nav-divider"></div>

          {/* User Profile */}
          <div className="user-profile" title="Smart Inventory Store Admin">
            <div className="user-avatar">
              SI
            </div>
            <div className="user-info">
              <span className="user-name">Store Admin</span>
              <span className="user-role">Manager</span>
            </div>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------------------
          MAIN PAGE CONTENT
          ---------------------------------------------------------------------- */}
      <main className="main-wrapper">
        {/* Top Header Row with "+ Add Product" button */}
        <div className="dashboard-header-row">
          <div>
            <h1 className="page-title">Dashboard</h1>
          </div>
          <button className="btn-primary" onClick={handleOpenAddModal}>
            <span>+</span> Add Product
          </button>
        </div>

        {/* --------------------------------------------------------------------
            TOP 4 KPI METRIC CARDS (100% Real Spring Boot Dashboard Data)
            -------------------------------------------------------------------- */}
        <section className="kpi-grid">
          {/* Card 1: Total Products (Emerald Green) */}
          <div
            className={`kpi-card kpi-card-green ${currentFilter === "all" ? "active-filter" : ""}`}
            onClick={handleShowAll}
            title="Click to view all products"
          >
            <div className="kpi-top">
              <div className="kpi-icon-wrap green">
                <span>✓</span>
              </div>
              <span className="arrow-icon">↗</span>
            </div>
            <div className="kpi-title">Total Products</div>
            <div className="kpi-value">
              {dashboard.totalProducts}
            </div>
            <div className="kpi-subtitle">Catalog items</div>
          </div>

          {/* Card 2: Expiring Soon (Rose Coral) */}
          <div
            className={`kpi-card kpi-card-red ${currentFilter === "expiring-soon" ? "active-filter" : ""}`}
            onClick={handleShowExpiringSoon}
            title="Click to view expiring products"
          >
            <div className="kpi-top">
              <div className="kpi-icon-wrap red">
                <span>!</span>
              </div>
              <span className="arrow-icon">↗</span>
            </div>
            <div className="kpi-title">Expiring Soon</div>
            <div className="kpi-value">
              {dashboard.expiringSoonProducts}
            </div>
            <div className="kpi-subtitle">Within 30 days</div>
          </div>

          {/* Card 3: Low Stock Alert (Amber Orange) */}
          <div
            className={`kpi-card kpi-card-orange ${currentFilter === "low-stock" ? "active-filter" : ""}`}
            onClick={handleShowLowStock}
            title="Click to view low stock items"
          >
            <div className="kpi-top">
              <div className="kpi-icon-wrap orange">
                <span>⚠</span>
              </div>
              <span className="arrow-icon">↗</span>
            </div>
            <div className="kpi-title">Low Stock Alert</div>
            <div className="kpi-value">
              {dashboard.lowStockProducts}
            </div>
            <div className="kpi-subtitle">Quantity ≤ 5 units</div>
          </div>

          {/* Card 4: Inventory Valuation (Royal Cobalt Blue) */}
          <div
            className="kpi-card kpi-card-blue"
            onClick={() => {
              addToast(`Total Inventory Valuation: ₹${Number(dashboard.totalInventoryValue).toLocaleString("en-IN")}`, "info");
            }}
            title="Total monetary valuation of all items in stock"
          >
            <div className="kpi-top">
              <div className="kpi-icon-wrap blue">
                <span>₹</span>
              </div>
              <span className="arrow-icon">↗</span>
            </div>
            <div className="kpi-title">Inventory Value</div>
            <div className="kpi-value">
              ₹{Number(dashboard.totalInventoryValue).toLocaleString("en-IN")}
            </div>
            <div className="kpi-subtitle">Active stock value</div>
          </div>
        </section>

        {/* --------------------------------------------------------------------
            TWO-COLUMN MAIN SECTION (Matching Screenshot Layout)
            -------------------------------------------------------------------- */}
        <div className="dashboard-content-grid">
          {/* ================================================================
              LEFT COLUMN: PRODUCTS INVENTORY TABLE
              ================================================================ */}
          <div className="table-panel-card">
            <div className="panel-header">
              <div className="panel-title-wrap">
                <h2 className="panel-title">Products Inventory</h2>
              </div>
              <span className="panel-arrow">↗</span>
            </div>

            {/* Table Actions Bar */}
            <div className="table-actions-bar">
              {/* Filter Tabs */}
              <div className="actions-left-group">
                <button
                  className={`btn-outline ${currentFilter === "all" ? "active" : ""}`}
                  onClick={handleShowAll}
                >
                  All ({dashboard.totalProducts})
                </button>

                <button
                  className={`btn-outline ${currentFilter === "low-stock" ? "active" : ""}`}
                  onClick={handleShowLowStock}
                >
                  Low Stock ({dashboard.lowStockProducts})
                </button>

                <button
                  className={`btn-outline ${currentFilter === "expiring-soon" ? "active" : ""}`}
                  onClick={handleShowExpiringSoon}
                >
                  Expiring Soon ({dashboard.expiringSoonProducts})
                </button>

                {outOfStockCount > 0 && (
                  <button
                    className={`btn-outline ${currentFilter === "out-of-stock" ? "active" : ""}`}
                    onClick={handleShowOutOfStock}
                  >
                    Out of Stock ({outOfStockCount})
                  </button>
                )}
              </div>

              {/* Right Search & Sort Controls */}
              <div className="actions-right-group">
                {/* Search Bar (Calls GET /api/products/search?name=...) */}
                <form className="search-wrapper" onSubmit={handleSearchSubmit}>
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by name.."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                  {searchName && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => {
                        setSearchName("");
                        handleShowAll();
                      }}
                    >
                      ✕
                    </button>
                  )}
                </form>

                {/* Sort By Dropdown */}
                <div className="sort-select-wrapper">
                  <select
                    className="sort-select"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                  >
                    <option value="default">Sort by ⌵</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="qty-low">Quantity: Low first</option>
                    <option value="qty-high">Quantity: High first</option>
                    <option value="id">Product ID</option>
                  </select>
                  <span className="sort-arrow"></span>
                </div>
              </div>
            </div>

            {/* Batch Action Bar (When rows are checked) */}
            {selectedIds.length > 0 && (
              <div className="batch-bar">
                <span className="batch-info">
                  {selectedIds.length} product{selectedIds.length > 1 ? "s" : ""} selected
                </span>
                <div className="batch-actions">
                  <button className="btn-batch-delete" onClick={handleBulkDelete}>
                    Delete Selected
                  </button>
                  <button
                    className="btn-batch-clear"
                    onClick={() => setSelectedIds([])}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Product Table */}
            <div className="table-container">
              <table className="policy-table">
                <thead>
                  <tr>
                    <th style={{ width: "32px", paddingRight: "4px" }}>
                      <input
                        type="checkbox"
                        className="table-checkbox"
                        checked={
                          sortedProducts.length > 0 &&
                          selectedIds.length === sortedProducts.length
                        }
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="th-sortable" onClick={() => setSortOption("name")}>
                      Product ⌵
                    </th>
                    <th className="th-sortable" onClick={() => setSortOption("id")} style={{ width: "50px" }}>
                      ID ⌵
                    </th>
                    <th>Category ⌵</th>
                    <th className="th-sortable" onClick={() => setSortOption("qty-low")}>
                      Qty ⌵
                    </th>
                    <th className="th-sortable" onClick={() => setSortOption("price-high")}>
                      Price ⌵
                    </th>
                    <th>Expiry Date ⌵</th>
                    <th>Status ⌵</th>
                    <th style={{ textAlign: "right", minWidth: "150px" }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "40px" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                          Fetching products from database...
                        </div>
                      </td>
                    </tr>
                  ) : sortedProducts.length === 0 ? (
                    <tr>
                      <td colSpan="9">
                        <div className="empty-table-state">
                          <div className="empty-icon-wrap">📦</div>
                          <div className="empty-title">No products found</div>
                          <div className="empty-subtitle">
                            {searchName
                              ? `No inventory item matches "${searchName}"`
                              : "No products currently found in this filter."}
                          </div>
                          <button
                            className="btn-primary"
                            style={{ margin: "0 auto", padding: "8px 18px", fontSize: "13px" }}
                            onClick={handleShowAll}
                          >
                            Reset Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedProducts.map((product) => {
                      const isSelected = selectedIds.includes(product.id);
                      const expiry = getExpiryDetails(product.expiryDate);
                      const stock = getStockStatus(product.quantity);
                      const avatarBg = getAvatarColor(product.name);

                      return (
                        <tr
                          key={product.id}
                          className={`table-row ${isSelected ? "row-selected" : ""}`}
                        >
                          {/* Checkbox */}
                          <td style={{ paddingRight: "4px" }}>
                            <input
                              type="checkbox"
                              className="table-checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(product.id)}
                            />
                          </td>

                          {/* Product Name with Avatar Initials */}
                          <td>
                            <div className="product-cell">
                              <div
                                className="product-avatar"
                                style={{ background: avatarBg }}
                              >
                                {product.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="product-title" title={product.name}>
                                {product.name}
                              </span>
                            </div>
                          </td>

                          {/* Product ID */}
                          <td>
                            <span className="product-code">
                              #{product.id}
                            </span>
                          </td>

                          {/* Category */}
                          <td>
                            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                              {product.category || "—"}
                            </span>
                          </td>

                          {/* Quantity */}
                          <td>
                            <span
                              style={{
                                fontWeight: 700,
                                color:
                                  product.quantity === 0
                                    ? "var(--status-red)"
                                    : product.quantity <= 5
                                    ? "var(--status-orange)"
                                    : "var(--text-primary)"
                              }}
                            >
                              {product.quantity}
                            </span>
                          </td>

                          {/* Price */}
                          <td>
                            <span style={{ fontWeight: 600 }}>
                              ₹{Number(product.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* Expiry Date with countdown tag */}
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                                {product.expiryDate || "N/A"}
                              </span>
                              <span className={`badge-expiry ${expiry.class}`}>
                                {expiry.text}
                              </span>
                            </div>
                          </td>

                          {/* Stock Status Pill */}
                          <td>
                            <span className={`status-pill ${stock.class}`}>
                              <span className="dot-indicator"></span>
                              {stock.label}
                            </span>
                          </td>

                          {/* Inline Visible Actions: Edit & Delete Buttons */}
                          <td className="action-cell">
                            <div className="table-actions-inline">
                              <button
                                className="btn-action-edit"
                                onClick={() => handleOpenEditModal(product)}
                                title={`Edit ${product.name}`}
                              >
                                <span>✏️</span>
                                <span>Edit</span>
                              </button>
                              <button
                                className="btn-action-delete"
                                onClick={() => promptDelete(product)}
                                title={`Delete ${product.name}`}
                              >
                                <span>🗑️</span>
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================================================================
              RIGHT COLUMN: REAL CATEGORY BREAKDOWN & ACTION QUEUE
              ================================================================ */}
          <div className="sidebar-panels-col">
            {/* Top Right Card: Real Category Breakdown */}
            <div className="category-review-card">
              <div className="panel-header">
                <h2 className="panel-title">Category Breakdown</h2>
                <span className="panel-arrow">↗</span>
              </div>

              {/* Real Category rows derived from fetched products */}
              <div className="category-list">
                {categoryStats.length === 0 ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                    No categories registered yet.
                  </div>
                ) : (
                  categoryStats.map((item, idx) => (
                    <div key={idx} className="category-row">
                      <div className="cat-left">
                        <div
                          className="cat-avatar"
                          style={{
                            background: getAvatarColor(item.name),
                            color: "#ffffff"
                          }}
                        >
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="cat-text">
                          <span className="cat-name">{item.name}</span>
                          <span className="cat-stat">{item.count} item{item.count > 1 ? "s" : ""} ({item.totalQty} units)</span>
                        </div>
                      </div>

                      <div className="cat-mid">
                        <span className="cat-mid-label">Stock Status</span>
                        <span
                          className="cat-mid-val"
                          style={{
                            color: item.lowStock > 0 ? "var(--status-orange-text)" : "var(--status-green-text)",
                            fontWeight: 600
                          }}
                        >
                          {item.lowStock > 0 ? `${item.lowStock} Low Stock` : "All Healthy"}
                        </span>
                      </div>

                      <div className="cat-tag">
                        <span>Active</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reorder Callout Box if any low stock products exist */}
              {!reorderDismissed && dashboard.lowStockProducts > 0 && (
                <div className="reorder-callout-box" onClick={handleShowLowStock} style={{ cursor: "pointer" }}>
                  <div className="callout-left">
                    <div className="callout-icon">
                      <span>⚠</span>
                    </div>
                    <div>
                      <div className="callout-title">
                        {dashboard.lowStockProducts} Product{dashboard.lowStockProducts > 1 ? "s" : ""} Need Restock
                      </div>
                      <div className="callout-desc">
                        Click to review low stock inventory items.
                      </div>
                    </div>
                  </div>
                  <button
                    className="callout-close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReorderDismissed(true);
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Right Card: Blue Gradient Inventory Action Queue */}
            <div className="gradient-queue-card">
              <div className="gradient-header">
                <span className="gradient-title">Inventory Action Queue</span>
                <span className="gradient-arrow-btn" title="View queue">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7"/>
                    <polyline points="7 7 17 7 17 17"/>
                  </svg>
                </span>
              </div>

              {/* 2x2 Real Metric Tiles with Clean SVGs & Distinct Tint Accents */}
              <div className="gradient-grid">
                {/* Tile 1: Low Stock (Amber) */}
                <div
                  className="gradient-tile tile-amber"
                  onClick={handleShowLowStock}
                  title="Filter low stock products"
                >
                  <div className="tile-icon-svg">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div className="tile-data">
                    <span className="tile-count">+{dashboard.lowStockProducts}</span>
                    <span className="tile-label">Low Stock</span>
                  </div>
                </div>

                {/* Tile 2: Expiring Soon (Rose) */}
                <div
                  className="gradient-tile tile-rose"
                  onClick={handleShowExpiringSoon}
                  title="Filter expiring products"
                >
                  <div className="tile-icon-svg">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div className="tile-data">
                    <span className="tile-count">+{dashboard.expiringSoonProducts}</span>
                    <span className="tile-label">Expiring Soon</span>
                  </div>
                </div>

                {/* Tile 3: Out of Stock (Purple) */}
                <div
                  className="gradient-tile tile-purple"
                  onClick={handleShowOutOfStock}
                  title="Filter out of stock products"
                >
                  <div className="tile-icon-svg">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                      <path d="m3.3 7 8.7 5 8.7-5"/>
                      <path d="M12 22V12"/>
                    </svg>
                  </div>
                  <div className="tile-data">
                    <span className="tile-count">+{outOfStockCount}</span>
                    <span className="tile-label">Out of Stock</span>
                  </div>
                </div>

                {/* Tile 4: Active In-Stock Items (Emerald) */}
                <div
                  className="gradient-tile tile-emerald"
                  onClick={handleShowAll}
                  title="View all active inventory items"
                >
                  <div className="tile-icon-svg">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                      <path d="m9 12 2 2 4-4"/>
                    </svg>
                  </div>
                  <div className="tile-data">
                    <span className="tile-count">{dashboard.totalProducts}</span>
                    <span className="tile-label">Total In-Stock</span>
                  </div>
                </div>
              </div>

              {/* Notice Banner */}
              {!noticeDismissed && (
                <div className="gradient-notice-banner">
                  <div className="notice-icon-svg">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                  </div>
                  <span className="notice-text">
                    Review low stock & expiring items promptly to avoid supply delays.
                  </span>
                  <button
                    className="notice-close-btn"
                    onClick={() => setNoticeDismissed(true)}
                    title="Dismiss notice"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ----------------------------------------------------------------------
          MODAL: ADD / EDIT PRODUCT (Mapped directly to Product model)
          ---------------------------------------------------------------------- */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {editingProduct ? `Edit Product #${editingProduct.id}` : "Add New Product"}
                </h3>
                <p className="modal-subtitle">
                  {editingProduct
                    ? "Update product details, stock quantity, and pricing."
                    : "Add a new inventory product to your warehouse catalog."}
                </p>
              </div>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-form">
                {/* Product Name */}
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Drill Machine, Grinder, Safety Helmet"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Power Tools, Electronics, Safety"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                  {existingCategories.length > 0 && (
                    <div className="category-chips">
                      {existingCategories.map(cat => (
                        <button
                          type="button"
                          key={cat}
                          className="cat-chip"
                          onClick={() => setFormData({ ...formData, category: cat })}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quantity & Price */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="form-input"
                      placeholder="e.g. 10"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="form-input"
                      placeholder="e.g. 4500.00"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>

                {/* Expiry Date */}
                <div className="form-group">
                  <label className="form-label">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseModal}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting
                    ? "Saving..."
                    : editingProduct
                    ? "Update Product"
                    : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          MODAL: DELETE CONFIRMATION
          ---------------------------------------------------------------------- */}
      {deleteDialog.open && (
        <div className="modal-overlay" onClick={() => setDeleteDialog({ open: false, product: null })}>
          <div className="modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Product?</h3>
              <button
                className="modal-close-btn"
                onClick={() => setDeleteDialog({ open: false, product: null })}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "20px 28px", fontSize: "14px", color: "var(--text-secondary)" }}>
              Are you sure you want to permanently delete{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {deleteDialog.product?.name}
              </strong>{" "}
              (ID #{deleteDialog.product?.id}) from inventory? This action cannot be reversed.
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setDeleteDialog({ open: false, product: null })}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ backgroundColor: "var(--status-red)" }}
                onClick={confirmDelete}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          TOAST NOTIFICATIONS
          ---------------------------------------------------------------------- */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span>
              {toast.type === "success" ? "✓" : toast.type === "error" ? "⚠" : "ℹ"}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;