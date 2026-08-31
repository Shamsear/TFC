async function main() {
  const fileUrl = 'https://api.github.com/repos/Shamsear/TFC-Images/contents/public/player_photos/88045487423105.webp'
  console.log(`Checking file existence on GitHub: ${fileUrl}`)
  
  const res = await fetch(fileUrl, {
    headers: {
      'User-Agent': 'TFC-Inspector'
    }
  })
  
  console.log(`Response Status: ${res.status}`)
  if (res.ok) {
    const data = await res.json()
    console.log('File info from GitHub:', {
      name: data.name,
      path: data.path,
      size: data.size,
      sha: data.sha
    })
  } else {
    const text = await res.text()
    console.log(`File does not exist or API error. Response: ${text}`)
  }
}

main().catch(console.error)
