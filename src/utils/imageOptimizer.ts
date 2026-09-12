import { BusinessProject, CatalogItem, Professional } from '../types';

/**
 * Optimizes a File or base64 Data URL to a compressed JPEG data URL
 * target: max 400px dimension and ~0.65 quality (producing crisp ~15KB - 30KB images)
 */
export const compressImageToDataUrl = (
  source: string | File,
  maxDimension = 400,
  quality = 0.65
): Promise<string> => {
  return new Promise((resolve) => {
    // If it's already an external HTTP(S) URL or small string, no canvas needed
    if (typeof source === 'string' && !source.startsWith('data:image/')) {
      resolve(source);
      return;
    }

    const processDataUrl = (dataUrl: string) => {
      // If dataUrl is tiny (< 25KB), resolve directly
      if (dataUrl.length < 35000) {
        resolve(dataUrl);
        return;
      }

      if (typeof window === 'undefined' || !window.Image) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          // Fill white background in case of transparent PNG before converting to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (e) {
          console.warn('Image canvas compression warning:', e);
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    if (typeof source === 'string') {
      processDataUrl(source);
    } else if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          processDataUrl(result);
        } else {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(source);
    } else {
      resolve('');
    }
  });
};

/**
 * Scans a BusinessProject and optimizes all embedded base64 images and oversized payloads
 * before persisting to Cloud Firestore (ensuring document stays well under the 1MB Firestore limit).
 */
export const optimizeProjectForStorage = async (project: BusinessProject): Promise<BusinessProject> => {
  if (!project) return project;

  try {
    // 0. Optimize Company Logo
    let optimizedLogo = project.logoUrl || project.config?.logoUrl || '';
    if (optimizedLogo && optimizedLogo.startsWith('data:image/')) {
      optimizedLogo = await compressImageToDataUrl(optimizedLogo, 300, 0.75);
    }

    // 1. Optimize Catalog images
    let optimizedCatalog: CatalogItem[] = project.catalog || [];
    if (Array.isArray(project.catalog) && project.catalog.length > 0) {
      const catalogPromises = project.catalog.map(async (item) => {
        if (item.imageUrl && item.imageUrl.startsWith('data:image/')) {
          const optimizedImage = await compressImageToDataUrl(item.imageUrl, 400, 0.65);
          return {
            ...item,
            imageUrl: optimizedImage,
          };
        }
        return item;
      });
      optimizedCatalog = await Promise.all(catalogPromises);
    }

    // 2. Optimize Professionals avatars
    let optimizedProfessionals: Professional[] = project.professionals || [];
    if (Array.isArray(project.professionals) && project.professionals.length > 0) {
      const profPromises = project.professionals.map(async (prof) => {
        if (prof.avatarUrl && prof.avatarUrl.startsWith('data:image/')) {
          const optimizedAvatar = await compressImageToDataUrl(prof.avatarUrl, 250, 0.65);
          return {
            ...prof,
            avatarUrl: optimizedAvatar,
          };
        }
        return prof;
      });
      optimizedProfessionals = await Promise.all(profPromises);
    }

    // 3. Trim lead message histories if unbounded (keep last 20 messages per lead to conserve doc size)
    const optimizedLeads = (project.leads || []).map((lead) => {
      if (Array.isArray(lead.messages) && lead.messages.length > 20) {
        return {
          ...lead,
          messages: lead.messages.slice(-20),
        };
      }
      return lead;
    });

    return {
      ...project,
      logoUrl: optimizedLogo,
      config: project.config ? { ...project.config, logoUrl: optimizedLogo } : project.config,
      catalog: optimizedCatalog,
      professionals: optimizedProfessionals,
      leads: optimizedLeads,
    };
  } catch (err) {
    console.warn('Error during project optimization for storage:', err);
    return project;
  }
};
