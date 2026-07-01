export async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(newFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export async function uploadToImgbb(file: File): Promise<string> {
  const compressedFile = await compressImage(file);
  const formData = new FormData();
  formData.append("image", compressedFile);
  
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
