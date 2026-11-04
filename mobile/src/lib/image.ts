import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { File } from 'expo-file-system'

export type PreparedImage = { uri: string; body: ArrayBuffer; contentType: string }

/** Downscale to ≤1600px and re-encode as JPEG (same as web prepareImage; keeps uploads under the 5 MB bucket limit). */
export async function prepareImage(uri: string, width: number, height: number, maxSide = 1600): Promise<PreparedImage> {
  const ctx = ImageManipulator.manipulate(uri)
  const scale = Math.min(1, maxSide / Math.max(width || maxSide, height || maxSide))
  if (scale < 1) ctx.resize(width >= height ? { width: Math.round(width * scale) } : { height: Math.round(height * scale) })
  const ref = await ctx.renderAsync()
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 })
  const body = await new File(out.uri).arrayBuffer()
  return { uri: out.uri, body, contentType: 'image/jpeg' }
}
