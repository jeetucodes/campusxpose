import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/Footer";
import { 
  Search, Clock, ChevronDown, ArrowLeft,
  Heart, Star, Zap, Coffee,
  Laptop, Headphones, BookOpen, PenTool,
  Gamepad2, Watch, Dumbbell, Pizza, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [{ title: "CX Store | CampusXpose" }],
  }),
  component: BlinkitShop,
});

const WOBBLY_MD = "16px 6px 18px 6px / 6px 18px 6px 16px";
const WOBBLY_LG = "40px 10px 40px 15px / 15px 40px 10px 40px";

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
  features?: string[];
  is_hot_deal?: boolean;
  buy_url?: string;
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

function BlinkitShop() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Database State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [prodRes, catRes, banRes] = await Promise.all([
        supabase.from('store_products').select('*').order('created_at', { ascending: false }),
        supabase.from('store_categories').select('*').order('created_at', { ascending: true }),
        supabase.from('store_banners').select('*').order('created_at', { ascending: false }),
      ]);
      if (prodRes.data) setProducts(prodRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (banRes.data) setBanners(banRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const filteredProducts = products.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.platform.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const renderProductCard = (item: Product, isGrid: boolean = false) => (
    <div 
      key={item.id} 
      onClick={() => setSelectedProduct(item)}
      className={`${isGrid ? 'w-full' : 'snap-center shrink-0 w-[170px] sm:w-[200px]'} bg-white border-2 border-gray-900 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all p-3 flex flex-col cursor-pointer relative`} style={{ borderRadius: WOBBLY_MD }}
    >
      <div className="aspect-square bg-gray-50 mb-3 flex items-center justify-center relative border-2 border-gray-900 overflow-hidden" style={{ borderRadius: WOBBLY_MD }}>
        {item.icon_url ? <img src={item.icon_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="text-gray-300">No Image</div>}
        <div className={`absolute -top-0.5 -right-0.5 text-white text-[9px] font-black px-2 py-1 uppercase border-l-2 border-b-2 border-gray-900`} style={{ borderRadius: "0 14px 0 10px", backgroundColor: item.platform === 'Amazon' ? '#FF9900' : item.platform === 'Flipkart' ? '#2874F0' : '#16a34a' }}>
          {item.platform}
        </div>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 w-fit px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-600 mb-1">
        <Clock className="w-3 h-3" /> {item.time}
      </div>

      <div className="font-bold text-sm text-gray-800 line-clamp-2 leading-tight min-h-[40px]">
        {item.name}
      </div>
      
      <div className="text-xs font-semibold text-gray-500 mt-1 mb-3">
        {item.qty}
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t-2 border-dashed border-gray-200">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 line-through font-bold">{item.original_price}</span>
          <span className="font-black text-lg text-gray-900 leading-none">{item.price}</span>
        </div>
        
        <button 
        onClick={(e) => { e.stopPropagation(); }}
        className="border-2 border-gray-900 text-green-700 bg-green-50 hover:bg-green-600 hover:text-white font-black text-xs px-4 py-1.5 uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]" style={{ borderRadius: WOBBLY_MD }}>
          BUY
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <SiteShell hideFooter={true} hideNavbar={true}>
        <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
          <Loader2 className="w-10 h-10 animate-spin text-green-600" />
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell hideFooter={true} hideNavbar={true}>
      {selectedProduct ? (
        <div className="bg-[#f8f9fa] min-h-screen pb-20 relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
          {/* Header for details page */}
          <div className="bg-white/80 backdrop-blur-md border-b-2 border-gray-900 px-4 py-3 sticky top-0 z-40">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  className="flex shrink-0 items-center justify-center w-11 h-11 bg-white border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all text-gray-900" style={{ borderRadius: WOBBLY_MD }}>
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="font-black text-2xl sm:text-3xl text-gray-900 leading-none tracking-tight">
                  Product Details
                </div>
              </div>
            </div>
          </div>

          <main className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-16">
            {/* Top: Product Details */}
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 lg:gap-20 items-start">
              {/* Image side */}
              <div className="w-full md:w-1/2 flex justify-center">
                <div className="w-full max-w-lg aspect-square bg-white flex items-center justify-center border-4 border-gray-900 relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 sm:p-8" style={{ borderRadius: WOBBLY_LG }}>
                  {selectedProduct.icon_url ? (
                    <img src={selectedProduct.icon_url} className="w-full h-full object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="text-gray-300 font-bold text-2xl">No Image</div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                    {selectedProduct.is_hot_deal && (
                      <span className="bg-red-500 text-white font-black px-4 py-1.5 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform -rotate-3 text-sm" style={{ borderRadius: WOBBLY_MD }}>
                        🔥 HOT DEAL
                      </span>
                    )}
                    <span className="bg-purple-100 text-purple-900 font-bold px-3 py-1 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs uppercase" style={{ borderRadius: WOBBLY_MD }}>
                      {selectedProduct.category}
                    </span>
                  </div>

                  <div className={`absolute bottom-4 right-4 text-white font-black px-4 py-2 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase text-sm sm:text-base transform rotate-2`} style={{ borderRadius: WOBBLY_MD, backgroundColor: selectedProduct.platform === 'Amazon' ? '#FF9900' : selectedProduct.platform === 'Flipkart' ? '#2874F0' : '#16a34a' }}>
                    {selectedProduct.platform}
                  </div>
                </div>
              </div>
              
              {/* Info side */}
              <div className="w-full md:w-1/2 flex flex-col mt-4 md:mt-0">
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-yellow-300 px-4 py-1.5 font-black text-yellow-900 border-2 border-gray-900 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
                    <Clock className="w-4 h-4" /> {selectedProduct.time}
                  </span>
                </div>
                
                <h3 className="font-black text-4xl sm:text-5xl lg:text-6xl text-gray-900 mb-4 leading-tight tracking-tight drop-shadow-sm">{selectedProduct.name}</h3>
                
                <p className="text-gray-500 font-bold mb-8 text-xl sm:text-2xl flex items-center gap-2">
                  <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md text-lg">{selectedProduct.qty}</span>
                </p>
                
                <div className="bg-white border-4 border-gray-900 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-10" style={{ borderRadius: WOBBLY_MD }}>
                  <div className="flex flex-wrap items-end gap-4 mb-6">
                    <span className="font-black text-5xl sm:text-7xl text-gray-900 leading-none">{selectedProduct.price}</span>
                    {selectedProduct.original_price && selectedProduct.original_price !== selectedProduct.price && (
                      <span className="text-gray-400 line-through font-bold text-2xl sm:text-3xl mb-1">{selectedProduct.original_price}</span>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => {
                      if (selectedProduct.buy_url) {
                        window.open(selectedProduct.buy_url, '_blank', 'noopener,noreferrer');
                      } else {
                        toast.info("Buy link not available for this product yet.");
                      }
                    }}
                    className="w-full flex items-center justify-center gap-3 border-4 border-gray-900 text-white bg-green-500 hover:bg-green-600 active:bg-green-700 font-black text-2xl py-5 sm:py-6 uppercase transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[4px] hover:translate-x-[4px]" style={{ borderRadius: WOBBLY_LG }}>
                    <Zap className="w-6 h-6 fill-white" />
                    Buy on {selectedProduct.platform}
                  </button>
                </div>

                {/* Details Section (Collapsible) */}
                {(selectedProduct.description || (selectedProduct.features && selectedProduct.features.length > 0)) && (
                  <details className="w-full bg-[#fffbeb] border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden group cursor-pointer" style={{ borderRadius: WOBBLY_LG }}>
                    <summary className="bg-gray-900 text-yellow-300 font-black text-xl sm:text-2xl px-6 py-4 uppercase tracking-widest flex justify-between items-center list-none select-none">
                      <span>Product Details</span>
                      <ChevronDown className="w-6 h-6 transform group-open:rotate-180 transition-transform duration-300" />
                    </summary>
                    <div className="p-6 sm:p-8 border-t-4 border-gray-900">
                      {selectedProduct.description && (
                        <p className="text-gray-800 font-semibold mb-6 text-base sm:text-lg leading-relaxed">
                          {selectedProduct.description}
                        </p>
                      )}
                      
                      {selectedProduct.features && selectedProduct.features.length > 0 && (
                        <ul className="space-y-3">
                          {selectedProduct.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 text-base sm:text-lg font-bold text-gray-700">
                              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>

            {/* Bottom: Recommendations */}
            <div className="mt-16 pt-12 border-t-4 border-dashed border-gray-300">
              <h4 className="font-black text-3xl text-gray-900 mb-8 text-left">You might also like</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                {products.filter(p => p.id !== selectedProduct.id).sort(() => 0.5 - Math.random()).slice(0, 4).map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => { window.scrollTo(0, 0); setSelectedProduct(item); }}
                    className="sketch-card bg-white border-2 border-gray-900 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 transition-all p-4 flex flex-col cursor-pointer text-left" style={{ borderRadius: WOBBLY_LG }}
                  >
                    <div className="aspect-square bg-gray-50 mb-4 flex items-center justify-center relative border-2 border-gray-900 overflow-hidden" style={{ borderRadius: WOBBLY_MD }}>
                      {item.icon_url ? <img src={item.icon_url} className="w-full h-full object-cover" /> : <div className="text-gray-300">No Image</div>}
                    </div>
                    <div className="font-bold text-sm text-gray-800 line-clamp-2 leading-tight min-h-[40px] mb-2">
                      {item.name}
                    </div>
                    <div className="font-black text-xl text-gray-900 leading-none mt-auto">{item.price}</div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      ) : (searchQuery || selectedCategory) ? (
        <div className="bg-[#f8f9fa] min-h-screen pb-10">
          <div className="bg-white border-b-4 border-gray-900 px-4 py-4 sticky top-0 z-40">
            <div className="max-w-6xl mx-auto flex items-center gap-4">
              <button onClick={() => { setSelectedCategory(null); setSearchQuery(""); }} className="flex shrink-0 items-center justify-center w-11 h-11 bg-white border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all text-gray-900" style={{ borderRadius: WOBBLY_MD }}>
                <ArrowLeft className="w-6 h-6 font-black" />
              </button>
              <div className="font-black text-2xl sm:text-3xl text-gray-900 leading-none tracking-tight">
                {selectedCategory ? selectedCategory : "Search Results"}
              </div>
            </div>
            
            <div className="max-w-6xl mx-auto mt-5 mb-2">
              <div className="flex items-center bg-white px-4 py-3 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-within:-translate-y-1 transition-all group cursor-text" style={{ borderRadius: WOBBLY_MD }}>
                <div className="bg-gray-100 p-2 border-2 border-gray-900 rounded-full mr-3 group-focus-within:bg-green-100 transition-colors">
                  <Search className="w-5 h-5 text-gray-900 shrink-0" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search in category..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-base sm:text-lg font-bold placeholder:text-gray-400 text-gray-900"
                />
              </div>
            </div>
          </div>

          <main className="max-w-6xl mx-auto px-4 py-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((item) => renderProductCard(item, true))
              ) : (
                <div className="col-span-full py-12 text-center text-gray-500 font-bold border-2 border-dashed border-gray-300 rounded-2xl">
                  No items found for "{searchQuery}"
                </div>
              )}
            </div>
          </main>
        </div>
      ) : (
        <div className="bg-[#f8f9fa] min-h-screen pb-10">
        
        {/* Top Delivery Info Bar */}
        <div className="bg-white border-b-4 border-gray-900 px-4 py-4 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex shrink-0 items-center justify-center w-11 h-11 bg-white border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all text-gray-900" style={{ borderRadius: WOBBLY_MD }}>
                <ArrowLeft className="w-6 h-6 font-black" />
              </Link>
              <div className="font-black text-2xl sm:text-3xl text-gray-900 leading-none tracking-tight flex items-center gap-2">
                CX <span className="bg-yellow-300 px-2 py-0.5 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -rotate-2 inline-block ml-1" style={{ borderRadius: WOBBLY_MD }}>Store</span>
              </div>
            </div>
            <button className="hidden sm:flex items-center gap-2 bg-pink-100 text-pink-700 hover:bg-pink-200 px-4 py-2.5 font-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none uppercase text-sm" style={{ borderRadius: WOBBLY_MD }}>
              <Heart className="w-5 h-5 fill-pink-600" />
              <span>Wishlist</span>
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="max-w-6xl mx-auto mt-5 mb-2">
            <div className="flex items-center bg-white px-4 py-3 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-within:-translate-y-1 transition-all group cursor-text" style={{ borderRadius: WOBBLY_MD }}>
              <div className="bg-gray-100 p-2 border-2 border-gray-900 rounded-full mr-3 group-focus-within:bg-green-100 transition-colors">
                <Search className="w-5 h-5 text-gray-900 shrink-0" />
              </div>
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-base sm:text-lg font-bold placeholder:text-gray-400 text-gray-900"
              />
            </div>
          </div>
        </div>

        <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
          
          {/* Promotional Banners */}
          {banners.length > 0 && (
            <>
              {/* Mobile Auto-Slider */}
              <div className="block sm:hidden overflow-hidden w-full relative mb-6" style={{ borderRadius: WOBBLY_MD }}>
                <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}>
                  {banners.map((banner) => (
                    <div key={banner.id} className="w-full shrink-0">
                      <div onClick={() => setSelectedCategory(banner.category)} className={`${banner.bg_class} border-2 border-gray-900 p-4 flex flex-col justify-center items-start h-32 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden cursor-pointer`} style={{ borderRadius: WOBBLY_MD }}>
                        <div className={`font-black text-xl ${banner.text_class} leading-tight z-10 w-2/3`}>{banner.title}</div>
                        <div className={`${banner.badge_text_class} font-black text-xs mt-2 ${banner.badge_bg_class} px-2.5 py-1 border-2 ${banner.badge_border_class} z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`} style={{ borderRadius: WOBBLY_MD }}>{banner.badge_text}</div>
                        {banner.image_url && <img src={banner.image_url} alt={banner.title} className="absolute -right-4 -bottom-4 w-28 h-28 object-cover mix-blend-multiply" />}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Dots */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20">
                  {banners.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full border border-gray-900 ${i === currentBannerIndex ? 'bg-gray-900' : 'bg-white/50'}`} />
                  ))}
                </div>
              </div>

              {/* Desktop Grid */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {banners.map((banner) => (
                  <div key={banner.id} onClick={() => setSelectedCategory(banner.category)} className={`${banner.bg_class} border-2 border-gray-900 p-5 flex flex-col justify-center items-start h-40 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden group`} style={{ borderRadius: WOBBLY_MD }}>
                    <div className={`font-black text-2xl ${banner.text_class} leading-tight z-10 w-2/3`}>{banner.title}</div>
                    <div className={`${banner.badge_text_class} font-black text-sm mt-2 ${banner.badge_bg_class} px-2.5 py-1 border-2 ${banner.badge_border_class} z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`} style={{ borderRadius: WOBBLY_MD }}>{banner.badge_text}</div>
                    {banner.image_url && <img src={banner.image_url} alt={banner.title} className="absolute -right-4 -bottom-4 w-32 h-32 object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-300" />}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Categories Circle List */}
          {categories.length > 0 && (
            <section className="pt-2">
              <h2 className="font-black text-2xl text-gray-900 tracking-tight mb-5">Shop by Category</h2>
              <div className="flex gap-5 sm:gap-8 overflow-x-auto pb-4 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <div 
                      key={cat.id} 
                      onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                      className={`flex flex-col items-center gap-3 cursor-pointer group shrink-0 transition-transform ${isSelected ? 'scale-105' : ''}`}
                    >
                      <div className={`w-24 h-24 sm:w-32 sm:h-32 ${cat.color_class} p-2 flex items-center justify-center group-hover:-translate-y-1 transition-all border-2 ${isSelected ? 'border-green-600 shadow-[6px_6px_0px_0px_rgba(22,163,74,1)]' : 'border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'} overflow-hidden`} style={{ borderRadius: WOBBLY_MD }}>
                        {cat.icon_url ? <img src={cat.icon_url} alt={cat.name} className="w-full h-full object-cover rounded-xl" /> : <div className="text-xs">No img</div>}
                      </div>
                      <span className={`text-sm font-black ${isSelected ? 'text-green-700' : 'text-gray-800'}`}>{cat.name}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Product List */}
          {products.length > 0 && (
            <section>
              <div className="space-y-10">
                {/* Dynamically create rows for distinct categories instead of hardcoding Tech/Snacks */}
                {Array.from(new Set(products.map(p => p.category))).map(catName => {
                  const categoryProducts = products.filter(p => p.category === catName);
                  if (categoryProducts.length === 0) return null;
                  
                  return (
                    <div key={catName}>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-black text-2xl text-gray-900 tracking-tight">{catName}</h2>
                        <button onClick={() => setSelectedCategory(catName)} className="text-green-600 font-bold text-sm hover:underline">See all</button>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x px-1 -mx-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {categoryProducts.map(p => renderProductCard(p, false))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}



          {/* Hot Deals Showcase */}
          {products.filter(p => p.is_hot_deal).length > 0 && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-2xl text-gray-900 tracking-tight">Hot Deals 🔥</h2>
              </div>
              
              <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 hide-scrollbar snap-x snap-mandatory px-2 -mx-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {products.filter(p => p.is_hot_deal).map((item) => (
                  <div 
                    key={`hot-${item.id}`} 
                    onClick={() => setSelectedProduct(item)}
                    className="snap-center shrink-0 w-[260px] sm:w-[300px] bg-[#fff5f5] border-2 border-gray-900 p-4 flex flex-col cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all" style={{ borderRadius: WOBBLY_LG }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      {item.original_price ? (
                        <div className="bg-red-500 text-white font-black text-[10px] px-2 py-1 uppercase border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
                          Deal of the day
                        </div>
                      ) : (
                        <div className="bg-purple-500 text-white font-black text-[10px] px-2 py-1 uppercase border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
                          Trending
                        </div>
                      )}
                      <div className="bg-white p-1 rounded-full border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      </div>
                    </div>
                    
                    <div className="flex justify-center items-center h-36 mb-4 bg-white border-2 border-gray-900 relative shadow-inner overflow-hidden" style={{ borderRadius: WOBBLY_MD }}>
                      {item.icon_url ? <img src={item.icon_url} className="w-full h-full object-cover" /> : <div className="text-gray-300">No Img</div>}
                    </div>
                    
                    <h4 className="font-black text-lg sm:text-xl text-gray-900 line-clamp-1">{item.name}</h4>
                    <p className="text-xs font-bold text-gray-500 mb-4">{item.qty}</p>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        {item.original_price && <span className="text-xs text-gray-400 line-through font-bold">{item.original_price}</span>}
                        <span className="font-black text-2xl text-red-600 leading-none">{item.price}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); }}
                        className="bg-gray-900 text-white font-black text-xs px-5 py-2.5 border-2 border-gray-900 hover:bg-gray-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none uppercase" style={{ borderRadius: WOBBLY_MD }}
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </main>
      </div>
      )}
    </SiteShell>
  );
}
