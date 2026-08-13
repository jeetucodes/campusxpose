import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2, Edit, Loader2, RefreshCw, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadToImgbb } from "@/lib/upload";

export const Route = createFileRoute("/admin/store")({
  head: () => ({ meta: [{ title: "Admin · Store" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminShell>
      <AdminStoreManagement />
    </AdminShell>
  ),
});

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";

const BANNER_PALETTES = [
  { name: 'Red', bg: 'bg-red-50', text: 'text-red-900', badge_bg: 'bg-red-200', badge_text: 'text-red-700', badge_border: 'border-red-900', hex: '#fee2e2' },
  { name: 'Blue', bg: 'bg-blue-50', text: 'text-blue-900', badge_bg: 'bg-blue-200', badge_text: 'text-blue-700', badge_border: 'border-blue-900', hex: '#eff6ff' },
  { name: 'Green', bg: 'bg-green-50', text: 'text-green-900', badge_bg: 'bg-green-200', badge_text: 'text-green-700', badge_border: 'border-green-900', hex: '#f0fdf4' },
  { name: 'Yellow', bg: 'bg-yellow-50', text: 'text-yellow-900', badge_bg: 'bg-yellow-200', badge_text: 'text-yellow-700', badge_border: 'border-yellow-900', hex: '#fefce8' },
  { name: 'Purple', bg: 'bg-purple-50', text: 'text-purple-900', badge_bg: 'bg-purple-200', badge_text: 'text-purple-700', badge_border: 'border-purple-900', hex: '#faf5ff' },
  { name: 'Pink', bg: 'bg-pink-50', text: 'text-pink-900', badge_bg: 'bg-pink-200', badge_text: 'text-pink-700', badge_border: 'border-pink-900', hex: '#fdf2f8' },
  { name: 'Orange', bg: 'bg-orange-50', text: 'text-orange-900', badge_bg: 'bg-orange-200', badge_text: 'text-orange-700', badge_border: 'border-orange-900', hex: '#fff7ed' },
  { name: 'Gray', bg: 'bg-gray-100', text: 'text-gray-900', badge_bg: 'bg-gray-200', badge_text: 'text-gray-800', badge_border: 'border-gray-900', hex: '#f3f4f6' },
];

const CATEGORY_COLORS = [
  { name: 'Orange', class: 'bg-orange-50', hex: '#fff7ed' },
  { name: 'Blue', class: 'bg-blue-50', hex: '#eff6ff' },
  { name: 'Green', class: 'bg-green-50', hex: '#f0fdf4' },
  { name: 'Yellow', class: 'bg-yellow-50', hex: '#fefce8' },
  { name: 'Purple', class: 'bg-purple-50', hex: '#faf5ff' },
  { name: 'Pink', class: 'bg-pink-50', hex: '#fdf2f8' },
  { name: 'Red', class: 'bg-red-50', hex: '#fee2e2' },
  { name: 'Gray', class: 'bg-gray-100', hex: '#f3f4f6' },
];

type Product = {
  id: string;
  name: string;
  qty: string;
  price: string;
  original_price: string;
  time: string;
  icon_url: string;
  platform: string;
  category: string;
  description: string;
  is_hot_deal: boolean;
  buy_url: string;
};

type Category = {
  id: string;
  name: string;
  icon_url: string;
  color_class: string;
};

type Banner = {
  id: string;
  title: string;
  category: string;
  badge_text: string;
  image_url: string;
  bg_class: string;
  text_class: string;
  badge_bg_class: string;
  badge_text_class: string;
  badge_border_class: string;
};

function AdminStoreManagement() {
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "banners">("products");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-green-600" />
            Store Management
          </h1>
          <p className="text-gray-500 font-medium mt-1">Manage your shop inventory, categories, and promotional banners.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-gray-900 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab("products")}
          className={cn(
            "px-4 py-2 font-black border-2 border-transparent transition-all",
            activeTab === "products" ? "bg-green-100 text-green-900 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "text-gray-500 hover:bg-gray-100 rounded-lg"
          )}
          style={{ borderRadius: activeTab === "products" ? WOBBLY_MD : undefined }}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={cn(
            "px-4 py-2 font-black border-2 border-transparent transition-all",
            activeTab === "categories" ? "bg-purple-100 text-purple-900 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "text-gray-500 hover:bg-gray-100 rounded-lg"
          )}
          style={{ borderRadius: activeTab === "categories" ? WOBBLY_MD : undefined }}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab("banners")}
          className={cn(
            "px-4 py-2 font-black border-2 border-transparent transition-all",
            activeTab === "banners" ? "bg-blue-100 text-blue-900 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "text-gray-500 hover:bg-gray-100 rounded-lg"
          )}
          style={{ borderRadius: activeTab === "banners" ? WOBBLY_MD : undefined }}
        >
          Banners
        </button>
      </div>
      
      {activeTab === "products" && <ProductsTab />}
      {activeTab === "categories" && <CategoriesTab />}
      {activeTab === "banners" && <BannersTab />}
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({ platform: 'Amazon', is_hot_deal: false });

  const fetchProducts = async () => {
    setLoading(true);
    const [prodRes, catRes] = await Promise.all([
      (supabase as any).from('store_products').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('store_categories').select('*').order('name', { ascending: true })
    ]);
    if (prodRes.error) {
      toast.error("Failed to load products");
    } else {
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadToImgbb(file);
      setFormData(prev => ({ ...prev, [field]: url }));
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.category) {
      toast.error("Name, category, and price are required");
      return;
    }

    try {
      if (editingId) {
        const { error } = await (supabase as any).from('store_products').update(formData).eq('id', editingId);
        if (error) throw error;
        toast.success("Product updated!");
      } else {
        const { error } = await (supabase as any).from('store_products').insert([formData]);
        if (error) throw error;
        toast.success("Product added!");
      }
      setShowAdd(false);
      setEditingId(null);
      setFormData({ platform: 'Amazon', is_hot_deal: false });
      fetchProducts();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const { error } = await (supabase as any).from('store_products').delete().eq('id', id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Deleted!");
      fetchProducts();
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Manage Products</h2>
        <Button onClick={() => { setShowAdd(!showAdd); setEditingId(null); setFormData({ platform: 'Amazon', is_hot_deal: false }); }} className="gap-2 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-green-300 text-green-900 hover:bg-green-400" style={{ borderRadius: WOBBLY_MD }}>
          {showAdd ? "Cancel" : <><Plus className="w-4 h-4" /> Add Product</>}
        </Button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
          <h3 className="font-bold text-lg mb-4">{editingId ? "Edit Product" : "Add New Product"}</h3>
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 border-2 border-gray-900 rounded-lg">
              <h4 className="font-bold mb-3 border-b-2 border-gray-200 pb-2">1. Basic Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-sm font-bold">Name</label><Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Maggi 2-Minute Noodles" /></div>
                <div>
                  <label className="text-sm font-bold">Category</label>
                  <select 
                    value={formData.category || ''} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>Select a category...</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2"><label className="text-sm font-bold">Description</label><Textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Product details..." /></div>
                <div>
                  <label className="text-sm font-bold flex justify-between">
                    Product Image
                    {uploadingImage && <Loader2 className="w-4 h-4 animate-spin text-green-600" />}
                  </label>
                  <div className="flex gap-2">
                    <Input value={formData.icon_url || ''} onChange={e => setFormData({...formData, icon_url: e.target.value})} placeholder="https://..." className="flex-1" />
                    <label className="flex items-center justify-center bg-white hover:bg-gray-100 border-2 border-gray-900 rounded px-3 cursor-pointer transition-colors" title="Upload to ImgBB">
                      <Upload className="w-4 h-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'icon_url')} disabled={uploadingImage} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-2 border-gray-900 rounded-lg">
              <h4 className="font-bold mb-3 border-b-2 border-gray-200 pb-2">2. Pricing & Delivery</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="text-sm font-bold">Price</label><Input value={formData.price || ''} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="e.g. ₹30" /></div>
                <div><label className="text-sm font-bold text-gray-500">Original Price (Optional)</label><Input value={formData.original_price || ''} onChange={e => setFormData({...formData, original_price: e.target.value})} placeholder="e.g. ₹35" /></div>
                <div><label className="text-sm font-bold">Quantity/Size</label><Input value={formData.qty || ''} onChange={e => setFormData({...formData, qty: e.target.value})} placeholder="e.g. 140 g" /></div>
                <div><label className="text-sm font-bold">Delivery Time</label><Input value={formData.time || ''} onChange={e => setFormData({...formData, time: e.target.value})} placeholder="e.g. 10 MINS" /></div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-2 border-gray-900 rounded-lg">
              <h4 className="font-bold mb-3 border-b-2 border-gray-200 pb-2">3. External Affiliate Link</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-sm font-bold">Platform Name</label><Input value={formData.platform || ''} onChange={e => setFormData({...formData, platform: e.target.value})} placeholder="Amazon, Flipkart..." /></div>
                <div><label className="text-sm font-bold text-blue-600">Buy Link (Redirect URL)</label><Input value={formData.buy_url || ''} onChange={e => setFormData({...formData, buy_url: e.target.value})} placeholder="https://amazon.in/dp/..." className="border-blue-300 bg-blue-50" /></div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="hotdeal" checked={formData.is_hot_deal || false} onChange={e => setFormData({...formData, is_hot_deal: e.target.checked})} className="w-5 h-5 accent-pink-500 cursor-pointer" />
              <label htmlFor="hotdeal" className="font-bold text-pink-600 cursor-pointer">Mark as Hot Deal (Shows on top of the list)</label>
            </div>
          </div>
          <Button onClick={handleSave} disabled={uploadingImage} className="mt-6 w-full gap-2 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-yellow-300 text-yellow-900 hover:bg-yellow-400 font-black">
            Save Product
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => (
          <div key={p.id} className="bg-white border-2 border-gray-900 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col" style={{ borderRadius: WOBBLY_MD }}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                {p.icon_url ? <img src={p.icon_url} alt="" className="w-12 h-12 rounded object-cover border border-gray-200" /> : <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs">No img</div>}
                <div>
                  <h3 className="font-bold leading-tight">{p.name}</h3>
                  <p className="text-xs text-gray-500">{p.category} • {p.qty}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingId(p.id); setFormData(p); setShowAdd(true); }} className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="mt-auto pt-3 flex justify-between items-center">
              <div className="font-black text-lg">{p.price} <span className="text-xs text-gray-400 line-through font-normal">{p.original_price}</span></div>
              <div className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-full">{p.platform}</div>
            </div>
          </div>
        ))}
        {products.length === 0 && <div className="col-span-full py-10 text-center text-gray-500 font-bold border-2 border-dashed border-gray-300 rounded-2xl">No products yet.</div>}
      </div>
    </div>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState<Partial<Category>>({ color_class: 'bg-green-50' });

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from('store_categories').select('*').order('created_at', { ascending: true });
    if (!error) setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadToImgbb(file);
      setFormData(prev => ({ ...prev, [field]: url }));
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) return toast.error("Name required");
    try {
      if (editingId) {
        await (supabase as any).from('store_categories').update(formData).eq('id', editingId);
      } else {
        await (supabase as any).from('store_categories').insert([formData]);
      }
      toast.success("Saved!");
      setShowAdd(false); setEditingId(null); setFormData({ color_class: 'bg-green-50' });
      fetchCategories();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await (supabase as any).from('store_categories').delete().eq('id', id);
    fetchCategories();
  };

  if (loading) return <div className="p-10"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Manage Categories</h2>
        <Button onClick={() => { setShowAdd(!showAdd); setEditingId(null); setFormData({ color_class: 'bg-green-50' }); }} className="gap-2 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-purple-300 text-purple-900 hover:bg-purple-400" style={{ borderRadius: WOBBLY_MD }}>
          {showAdd ? "Cancel" : <><Plus className="w-4 h-4" /> Add Category</>}
        </Button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-bold">Name</label><Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Snacks" /></div>
            <div>
              <label className="text-sm font-bold mb-2 block">Background Color</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map(c => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setFormData({...formData, color_class: c.class})}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color_class === c.class ? 'border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-110' : 'border-gray-300 hover:border-gray-500'}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-bold flex justify-between">
                Icon Image URL
                {uploadingImage && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
              </label>
              <div className="flex gap-2">
                <Input value={formData.icon_url || ''} onChange={e => setFormData({...formData, icon_url: e.target.value})} placeholder="https://..." className="flex-1" />
                <label className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 border-2 border-gray-900 rounded px-3 cursor-pointer transition-colors" title="Upload to ImgBB">
                  <Upload className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'icon_url')} disabled={uploadingImage} />
                </label>
              </div>
            </div>
          </div>
          <Button onClick={handleSave} disabled={uploadingImage} className="mt-6 w-full gap-2 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-yellow-300 text-yellow-900 hover:bg-yellow-400 font-black">Save Category</Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.map(c => (
          <div key={c.id} className={`${c.color_class} border-2 border-gray-900 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center relative group`} style={{ borderRadius: WOBBLY_MD }}>
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingId(c.id); setFormData(c); setShowAdd(true); }} className="p-1 bg-white border border-gray-900 rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"><Edit className="w-3 h-3" /></button>
              <button onClick={() => handleDelete(c.id)} className="p-1 bg-red-100 border border-gray-900 rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-red-600"><Trash2 className="w-3 h-3" /></button>
            </div>
            {c.icon_url ? <img src={c.icon_url} alt="" className="w-12 h-12 object-cover rounded-xl mb-2" /> : <div className="w-12 h-12 bg-white rounded-full mb-2 border border-gray-300" />}
            <span className="font-black text-sm">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BannersTab() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState<Partial<Banner>>({});

  const fetchBanners = async () => {
    setLoading(true);
    const [banRes, catRes] = await Promise.all([
      (supabase as any).from('store_banners').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('store_categories').select('*').order('name', { ascending: true })
    ]);
    if (!banRes.error) {
      setBanners(banRes.data || []);
      setCategories(catRes.data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadToImgbb(file);
      setFormData(prev => ({ ...prev, [field]: url }));
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.category) return toast.error("Title and category required");
    try {
      if (editingId) {
        await (supabase as any).from('store_banners').update(formData).eq('id', editingId);
      } else {
        await (supabase as any).from('store_banners').insert([formData]);
      }
      toast.success("Saved!");
      setShowAdd(false); setEditingId(null); setFormData({});
      fetchBanners();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await (supabase as any).from('store_banners').delete().eq('id', id);
    fetchBanners();
  };

  if (loading) return <div className="p-10"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Manage Banners</h2>
        <Button onClick={() => { setShowAdd(!showAdd); setEditingId(null); setFormData({}); }} className="gap-2 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-blue-300 text-blue-900 hover:bg-blue-400" style={{ borderRadius: WOBBLY_MD }}>
          {showAdd ? "Cancel" : <><Plus className="w-4 h-4" /> Add Banner</>}
        </Button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-bold">Title</label><Input value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Laptops & Tabs" /></div>
            <div>
              <label className="text-sm font-bold">Linked Category</label>
              <select 
                value={formData.category || ''} 
                onChange={e => setFormData({...formData, category: e.target.value})} 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Select a category...</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-bold">Badge Text</label><Input value={formData.badge_text || ''} onChange={e => setFormData({...formData, badge_text: e.target.value})} placeholder="Up to 40% OFF" /></div>
            <div>
              <label className="text-sm font-bold flex justify-between">
                Image URL
                {uploadingImage && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
              </label>
              <div className="flex gap-2">
                <Input value={formData.image_url || ''} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="https://..." className="flex-1" />
                <label className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 border-2 border-gray-900 rounded px-3 cursor-pointer transition-colors" title="Upload to ImgBB">
                  <Upload className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'image_url')} disabled={uploadingImage} />
                </label>
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <label className="text-sm font-bold mb-2 block">Banner Color Theme</label>
              <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                {BANNER_PALETTES.map(p => (
                  <button 
                    key={p.name}
                    type="button"
                    onClick={() => setFormData({
                      ...formData, 
                      bg_class: p.bg, 
                      text_class: p.text, 
                      badge_bg_class: p.badge_bg, 
                      badge_text_class: p.badge_text, 
                      badge_border_class: p.badge_border 
                    })}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${formData.bg_class === p.bg ? 'border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-110' : 'border-gray-300 hover:border-gray-500'}`}
                    style={{ backgroundColor: p.hex }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>
            
            <details className="sm:col-span-2 group">
              <summary className="text-sm font-bold text-gray-500 cursor-pointer hover:text-gray-900 select-none">Advanced CSS Classes (Tailwind)</summary>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                <div><label className="text-xs font-bold text-gray-600">Bg Class</label><Input className="h-8 text-xs" value={formData.bg_class || ''} onChange={e => setFormData({...formData, bg_class: e.target.value})} placeholder="bg-blue-50" /></div>
                <div><label className="text-xs font-bold text-gray-600">Text Class</label><Input className="h-8 text-xs" value={formData.text_class || ''} onChange={e => setFormData({...formData, text_class: e.target.value})} placeholder="text-blue-900" /></div>
                <div><label className="text-xs font-bold text-gray-600">Badge Bg Class</label><Input className="h-8 text-xs" value={formData.badge_bg_class || ''} onChange={e => setFormData({...formData, badge_bg_class: e.target.value})} placeholder="bg-blue-200" /></div>
                <div><label className="text-xs font-bold text-gray-600">Badge Text Class</label><Input className="h-8 text-xs" value={formData.badge_text_class || ''} onChange={e => setFormData({...formData, badge_text_class: e.target.value})} placeholder="text-blue-700" /></div>
                <div><label className="text-xs font-bold text-gray-600">Badge Border Class</label><Input className="h-8 text-xs" value={formData.badge_border_class || ''} onChange={e => setFormData({...formData, badge_border_class: e.target.value})} placeholder="border-blue-900" /></div>
              </div>
            </details>
          </div>
          <Button onClick={handleSave} disabled={uploadingImage} className="mt-6 w-full gap-2 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-yellow-300 text-yellow-900 hover:bg-yellow-400 font-black">Save Banner</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banners.map(b => (
          <div key={b.id} className={`${b.bg_class || 'bg-gray-100'} border-2 border-gray-900 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative`} style={{ borderRadius: WOBBLY_MD }}>
            <div className="absolute top-2 right-2 flex gap-1 z-20">
              <button onClick={() => { setEditingId(b.id); setFormData(b); setShowAdd(true); }} className="p-1.5 bg-white border border-gray-900 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(b.id)} className="p-1.5 bg-red-100 border border-gray-900 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
            
            <div className={`font-black text-xl ${b.text_class} leading-tight z-10 w-2/3`}>{b.title}</div>
            <div className={`inline-block font-black text-xs mt-2 ${b.badge_bg_class} ${b.badge_text_class} px-2.5 py-1 border-2 ${b.badge_border_class} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`} style={{ borderRadius: WOBBLY_MD }}>{b.badge_text}</div>
            <div className="mt-2 text-xs font-bold bg-black/10 inline-block px-2 py-0.5 rounded">Category: {b.category}</div>
            
            {b.image_url && <img src={b.image_url} alt="" className="absolute -right-2 -bottom-2 w-24 h-24 object-cover mix-blend-multiply" />}
          </div>
        ))}
      </div>
    </div>
  );
}
