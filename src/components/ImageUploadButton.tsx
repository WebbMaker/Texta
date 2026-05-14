import React, { useRef } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadButtonProps {
  onImageSelected: (base64: string) => void;
  className?: string;
  iconClassName?: string;
}

export function ImageUploadButton({ onImageSelected, className, iconClassName }: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Tylko pliki obrazów są dozwolone.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Oblicz nowe wymiary (max 800x800)
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // 60% quality jpeg
          
          if (dataUrl.length > 400000) {
             alert('Obraz jest zbyt duży nawet po kompresji. Wybierz mniejszy plik.');
             return;
          }

          onImageSelected(dataUrl);
        }
      };
      
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
    // Reset the input value so the same file could be selected again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <button 
        type="button" 
        onClick={() => fileInputRef.current?.click()}
        className={`text-gray-400 hover:text-white transition-colors ${className || ''}`}
        title="Opcje obrazu"
      >
        <ImageIcon className={`w-5 h-5 ${iconClassName || ''}`} />
      </button>
    </>
  );
}
