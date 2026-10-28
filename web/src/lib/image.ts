/** Downscale big photos in the browser before upload (keeps uploads under the 5 MB bucket limit). */
export async function prepareImage(file: File, maxSide = 1600): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) throw new Error('Unsupported image. Please use a JPG, PNG or WebP photo.')
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size <= 2_000_000 && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    bitmap.close()
    return file
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
  if (!blob) throw new Error('Could not process this image.')
  return new File([blob], 'photo.jpg', { type: 'image/jpeg' })
}
