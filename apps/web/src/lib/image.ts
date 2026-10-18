/** Photos bigger than this are refused before decoding (phones can't hold huge bitmaps). */
const MAX_INPUT_BYTES = 25 * 1024 * 1024

export class ImageError extends Error {}

function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() =>
      decodeWithImg(file),
    )
  }
  return decodeWithImg(file)
}

function decodeWithImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageError('Šios nuotraukos atidaryti nepavyko. Pabandyk JPG ar PNG.'))
    }
    img.src = url
  })
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

/**
 * Centre-crops a photo to a square and scales it down, so avatars look right everywhere and
 * uploads stay small (tens of kilobytes). WebP where the browser can encode it, else JPEG.
 */
export async function squarePhoto(file: File, size = 512): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new ImageError('Pasirink nuotrauką.')
  if (file.size > MAX_INPUT_BYTES) throw new ImageError('Nuotrauka per didelė (daugiau nei 25 MB).')

  const image = await decode(file)
  const width = 'naturalWidth' in image ? image.naturalWidth : image.width
  const height = 'naturalHeight' in image ? image.naturalHeight : image.height
  const side = Math.min(width, height)
  if (side < 64) throw new ImageError('Nuotrauka per maža – rinkis bent 64 × 64 taškų.')

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.min(size, side)
  const context = canvas.getContext('2d')
  if (!context) throw new ImageError('Šioje naršyklėje nuotraukos apdoroti nepavyko.')
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    (width - side) / 2,
    (height - side) / 2,
    side,
    side,
    0,
    0,
    canvas.width,
    canvas.height,
  )
  if ('close' in image) image.close()

  const webp = await toBlob(canvas, 'image/webp', 0.85)
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await toBlob(canvas, 'image/jpeg', 0.88)
  if (!jpeg) throw new ImageError('Nuotraukos paruošti nepavyko.')
  return jpeg
}
