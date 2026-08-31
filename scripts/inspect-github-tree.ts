async function fetchTree(shaOrBranch: string) {
  const url = `https://api.github.com/repos/Shamsear/TFC-Images/git/trees/${shaOrBranch}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TFC-Inspector' }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${shaOrBranch}`)
  return res.json()
}

async function main() {
  try {
    console.log('1. Fetching root tree...')
    const root = await fetchTree('main')
    const publicNode = root.tree.find((n: any) => n.path === 'public')
    if (!publicNode) {
      console.error('No public folder found.')
      return
    }
    console.log(`Found public folder, SHA: ${publicNode.sha}`)

    console.log('2. Fetching public folder tree...')
    const publicTree = await fetchTree(publicNode.sha)
    const photosNode = publicTree.tree.find((n: any) => n.path === 'player_photos')
    const cardsNode = publicTree.tree.find((n: any) => n.path === 'player_cards')

    if (photosNode) {
      console.log(`Found player_photos folder, SHA: ${photosNode.sha}`)
      console.log('Fetching player_photos tree...')
      const photosTree = await fetchTree(photosNode.sha)
      console.log(`Successfully fetched player_photos tree! Entries: ${photosTree.tree.length}`)
      const example = photosTree.tree.slice(0, 5).map((n: any) => n.path)
      console.log('Examples:', example)
      
      // Let's check if Gary Cahill is in there
      const hasCahill = photosTree.tree.some((n: any) => n.path.includes('88045487423105'))
      console.log(`Does it contain Cahill (88045487423105)? ${hasCahill}`)
    }

    if (cardsNode) {
      console.log(`Found player_cards folder, SHA: ${cardsNode.sha}`)
      console.log('Fetching player_cards tree...')
      const cardsTree = await fetchTree(cardsNode.sha)
      console.log(`Successfully fetched player_cards tree! Entries: ${cardsTree.tree.length}`)
    }

  } catch (err) {
    console.error('Traversal failed:', err)
  }
}

main()
