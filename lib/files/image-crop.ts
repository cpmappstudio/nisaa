type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const LOSSY_IMAGE_QUALITY = 0.9;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });
}

function getFileExtension(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function getBlobQuality(mimeType: string) {
  return mimeType === "image/jpeg" || mimeType === "image/webp"
    ? LOSSY_IMAGE_QUALITY
    : undefined;
}

function hasTransparentPixels(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const imageData = context.getImageData(0, 0, width, height).data;

  for (let index = 3; index < imageData.length; index += 4) {
    if (imageData[index] < 255) {
      return true;
    }
  }

  return false;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
          return;
        }

        reject(new Error(`Failed to generate ${mimeType} image`));
      },
      mimeType,
      getBlobQuality(mimeType),
    );
  });
}

export async function createCroppedImageFile({
  src,
  crop,
  fileName,
  outputWidth,
  outputHeight,
}: {
  src: string;
  crop: PixelCrop;
  fileName: string;
  outputWidth: number;
  outputHeight: number;
}) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported");
  }

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const containsTransparency = hasTransparentPixels(
    context,
    outputWidth,
    outputHeight,
  );
  const preferredMimeType = "image/webp";
  const fallbackMimeType = containsTransparency ? "image/png" : "image/jpeg";

  let outputMimeType = preferredMimeType;
  let blob: Blob;

  try {
    blob = await canvasToBlob(canvas, preferredMimeType);
  } catch {
    outputMimeType = fallbackMimeType;
    blob = await canvasToBlob(canvas, fallbackMimeType);
  }

  const extension = getFileExtension(outputMimeType);
  const sanitizedBaseName = fileName.replace(/\.[^/.]+$/, "") || "image";

  return new File([blob], `${sanitizedBaseName}.${extension}`, {
    type: outputMimeType,
  });
}
