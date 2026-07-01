export async function uploadToImgbb(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`, {
    method: "POST",
    body: formData,
  });
  
  if (!res.ok) {
    throw new Error("Failed to upload image");
  }
  
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error?.message || "Failed to upload image");
  }
  
  return data.data.url;
}
