type SanitizedClientImage = {
  file: File
  contentType: "image/jpeg" | "image/png" | "image/webp"
}

export async function sanitizeImageForUpload(file: File): Promise<SanitizedClientImage> {
  const imageUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(imageUrl)
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("Canvas is unavailable in this browser.")
    }

    context.drawImage(image, 0, 0)

    const contentType =
      file.type === "image/png" || file.type === "image/webp" ? (file.type as "image/png" | "image/webp") : "image/jpeg"

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result)
            return
          }
          reject(new Error("Failed to export sanitized image."))
        },
        contentType,
        contentType === "image/jpeg" || contentType === "image/webp" ? 0.9 : undefined
      )
    })

    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg"
    const safeBaseName = file.name.replace(/\.[^/.]+$/, "") || "upload"

    return {
      file: new File([blob], `${safeBaseName}.${extension}`, { type: contentType }),
      contentType,
    }
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not decode the selected image."))
    image.src = src
  })
}
