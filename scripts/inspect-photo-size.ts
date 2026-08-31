import { loadImage } from 'canvas'

async function main() {
  const url = 'https://raw.githubusercontent.com/Shamsear/TFC-Images/main/public/player_photos/100012.webp'
  console.log(`Downloading original player photo: ${url}...`)
  
  try {
    const img = await loadImage(url)
    console.log('Original Photo Dimensions:')
    console.log(`- Width: ${img.width}px`)
    console.log(`- Height: ${img.height}px`)
  } catch (err) {
    console.error('Failed to load image:', err)
  }
}

main()
