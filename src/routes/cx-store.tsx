import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/Footer";
import { 
  Search, ArrowLeft, Heart, Star, ChevronDown, ChevronLeft, ChevronRight, X,
  Menu, Bell, ShoppingCart, SlidersHorizontal, ArrowRight,
  Zap, Loader2, FileText, Shield, Truck, ShieldCheck, Home
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cx-store")({
  head: () => ({
    meta: [{ title: "CX Store | CampusXpose" }],
  }),
  component: CXStore,
});

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
  images?: string[];
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
  button_text?: string;
  button_link?: string;
  target_product_id?: string;
  title_size?: string;
};

// Pastel colors for categories mapping
const categoryColors = [
  "bg-orange-50",
  "bg-blue-50",
  "bg-amber-50",
  "bg-pink-50",
  "bg-sky-50",
  "bg-purple-50",
  "bg-green-50",
];

function CXStore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc">("default");
  const [onlyHotDeals, setOnlyHotDeals] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist(prev => prev.includes(id) ? prev.filter(wId => wId !== id) : [...prev, id]);
  };

  // Database State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setHasError(null);
      try {
        const [prodRes, catRes, banRes] = await Promise.all([
          // @ts-ignore
          supabase.from('store_products').select('*').order('created_at', { ascending: false }),
          // @ts-ignore
          supabase.from('store_categories').select('*').order('created_at', { ascending: true }),
          // @ts-ignore
          supabase.from('store_banners').select('*').order('created_at', { ascending: false }),
        ]);
        if (prodRes.error) throw new Error("Products: " + prodRes.error.message);
        if (catRes.error) throw new Error("Categories: " + catRes.error.message);
        if (banRes.error) throw new Error("Banners: " + banRes.error.message);
        if (prodRes.data) {
          const sanitized = prodRes.data.map((p: any) => {
            if (typeof p.images === 'string') {
              try { p.images = JSON.parse(p.images); }
              catch {
                if (p.images.startsWith('{') && p.images.endsWith('}')) {
                  p.images = p.images.slice(1, -1).split(',').map((s: string) => s.replace(/(^"|"$)/g, '').trim()).filter(Boolean);
                } else {
                  p.images = [p.images];
                }
              }
            }
            return p;
          });
          setProducts(sanitized);
        }
        if (catRes.data) setCategories(catRes.data as any);
        if (banRes.data) setBanners(banRes.data as any);
      } catch (e: any) {
        setHasError(e?.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  let filteredProducts = products.filter((item) => {
    if (showWishlist) {
      return wishlist.includes(item.id);
    }
    const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const searchableText = [
      item.name,
      item.platform,
      item.category,
      item.description,
      ...(item.features || [])
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesSearch = queryWords.length === 0 || queryWords.every(word => searchableText.includes(word));
    
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    
    const priceMatch = item.price.match(/(\d+)/g);
    const itemPrice = priceMatch ? parseInt(priceMatch.join("")) : 0;
    const matchesPrice = itemPrice <= maxPrice;
    
    const matchesHotDeal = onlyHotDeals ? item.is_hot_deal === true : true;
    
    return matchesSearch && matchesCategory && matchesPrice && matchesHotDeal;
  });

  if (sortBy === "price_asc") {
    filteredProducts = [...filteredProducts].sort((a, b) => {
      const aPrice = a.price.match(/(\d+)/g) ? parseInt(a.price.match(/(\d+)/g)!.join("")) : 0;
      const bPrice = b.price.match(/(\d+)/g) ? parseInt(b.price.match(/(\d+)/g)!.join("")) : 0;
      return aPrice - bPrice;
    });
  } else if (sortBy === "price_desc") {
    filteredProducts = [...filteredProducts].sort((a, b) => {
      const aPrice = a.price.match(/(\d+)/g) ? parseInt(a.price.match(/(\d+)/g)!.join("")) : 0;
      const bPrice = b.price.match(/(\d+)/g) ? parseInt(b.price.match(/(\d+)/g)!.join("")) : 0;
      return bPrice - aPrice;
    });
  }

  const renderProductCard = (item: Product, isGrid: boolean = false) => {
    // Attempt to parse discount
    let discountStr = "";
    if (item.original_price && item.price) {
      const origMatch = item.original_price.match(/(\d+)/g);
      const curMatch = item.price.match(/(\d+)/g);
      if (origMatch && curMatch) {
        const orig = parseInt(origMatch.join(""));
        const cur = parseInt(curMatch.join(""));
        if (orig > cur) {
          const pct = Math.round(((orig - cur) / orig) * 100);
          discountStr = `${pct}% off`;
        }
      }
    }

    return (
      <div 
        key={item.id} 
        onClick={() => { setSelectedProduct(item); setCurrentImageIndex(0); }}
        className={`${isGrid ? 'w-full' : 'w-[200px] sm:w-[220px] snap-start shrink-0'} bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-3 pb-4 flex flex-col cursor-pointer relative group`}
      >
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          {item.is_hot_deal ? (
            <span className="bg-[#0e2a47] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">
              Amazon's Choice
            </span>
          ) : item.platform === 'Amazon' ? (
            <span className="bg-[#0e2a47] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">
              Amazon's Choice
            </span>
          ) : (
            <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">
              Best Seller
            </span>
          )}
        </div>
        
        <button 
          onClick={(e) => toggleWishlist(item.id, e)}
          className={`absolute top-3 right-3 z-10 transition-colors ${wishlist.includes(item.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
        >
          <Heart className={`w-5 h-5 ${wishlist.includes(item.id) ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        <div className="aspect-square w-full mb-3 flex items-center justify-center p-1 mt-2">
          {item.icon_url ? (
            <img src={item.icon_url} alt={item.name} className="w-full h-full object-contain scale-[1.15] group-hover:scale-[1.25] transition-transform duration-500 mix-blend-multiply" />
          ) : (
            <div className="text-gray-300">No Image</div>
          )}
        </div>

        <div className="font-semibold text-sm text-gray-900 truncate leading-tight mb-1">
          {item.name}
        </div>
        

        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col">
            <span className="font-bold text-[17px] text-gray-900 leading-none">{item.price}</span>
            <div className="flex items-center gap-1.5 mt-1">
              {item.original_price && item.original_price !== item.price && (
                <span className="text-[11px] text-gray-400 line-through font-medium">{item.original_price}</span>
              )}
              {discountStr && (
                <span className="text-[11px] text-green-600 font-semibold">{discountStr}</span>
              )}
            </div>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); }}
            className="w-8 h-8 rounded-xl border border-green-100 flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <SiteShell hideFooter={true} hideNavbar={true}>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
        </div>
      </SiteShell>
    );
  }

  if (hasError) {
    return (
      <SiteShell hideFooter={true} hideNavbar={true}>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
          <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">This page didn't load</h2>
          <p className="text-gray-500 mb-4 max-w-sm mx-auto">Something went wrong on our end. You can try refreshing.</p>
          <div className="bg-red-50 text-red-800 text-xs p-3 rounded-xl mb-8 max-w-sm w-full font-mono break-words border border-red-100">
            {hasError}
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={() => window.location.reload()} className="flex-1 bg-[#0e2a47] text-white font-bold py-3 rounded-xl hover:bg-[#1a426e] transition-colors">Try again</button>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell hideFooter={true} hideNavbar={true}>
      {selectedProduct ? (
        <div className="bg-[#f8f9fa] min-h-screen pb-10">
          {/* Header */}
          <header className="px-4 py-4 sticky top-0 z-40 bg-white">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => { setSelectedProduct(null); setDetailsExpanded(false); setCurrentImageIndex(0); }} className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center text-gray-700 hover:bg-gray-50">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="font-black text-2xl tracking-tight text-[#0e2a47] flex items-center gap-1.5">
                  CX <span className="bg-[#ffd814] px-2 py-0.5 rounded-lg text-black">Store</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setShowWishlist(true); setSelectedProduct(null); }} className="relative p-2 text-gray-700 hover:bg-gray-50 rounded-full">
                  <Heart className="w-6 h-6" />
                  {wishlist.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white">{wishlist.length}</span>
                  )}
                </button>
              </div>
            </div>
          </header>

          <main className="max-w-6xl mx-auto bg-white min-h-screen sm:border-x sm:border-gray-100 sm:shadow-sm pb-10">


            <div className="flex flex-col md:flex-row gap-8 lg:gap-12 px-0 md:px-5">
              {/* Product Image Section */}
              <div className="w-full md:w-1/2 px-4 md:px-0 mb-5 md:mb-0">
                <div className="relative bg-[#f9fafb] rounded-[32px] p-8 pb-10 flex items-center justify-center aspect-square shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] md:sticky md:top-24">
                {/* Category pill */}
                <span className="absolute top-4 left-4 bg-purple-100 text-purple-700 font-extrabold px-3 py-1.5 text-[9px] rounded-full uppercase tracking-widest shadow-sm">
                  {selectedProduct.category}
                </span>
                
                {/* Heart Button */}
                <button 
                  onClick={(e) => toggleWishlist(selectedProduct.id, e as any)}
                  className="absolute top-4 right-4 z-10 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-gray-100 hover:scale-105 transition-transform"
                >
                  <Heart className={`w-4 h-4 ${wishlist.includes(selectedProduct.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                </button>

                {/* Amazon Badge */}
                <div className="absolute bottom-5 right-5 bg-gradient-to-r from-orange-500 to-orange-400 text-white flex flex-col items-center px-3 py-1 rounded-lg shadow-md transform rotate-2 z-20">
                   <span className="text-[7px] leading-none mb-0.5 opacity-90 font-medium tracking-wide uppercase">Available on</span>
                   <span className="text-xs font-bold leading-none tracking-tight">amazon</span>
                </div>

                {(() => {
                  const gallery = selectedProduct.images?.length ? selectedProduct.images : (selectedProduct.icon_url ? [selectedProduct.icon_url] : []);
                  
                  const handleTouchStart = (e: React.TouchEvent) => {
                    setTouchEnd(null);
                    setTouchStart(e.targetTouches[0].clientX);
                  };

                  const handleTouchMove = (e: React.TouchEvent) => {
                    setTouchEnd(e.targetTouches[0].clientX);
                  };

                  const handleTouchEnd = () => {
                    if (!touchStart || !touchEnd) return;
                    const distance = touchStart - touchEnd;
                    if (distance > 50) {
                      setCurrentImageIndex(prev => prev === gallery.length - 1 ? 0 : prev + 1);
                    }
                    if (distance < -50) {
                      setCurrentImageIndex(prev => prev === 0 ? gallery.length - 1 : prev - 1);
                    }
                  };

                  return (
                    <div 
                      className="w-full h-full relative"
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      {gallery.length > 0 ? (
                        <AnimatePresence mode="wait">
                          <motion.img 
                            key={currentImageIndex}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            src={gallery[currentImageIndex]} 
                            className="w-full h-full object-contain mix-blend-multiply drop-shadow-xl scale-[1.15] hover:scale-[1.25] transition-transform duration-500 absolute inset-0 m-auto" 
                          />
                        </AnimatePresence>
                      ) : (
                        <div className="text-gray-400 font-medium absolute inset-0 m-auto flex items-center justify-center">No Image</div>
                      )}
                      
                      {gallery.length > 1 && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === 0 ? gallery.length - 1 : prev - 1); }}
                            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full items-center justify-center shadow hover:bg-white z-20 transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5 text-gray-700" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === gallery.length - 1 ? 0 : prev + 1); }}
                            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full items-center justify-center shadow hover:bg-white z-20 transition-colors"
                          >
                            <ChevronRight className="w-5 h-5 text-gray-700" />
                          </button>
                          
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
                            {gallery.map((_, i) => (
                              <button 
                                key={i} 
                                onClick={() => setCurrentImageIndex(i)}
                                className={`transition-all duration-300 rounded-full ${i === currentImageIndex ? 'w-4 h-1.5 bg-gray-800' : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
              </div>

              {/* Info Section */}
              <div className="w-full md:w-1/2 px-5 md:px-0 flex flex-col pt-2">
                <h1 className="font-bold text-xl sm:text-2xl lg:text-3xl text-gray-900 leading-snug mb-3 pr-2">
                {selectedProduct.name}
              </h1>
              <div className="flex items-center gap-2.5 mb-6 mt-4">
                <span className="font-extrabold text-[26px] text-gray-900 leading-none">{selectedProduct.price}</span>
                {selectedProduct.original_price && (
                  <span className="text-gray-400 line-through font-medium text-sm leading-none">{selectedProduct.original_price}</span>
                )}
                {selectedProduct.original_price && selectedProduct.price && (
                  <span className="bg-[#e6f6eb] text-[#00a859] font-bold px-2.5 py-1 rounded-md text-[10px] ml-1">
                    {(() => {
                      const origMatch = selectedProduct.original_price.match(/(\d+)/g);
                      const curMatch = selectedProduct.price.match(/(\d+)/g);
                      if (origMatch && curMatch) {
                        const orig = parseInt(origMatch.join(""));
                        const cur = parseInt(curMatch.join(""));
                        if (orig > cur) return `${Math.round(((orig - cur) / orig) * 100)}% OFF`;
                      }
                      return 'HOT DEAL';
                    })()}
                  </span>
                )}
              </div>



              {/* Sticky-like Buy Section */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_4px_25px_rgba(0,0,0,0.06)] mb-8 flex items-center justify-between">
                <div className="flex flex-col justify-center">
                   <div className="flex items-center gap-2 mb-0.5">
                     <span className="font-extrabold text-xl text-gray-900 leading-none">{selectedProduct.price}</span>
                     {selectedProduct.original_price && <span className="text-gray-400 line-through font-medium text-[11px]">{selectedProduct.original_price}</span>}
                   </div>
                   <span className="text-[10px] text-[#00a859] font-bold">
                     You save some money
                   </span>
                </div>
                <button 
                  onClick={() => selectedProduct.buy_url && window.open(selectedProduct.buy_url, '_blank')}
                  className="bg-[#00a859] hover:bg-[#00924e] text-white font-extrabold text-[11px] px-5 py-3.5 rounded-xl flex items-center gap-2 shadow-[0_4px_12px_rgba(0,168,89,0.3)] hover:-translate-y-0.5 transition-all"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  BUY ON AMAZON
                </button>
              </div>

              {/* Product Details Accordion */}
              <div className="mb-10">
                <div 
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                  className={`border border-gray-200 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors group ${detailsExpanded ? 'rounded-t-xl border-b-0' : 'rounded-xl'}`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-500 group-hover:text-gray-900 transition-colors" />
                    <span className="font-bold text-[13px] text-gray-900 tracking-wider">PRODUCT DETAILS</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-900 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`} />
                </div>
                
                {detailsExpanded && (
                  <div className="border border-t-0 border-gray-200 rounded-b-xl p-5 bg-white text-sm text-gray-700 leading-relaxed">
                    {selectedProduct.description ? (
                      <p className="mb-4 whitespace-pre-wrap">{selectedProduct.description}</p>
                    ) : (
                      <p className="mb-4 italic text-gray-400">No description provided.</p>
                    )}
                    
                    {selectedProduct.features && selectedProduct.features.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1.5">
                        {selectedProduct.features.map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              </div>
            </div>

            {/* You might also like */}
            <div className="mt-10 px-5 mb-10">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-extrabold text-lg text-gray-900">You might also like</h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x -mx-5 px-5 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {products.filter(p => p.id !== selectedProduct.id).sort(() => 0.5 - Math.random()).slice(0, 4).map(p => renderProductCard(p, false))}
              </div>
            </div>
          </main>
        </div>
      ) : (searchQuery || selectedCategory || showWishlist) ? (
        <div className="bg-[#f8f9fa] min-h-screen pb-10">
          <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-40">
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <button onClick={() => { setSelectedCategory(null); setSearchQuery(""); setShowWishlist(false); }} className="flex items-center gap-2 text-gray-900 font-medium">
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <div className="font-bold text-lg text-gray-900">
                  {showWishlist ? "Your Wishlist" : selectedCategory ? selectedCategory : "Search Results"}
                </div>
                <div className="w-16"></div> {/* spacer */}
              </div>
              
              {/* Search Bar */}
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-100 transition-shadow">
                  <Search className="w-5 h-5 text-gray-400 shrink-0 mr-2" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Search for products, brands and more..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder:text-gray-400 text-gray-900"
                  />
                </div>
                <button className="w-11 h-11 shrink-0 rounded-full bg-[#0e2a47] text-white flex items-center justify-center">
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <main className="max-w-6xl mx-auto px-4 py-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((item) => renderProductCard(item, true))
              ) : (
                <div className="col-span-full py-20 text-center text-gray-500 font-medium bg-white rounded-2xl border border-gray-100">
                  {showWishlist ? "Your wishlist is empty." : `No items found for "${searchQuery}"`}
                </div>
              )}
            </div>
          </main>
        </div>
      ) : (
        <div className="bg-white min-h-screen pb-20 font-sans">
          {/* Header */}
          <header className="px-4 py-4 sticky top-0 z-40 bg-white">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="font-black text-2xl tracking-tight text-[#0e2a47] flex items-center gap-1.5">
                  CX <span className="bg-[#ffd814] px-2 py-0.5 rounded-lg text-black">Store</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowWishlist(true)} className="relative p-2 text-gray-700 hover:bg-gray-50 rounded-full">
                  <Heart className="w-6 h-6" />
                  {wishlist.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white">{wishlist.length}</span>
                  )}
                </button>

              </div>
            </div>

            {/* Search Bar */}
            <div className="max-w-6xl mx-auto mt-4 flex items-center gap-3">
              <div className="flex-1 flex items-center border border-gray-200 rounded-full px-4 py-3 bg-white focus-within:shadow-md transition-shadow">
                <Search className="w-5 h-5 text-gray-400 shrink-0 mr-3" />
                <input 
                  type="text" 
                  placeholder="Search for products, brands and more..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder:text-gray-400 text-gray-800"
                />
              </div>
              <button className="w-12 h-12 shrink-0 rounded-full bg-[#0e2a47] text-white flex items-center justify-center shadow-md">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-4 py-2 space-y-8">
            
            {/* Promotional Banner (Stylized like the image) */}
            {banners.length > 0 && (() => {
              const activeBanner = banners[currentBannerIndex];
              if (!activeBanner) return null;
              return (
                <div className="relative w-full rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 group bg-[#f8f9fa]">
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={activeBanner.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (activeBanner.button_link) {
                          window.location.href = activeBanner.button_link;
                          return;
                        }
                        if (activeBanner.target_product_id) {
                          const product = products.find(p => p.id === activeBanner.target_product_id);
                          if (product) {
                            setSelectedProduct(product); setCurrentImageIndex(0);
                            return;
                          }
                        }
                        setSelectedCategory(activeBanner.category);
                        setSearchQuery("");
                        setShowWishlist(false);
                      }}
                      className={`w-full relative flex flex-col justify-center min-h-[220px] sm:min-h-[280px] p-6 sm:p-8 md:p-12 cursor-pointer border border-white/50 ${activeBanner.bg_class || 'bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100'}`}
                    >
                      {/* Subtle Glass Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none opacity-50 mix-blend-overlay"></div>
                      
                      <div className="flex justify-between items-center w-full relative z-10">
                        <div className={`w-[55%] flex flex-col items-start relative z-10 py-1 sm:py-2`}>
                          {activeBanner.badge_text && (
                            <span className={`inline-block ${activeBanner.badge_bg_class} ${activeBanner.badge_text_class} px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold mb-3 sm:mb-4 tracking-wide uppercase border ${activeBanner.badge_border_class} shadow-sm bg-opacity-90 backdrop-blur-sm`}>
                              {activeBanner.badge_text}
                            </span>
                          )}
                          <h2 className={`${activeBanner.title_size || 'text-xl sm:text-2xl'} font-black ${activeBanner.text_class || 'text-[#0e2a47]'} mb-1.5 sm:mb-2 leading-tight drop-shadow-sm`}>
                            {activeBanner.title}
                          </h2>
                          <p className={`text-sm sm:text-base font-medium mb-5 sm:mb-6 leading-snug ${activeBanner.text_class ? activeBanner.text_class.replace('text-', 'text-opacity-80 text-') : 'text-gray-600'}`}>
                            {activeBanner.category}
                          </p>
                          
                          <div className={`hover:scale-105 hover:shadow-md text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-full flex items-center gap-2 transition-all duration-300 ${activeBanner.text_class ? activeBanner.text_class.replace('text-', 'bg-') : 'bg-[#0e2a47]'}`}>
                            {activeBanner.button_text || 'Shop Now'}
                            <span className={`bg-white rounded-full p-1 w-5 h-5 flex items-center justify-center ${activeBanner.text_class || 'text-[#0e2a47]'} transition-transform duration-300`}>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                        <div className="w-[45%] flex justify-end items-center">
                          {activeBanner.image_url ? (
                            <img 
                              src={activeBanner.image_url} 
                              alt="Promo" 
                              className={`w-full max-w-[160px] sm:max-w-[240px] md:max-w-[320px] lg:max-w-[360px] object-contain drop-shadow-2xl mix-blend-multiply translate-x-2 sm:translate-x-4`} 
                            />
                          ) : (
                            <div className="w-32 h-32 bg-black/5 rounded-2xl border border-dashed border-black/10" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Pagination Dots */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
                    {banners.map((banner, i) => (
                      <button 
                        key={i} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentBannerIndex(i);
                        }}
                        className={`rounded-full transition-all duration-300 ${i === currentBannerIndex ? `w-6 h-2 ${banner.text_class ? banner.text_class.replace('text-', 'bg-') : 'bg-[#0e2a47]'}` : 'w-2 h-2 bg-black/20 border border-black/10 hover:bg-black/40'}`} 
                      />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Categories */}
            {categories.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-gray-900">Shop by Category</h3>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar snap-x px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {categories.map((cat, idx) => {
                    const isSelected = selectedCategory === cat.name;
                    const bgClass = categoryColors[idx % categoryColors.length];
                    return (
                      <div 
                        key={cat.id} 
                        onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                        className="flex flex-col items-center gap-2 cursor-pointer group shrink-0 snap-start"
                      >
                        <div className={`w-[88px] h-[96px] sm:w-[104px] sm:h-[112px] ${bgClass} rounded-2xl flex items-center justify-center p-3 transition-transform group-hover:scale-105 border border-white/50 ${isSelected ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}>
                          {cat.icon_url ? (
                            <img src={cat.icon_url} alt={cat.name} className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm" />
                          ) : (
                            <div className="text-[10px] text-gray-500">No img</div>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{cat.name}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Dynamic Product Sections by Category */}
            {products.length > 0 && (
              <div className="space-y-10">
                {Array.from(new Set(products.map(p => p.category))).map(catName => {
                  const categoryProducts = products.filter(p => p.category === catName);
                  if (categoryProducts.length === 0) return null;
                  
                  return (
                    <section key={catName}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg text-gray-900">{catName}</h3>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x px-1 -mx-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {categoryProducts.map(p => renderProductCard(p, false))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
            
            
          </main>
        </div>
      )}
    </SiteShell>
  );
}
